'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SwapOption, User } from '@/lib/types';
import { formatSwedishDate, getShiftForDate, parseDate, SHIFT_INFO } from '@/lib/schedule';
import { findSwapOptions } from '@/lib/swapChecker';
import { getConfig, getUser } from '@/lib/storage';
import ShiftBadge from '@/components/ShiftBadge';
import SwapCard from '@/components/SwapCard';

function BytaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const datumParam = searchParams.get('datum');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) return;

    const config = getConfig();
    const cycleStart = parseDate(config.cycleStartDate);

    let targetDate: Date;
    if (datumParam) {
      targetDate = parseDate(datumParam);
    } else {
      targetDate = new Date();
    }
    setDate(targetDate);

    const myShift = getShiftForDate(targetDate, u.group, cycleStart);
    if (myShift === 'L') {
      setSwapOptions([]);
      setLoading(false);
      return;
    }

    const options = findSwapOptions(targetDate, u, config.users, cycleStart);
    setSwapOptions(options);
    setLoading(false);
  }, [datumParam]);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Du är inte inloggad.</p>
        <Link href="/login" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Logga in
        </Link>
      </div>
    );
  }

  const config = getConfig();
  const cycleStart = parseDate(config.cycleStartDate);
  const myShift = date ? getShiftForDate(date, user.group, cycleStart) : 'L';
  const validCount = swapOptions.filter((o) => o.valid).length;
  const invalidCount = swapOptions.filter((o) => !o.valid).length;

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(`/byta?datum=${e.target.value}`);
  }

  return (
    <div>
      {/* Rubrik */}
      <div className="flex items-center gap-2 mb-5">
        <Link href="/mitt-schema" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Tillbaka
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Byta pass</h1>
      <p className="text-sm text-gray-500 mb-5">
        {user.name} · Grupp {user.group}
      </p>

      {/* Datumväljare */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Välj datum</label>
        <input
          type="date"
          value={date ? date.toISOString().slice(0, 10) : ''}
          onChange={handleDateChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {date && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">{formatSwedishDate(date)}:</span>
            <ShiftBadge type={myShift} showDuration />
          </div>
        )}
      </div>

      {/* Om man är ledig */}
      {myShift === 'L' && date && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-500 text-sm">Du är ledig denna dag – inget pass att byta.</p>
        </div>
      )}

      {/* Bytesalternativ */}
      {myShift !== 'L' && !loading && (
        <>
          {/* Sammanfattning */}
          <div className="flex gap-3 mb-4">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-green-600 font-bold">{validCount}</span>
              <span className="text-xs text-green-700">möjliga byten</span>
            </div>
            {invalidCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-600 font-bold">{invalidCount}</span>
                <span className="text-xs text-red-700">ej tillåtna byten</span>
              </div>
            )}
          </div>

          {swapOptions.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500 text-sm">
                Inga kända användare i andra grupper arbetar denna dag,
                eller inga användare är registrerade.
              </p>
              <Link href="/installningar" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                Lägg till användare i Inställningar →
              </Link>
            </div>
          )}

          {swapOptions.length > 0 && (
            <div className="space-y-3">
              {/* Möjliga byten */}
              {validCount > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Möjliga byten
                  </h2>
                  {swapOptions
                    .filter((o) => o.valid)
                    .map((opt, i) => (
                      <SwapCard key={i} option={opt} />
                    ))}
                </>
              )}

              {/* Ej tillåtna */}
              {invalidCount > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-4">
                    Ej tillåtna byten (bryter 11h-regeln)
                  </h2>
                  {swapOptions
                    .filter((o) => !o.valid)
                    .map((opt, i) => (
                      <SwapCard key={i} option={opt} />
                    ))}
                </>
              )}
            </div>
          )}

          {/* Info om 11h-regeln */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">Om 11h-viloregeln</h3>
            <p className="text-xs text-blue-700">
              Enligt EU-direktivet ska det finnas minst 11 timmars sammanhängande vila
              mellan två arbetspass. Byten som bryter denna regel visas som ej tillåtna.
              Dygnskift (X) räknas som 08:00–08:00 nästa dag.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function BytaPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 text-sm text-center py-12">Laddar...</div>}>
      <BytaContent />
    </Suspense>
  );
}
