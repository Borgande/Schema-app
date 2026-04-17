'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlockedDate, ScheduledDay, SwapRecord, User } from '@/lib/types';
import {
  getScheduleRange,
  formatSwedishDate,
  formatDate,
  getShiftForDate,
  isWeekend,
  parseDate,
  SHIFT_INFO,
} from '@/lib/schedule';
import {
  addBlockedDate,
  getBlockedDates,
  getConfig,
  getSwapRecords,
  getUser,
  removeBlockedDate,
} from '@/lib/storage';
import ShiftBadge from '@/components/ShiftBadge';

const MONTHS_SV = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function MittSchemaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [schedule, setSchedule] = useState<ScheduledDay[]>([]);
  const [nextShiftDay, setNextShiftDay] = useState<ScheduledDay | null>(null);
  const [swapRecords, setSwapRecords] = useState<SwapRecord[]>([]);
  const [myBlocks, setMyBlocks] = useState<BlockedDate[]>([]);
  const [blockInput, setBlockInput] = useState('');
  const [blockError, setBlockError] = useState('');
  const [today] = useState(() => new Date());
  const [monthOffset, setMonthOffset] = useState(0);

  const displayYear = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1).getFullYear();
  const displayMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1).getMonth();

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) return;

    const config = getConfig();
    const cycleStart = parseDate(config.cycleStartDate);

    // Månadsschema
    const firstDay = new Date(displayYear, displayMonth, 1);
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    setSchedule(getScheduleRange(firstDay, daysInMonth, cycleStart));

    // Nästa pass: sök 28 dagar framåt från idag (oavsett visad månad)
    const upcoming = getScheduleRange(today, 28, cycleStart);
    const next = upcoming.find(
      (d) => d.shifts[u.group] !== 'L' && (d.date > today || isSameDay(d.date, today))
    );
    setNextShiftDay(next ?? null);
    setSwapRecords(getSwapRecords());
    setMyBlocks(getBlockedDates().filter(b => b.userName === u.name));
  }, [today, displayYear, displayMonth]);

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

  function handleAddBlock() {
    if (!blockInput || !user) return;
    const blockDate = parseDate(blockInput);
    const shift = getShiftForDate(blockDate, user.group, cycleStart);
    if (shift !== 'L') {
      setBlockError('Du kan bara blockera lediga dagar (L).');
      return;
    }
    addBlockedDate({ userName: user.name, date: blockInput });
    setMyBlocks(getBlockedDates().filter(b => b.userName === user.name));
    setBlockInput('');
    setBlockError('');
  }

  const myDays = schedule.filter((d) => d.shifts[user.group] !== 'L');

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mitt schema</h1>
      <p className="text-sm text-gray-500 mb-5">
        {user.name} · Grupp {user.group}
      </p>

      {/* Nästa pass-kort – visas alltid baserat på dagens datum */}
      {nextShiftDay && monthOffset === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Nästa pass
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {formatSwedishDate(nextShiftDay.date)}
              </div>
              <div className="text-sm text-gray-500">
                {SHIFT_INFO[nextShiftDay.shifts[user.group]].duration}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <ShiftBadge type={nextShiftDay.shifts[user.group]} size="lg" />
              <Link
                href={`/byta?datum=${formatDate(nextShiftDay.date)}`}
                className="text-sm text-blue-600 hover:underline ml-2"
              >
                Byta →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Månadsnavigation */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          {MONTHS_SV[displayMonth]} {displayYear}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={() => setMonthOffset(0)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Idag
          </button>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Lista arbetspass för månaden */}
      <div className="space-y-2">
        {myDays.length === 0 && (
          <p className="text-gray-400 text-sm">Inga arbetspass denna månad.</p>
        )}
        {myDays.map((day, idx) => {
          const baseShift = day.shifts[user.group];
          const swapRec = swapRecords.find(s => s.date === formatDate(day.date) && s.group === user.group);
          const shift = swapRec ? swapRec.newShift : baseShift;
          const isToday = isSameDay(day.date, today);
          const weekend = isWeekend(day.date);

          return (
            <div
              key={idx}
              className={`flex items-center justify-between bg-white border rounded-lg px-4 py-3 ${
                isToday ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
              } ${weekend ? 'border-l-4 border-l-gray-300' : ''}`}
            >
              <div>
                <div className={`font-medium ${isToday ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                  {formatSwedishDate(day.date)}
                  {isToday && (
                    <span className="ml-2 text-xs text-yellow-600 font-normal">idag</span>
                  )}
                  {swapRec && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">bytt</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{SHIFT_INFO[shift].duration}</div>
              </div>
              <div className="flex items-center gap-3">
                <ShiftBadge type={shift} />
                <Link
                  href={`/byta?datum=${formatDate(day.date)}`}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  Byta pass
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Statistik för månaden */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {(['D', 'N', 'X'] as const).map((type) => {
          const count = schedule.filter((d) => d.shifts[user.group] === type).length;
          return (
            <div key={type} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <ShiftBadge type={type} size="sm" />
              <div className="text-2xl font-bold text-gray-800 mt-1">{count}</div>
              <div className="text-xs text-gray-400">pass</div>
            </div>
          );
        })}
      </div>

      {/* Blockerade lediga dagar */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Otillgängliga lediga dagar</h2>
        <p className="text-xs text-gray-500 mb-3">
          Markera lediga dagar du inte kan jobba. Kollegor ser dem inte som bytesalternativ.
        </p>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input
            type="date"
            value={blockInput}
            onChange={e => { setBlockInput(e.target.value); setBlockError(''); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleAddBlock}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Markera otillgänglig
          </button>
        </div>
        {blockError && (
          <p className="text-xs text-red-600 mb-2">{blockError}</p>
        )}
        {myBlocks.length === 0 ? (
          <p className="text-xs text-gray-400">Inga blockerade dagar registrerade.</p>
        ) : (
          <div className="space-y-1.5 mt-2">
            {myBlocks.map(b => (
              <div key={b.date} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700">{formatSwedishDate(parseDate(b.date))}</span>
                <button
                  onClick={() => {
                    removeBlockedDate(user.name, b.date);
                    setMyBlocks(getBlockedDates().filter(bl => bl.userName === user.name));
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
