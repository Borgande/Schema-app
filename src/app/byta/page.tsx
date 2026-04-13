'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoverOption, SwapOption, User } from '@/lib/types';
import { formatSwedishDate, getShiftForDate, parseDate, SHIFT_INFO } from '@/lib/schedule';
import { findSwapOptions, findCoverOptions } from '@/lib/swapChecker';
import { getConfig, getUser } from '@/lib/storage';
import ShiftBadge from '@/components/ShiftBadge';
import SwapCard from '@/components/SwapCard';

type Mode = 'byta' | 'tacka';

function BytaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [mode, setMode] = useState<Mode>('byta');
  const [loading, setLoading] = useState(true);

  const datumParam = searchParams.get('datum');

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) return;

    const config = getConfig();
    const cycleStart = parseDate(config.cycleStartDate);
    const targetDate = datumParam ? parseDate(datumParam) : new Date();
    setDate(targetDate);

    const myShift = getShiftForDate(targetDate, u.group, cycleStart);
    if (myShift === 'L') {
      setSwapOptions([]);
      setCoverOptions([]);
      setLoading(false);
      return;
    }

    setSwapOptions(findSwapOptions(targetDate, u, config.users, cycleStart));
    setCoverOptions(findCoverOptions(targetDate, u, config.users, cycleStart));
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

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLoading(true);
    router.push(`/byta?datum=${e.target.value}`);
  }

  const validSwaps = swapOptions.filter(o => o.valid).length;
  const canCoverCount = coverOptions.filter(
    o => o.canCover && o.paybackOptions.some(p => p.valid)
  ).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Link href="/mitt-schema" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Tillbaka
        </Link>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">Byta / täcka pass</h1>
      <p className="text-sm text-gray-500 mb-5">{user.name} · Grupp {user.group}</p>

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
          <p className="text-gray-500 text-sm">Du är ledig denna dag – inget pass att byta eller täcka.</p>
        </div>
      )}

      {myShift !== 'L' && !loading && (
        <>
          {/* Flikar */}
          <div className="flex border-b border-gray-200 mb-5">
            <button
              onClick={() => setMode('byta')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mode === 'byta'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Byta pass
              {validSwaps > 0 && (
                <span className="ml-2 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                  {validSwaps}
                </span>
              )}
            </button>
            <button
              onClick={() => setMode('tacka')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mode === 'tacka'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Täcka + jobba tillbaka
              {canCoverCount > 0 && (
                <span className="ml-2 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                  {canCoverCount}
                </span>
              )}
            </button>
          </div>

          {/* ── BYTA-FLIKEN ── */}
          {mode === 'byta' && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-green-600 font-bold">{validSwaps}</span>
                  <span className="text-xs text-green-700">möjliga byten</span>
                </div>
                {swapOptions.filter(o => !o.valid).length > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-red-600 font-bold">{swapOptions.filter(o => !o.valid).length}</span>
                    <span className="text-xs text-red-700">ej tillåtna</span>
                  </div>
                )}
              </div>

              {swapOptions.length === 0 ? (
                <EmptyUsersMessage />
              ) : (
                <div className="space-y-3">
                  {validSwaps > 0 && (
                    <>
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Möjliga byten</h2>
                      {swapOptions.filter(o => o.valid).map((opt, i) => (
                        <SwapCard key={i} option={opt} />
                      ))}
                    </>
                  )}
                  {swapOptions.filter(o => !o.valid).length > 0 && (
                    <>
                      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">
                        Ej tillåtna (bryter 11h-regeln)
                      </h2>
                      {swapOptions.filter(o => !o.valid).map((opt, i) => (
                        <SwapCard key={i} option={opt} />
                      ))}
                    </>
                  )}
                </div>
              )}
              <RestRuleInfo />
            </div>
          )}

          {/* ── TÄCKA-FLIKEN ── */}
          {mode === 'tacka' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
                <strong>Så fungerar det:</strong> Du vill ha{' '}
                {date ? formatSwedishDate(date) : 'detta datum'} ledigt.
                Nedan visas vem som kan täcka ditt pass (de är lediga den dagen).
                Tryck på en person för att se vilka dagar du kan jobba tillbaka —
                dagar då du är ledig och de jobbar, minst 4 dagar från täckningsdagen.
              </div>

              {coverOptions.length === 0 ? (
                <EmptyUsersMessage />
              ) : (
                <div className="space-y-3">
                  {coverOptions.map((opt, i) => (
                    <CoverCard key={i} option={opt} />
                  ))}
                </div>
              )}
              <RestRuleInfo />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const GROUP_BADGE: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-purple-100 text-purple-800',
  4: 'bg-orange-100 text-orange-800',
};

function CoverCard({ option }: { option: CoverOption }) {
  const [expanded, setExpanded] = useState(false);
  const validPaybacks = option.paybackOptions.filter(p => p.valid);
  const invalidPaybacks = option.paybackOptions.filter(p => !p.valid);

  const borderClass = option.canCover && validPaybacks.length > 0
    ? 'border-green-200 bg-green-50'
    : option.canCover
    ? 'border-yellow-200 bg-yellow-50'
    : 'border-red-200 bg-red-50';

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-lg ${option.canCover ? 'text-green-500' : 'text-red-400'}`}>
            {option.canCover ? '✓' : '✗'}
          </span>
          <span className="font-semibold text-gray-900">{option.coverPerson.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_BADGE[option.coverPerson.group]}`}>
            Grupp {option.coverPerson.group}
          </span>
          {option.canCover ? (
            <span className="text-xs text-green-700 font-medium">Kan täcka</span>
          ) : (
            <span className="text-xs text-red-600">{option.coverReason}</span>
          )}
        </div>

        {option.canCover && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-blue-600 hover:underline ml-2 whitespace-nowrap shrink-0"
          >
            {validPaybacks.length} återpass {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {option.canCover && expanded && (
        <div className="border-t border-gray-200 bg-white p-4">
          {validPaybacks.length === 0 ? (
            <p className="text-xs text-gray-400">
              Inga giltiga återpassdagar de närmaste 8 veckorna.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Dagar du kan jobba tillbaka ({validPaybacks.length} st)
              </p>
              <div className="space-y-1.5">
                {validPaybacks.map((pb, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{formatSwedishDate(pb.date)}</span>
                    <ShiftBadge type={pb.shiftType} size="sm" />
                  </div>
                ))}
              </div>
              {invalidPaybacks.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  + {invalidPaybacks.length} dagar bryter 11h-regeln (visas ej)
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyUsersMessage() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
      <p className="text-gray-500 text-sm">Inga registrerade kollegor att jämföra med.</p>
      <Link href="/installningar" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
        Lägg till kollegor i Inställningar →
      </Link>
    </div>
  );
}

function RestRuleInfo() {
  return (
    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-1">Om 11h-viloregeln</h3>
      <p className="text-xs text-blue-700">
        Minst 11 timmars sammanhängande vila krävs mellan arbetspass.
        Återpass måste ligga minst 4 dagar från täckningsdagen för att inte ha
        &quot;anslutning&quot; till det ursprungliga datumet.
      </p>
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
