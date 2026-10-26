'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoverOption, PaybackDay, SwapOption, SwapRecord, User } from '@/lib/types';
import { formatDate, formatSwedishDate, getShiftForDate, parseDate } from '@/lib/schedule';
import { findSwapOptions, findCoverOptions } from '@/lib/swapChecker';
import { addSwapRecord, getBlockedPeriods, getConfig, getSwapRecords, getUser } from '@/lib/storage';
import ShiftBadge from '@/components/ShiftBadge';
import SwapCard from '@/components/SwapCard';

type Mode = 'tacka' | 'byta';

/** Formaterar ett Date-objekt till YYYY-MM-DD i lokal tid (undviker UTC-förskjutning). */
function toLocalDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function BytaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [swapRecords, setSwapRecords] = useState<SwapRecord[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [mode, setMode] = useState<Mode>('tacka');
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

    const swapRecs = getSwapRecords();
    const dateStr = formatDate(targetDate);
    const existingSwap = swapRecs.find(s => s.date === dateStr && s.group === u.group);
    const myShift = existingSwap ? existingSwap.newShift : getShiftForDate(targetDate, u.group, cycleStart);
    if (myShift === 'L') {
      setSwapOptions([]);
      setCoverOptions([]);
      setSwapRecords(swapRecs);
      setLoading(false);
      return;
    }

    const blockedPeriods = getBlockedPeriods();
    setSwapOptions(findSwapOptions(targetDate, u, config.users, cycleStart, blockedPeriods));
    setCoverOptions(findCoverOptions(targetDate, u, config.users, cycleStart, 62, blockedPeriods));
    setSwapRecords(swapRecs);
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
  const dateStr = date ? formatDate(date) : '';
  const existingSwap = date ? swapRecords.find(s => s.date === dateStr && s.group === user.group) : null;
  const myShift = date ? (existingSwap ? existingSwap.newShift : getShiftForDate(date, user.group, cycleStart)) : 'L';

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLoading(true);
    router.push(`/byta?datum=${e.target.value}`);
  }

  const validSwaps = swapOptions.filter(o => o.valid).length;
  const viableCoverOptions = coverOptions.filter(o => o.canCover && o.paybackOptions.some(p => p.valid));

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
          value={date ? toLocalDateInput(date) : ''}
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
          {/* Flikar – Täcka först */}
          <div className="flex border-b border-gray-200 mb-5">
            <button
              onClick={() => setMode('tacka')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mode === 'tacka'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Täck upp
              {viableCoverOptions.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                  {viableCoverOptions.length}
                </span>
              )}
            </button>
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
          </div>

          {/* ── TÄCKA-FLIKEN ── */}
          {mode === 'tacka' && (
            <div>
              {viableCoverOptions.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-500 text-sm">
                    {coverOptions.length === 0
                      ? 'Inga registrerade kollegor – lägg till i Inställningar.'
                      : 'Ingen kan täcka detta pass just nu.'}
                  </p>
                  {coverOptions.length === 0 && (
                    <Link href="/installningar" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                      Gå till Inställningar →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {viableCoverOptions.map((opt, i) => (
                    <CoverCard
                      key={i}
                      option={opt}
                      coverDate={date!}
                      userGroup={user.group}
                      swapRecords={swapRecords}
                      onRegisterPayback={(pb) => {
                        addSwapRecord({
                          date: toLocalDateInput(date!),
                          group: user.group,
                          newShift: 'L',
                          partnerName: opt.coverPerson.name,
                        });
                        addSwapRecord({
                          date: toLocalDateInput(pb.date),
                          group: user.group,
                          newShift: pb.shiftType,
                          partnerName: opt.coverPerson.name,
                        });
                        setSwapRecords(getSwapRecords());
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BYTA-FLIKEN ── */}
          {mode === 'byta' && (
            <div>
              {swapOptions.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-500 text-sm">Inga registrerade kollegor – lägg till i Inställningar.</p>
                  <Link href="/installningar" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                    Gå till Inställningar →
                  </Link>
                </div>
              ) : validSwaps === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-gray-500 text-sm">Inga möjliga byten detta datum.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swapOptions.filter(o => o.valid).map((opt, i) => (
                    <SwapCard
                      key={i}
                      option={opt}
                      registered={swapRecords.some(
                        s => s.date === toLocalDateInput(opt.date) && s.group === user.group
                      )}
                      onRegister={() => {
                        // User gives away shift on opt.date (becomes L)
                        addSwapRecord({
                          date: toLocalDateInput(opt.date),
                          group: user.group,
                          newShift: 'L',
                          partnerName: opt.partnerName,
                        });
                        // For cross-day swap, user also takes partner shift on partnerDate
                        if (opt.dayOffset !== 0) {
                          addSwapRecord({
                            date: toLocalDateInput(opt.partnerDate),
                            group: user.group,
                            newShift: opt.partnerShift,
                            partnerName: opt.partnerName,
                          });
                        }
                        setSwapRecords(getSwapRecords());
                      }}
                    />
                  ))}
                </div>
              )}
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

interface CoverCardProps {
  option: CoverOption;
  coverDate: Date;
  userGroup: number;
  swapRecords: SwapRecord[];
  onRegisterPayback: (pb: PaybackDay) => void;
}

function CoverCard({ option, coverDate, userGroup, swapRecords, onRegisterPayback }: CoverCardProps) {
  const [expanded, setExpanded] = useState(false);
  const validPaybacks = option.paybackOptions.filter(p => p.valid);

  const coverRegistered = swapRecords.some(
    s => s.date === toLocalDateInput(coverDate) && s.group === userGroup && s.partnerName === option.coverPerson.name
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{option.coverPerson.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_BADGE[option.coverPerson.group]}`}>
            Grupp {option.coverPerson.group}
          </span>
          {option.isDN && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-medium">
              D+N
            </span>
          )}
          {coverRegistered && (
            <span className="text-xs text-green-700 font-medium">Registrerad ✓</span>
          )}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-blue-600 hover:underline ml-2 whitespace-nowrap shrink-0"
        >
          {validPaybacks.length} återpass {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <div className="space-y-1.5">
            {validPaybacks.map((pb, i) => {
              const pbRegistered = swapRecords.some(
                s => s.date === toLocalDateInput(pb.date) && s.group === userGroup
              );
              return (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{formatSwedishDate(pb.date)}</span>
                  <div className="flex items-center gap-2">
                    {pb.isDN && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">
                        D+N
                      </span>
                    )}
                    <ShiftBadge type={pb.shiftType} size="sm" />
                    {pbRegistered ? (
                      <span className="text-xs text-green-700 font-medium">✓</span>
                    ) : (
                      <button
                        onClick={() => onRegisterPayback(pb)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        Registrera
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
