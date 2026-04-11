'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GroupNumber, ScheduledDay, User } from '@/lib/types';
import { getScheduleRange, formatSwedishDate, isWeekend, parseDate } from '@/lib/schedule';
import { getConfig, getUser } from '@/lib/storage';
import ShiftBadge from '@/components/ShiftBadge';

const GROUP_HEADER: Record<GroupNumber, string> = {
  1: 'bg-blue-600 text-white',
  2: 'bg-green-600 text-white',
  3: 'bg-purple-600 text-white',
  4: 'bg-orange-600 text-white',
};

const GROUPS: GroupNumber[] = [1, 2, 3, 4];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function SchemaPage() {
  const [schedule, setSchedule] = useState<ScheduledDay[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [today] = useState(() => new Date());
  const [startOffset, setStartOffset] = useState(0);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const config = getConfig();
    const cycleStart = parseDate(config.cycleStartDate);
    // Visa från idag, 28 dagar
    const from = new Date(today);
    from.setDate(from.getDate() + startOffset * 28);
    setSchedule(getScheduleRange(from, 28, cycleStart));
  }, [today, startOffset]);

  if (!schedule.length) {
    return <div className="text-gray-400 text-sm text-center py-12">Laddar schema...</div>;
  }

  // Gruppa i veckor (7 dagar per rad)
  const weeks: ScheduledDay[][] = [];
  for (let i = 0; i < schedule.length; i += 7) {
    weeks.push(schedule.slice(i, i + 7));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Schema – alla grupper</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setStartOffset((o) => o - 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            ← Föregående
          </button>
          <button
            onClick={() => setStartOffset(0)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Idag
          </button>
          <button
            onClick={() => setStartOffset((o) => o + 1)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Nästa →
          </button>
        </div>
      </div>

      {/* Grupprubrik */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-gray-50 text-gray-600 font-medium border-b border-r w-28">
                Datum
              </th>
              {GROUPS.map((g) => (
                <th
                  key={g}
                  className={`px-3 py-2 text-center font-semibold border-b border-r last:border-r-0 ${
                    user?.group === g ? GROUP_HEADER[g] : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  Grupp {g}
                  {user?.group === g && <span className="ml-1 text-xs opacity-80">(du)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.map((day, idx) => {
              const isToday = isSameDay(day.date, today);
              const weekend = isWeekend(day.date);
              const rowClass = isToday
                ? 'bg-yellow-50'
                : weekend
                ? 'bg-gray-50'
                : '';

              return (
                <tr key={idx} className={`border-b last:border-b-0 ${rowClass}`}>
                  <td className="px-3 py-2 border-r text-gray-600 whitespace-nowrap">
                    <span className={isToday ? 'font-bold text-gray-900' : ''}>
                      {formatSwedishDate(day.date)}
                    </span>
                    {isToday && (
                      <span className="ml-1 text-xs text-yellow-600 font-medium">idag</span>
                    )}
                  </td>
                  {GROUPS.map((g) => {
                    const shift = day.shifts[g];
                    const isMe = user?.group === g;
                    return (
                      <td
                        key={g}
                        className={`px-2 py-2 text-center border-r last:border-r-0 ${
                          isMe ? 'bg-opacity-30' : ''
                        }`}
                      >
                        {shift !== 'L' ? (
                          <Link
                            href={`/byta?datum=${day.date.toISOString().slice(0, 10)}`}
                            className="hover:opacity-75 transition-opacity"
                          >
                            <ShiftBadge type={shift} size="sm" />
                          </Link>
                        ) : (
                          <ShiftBadge type={shift} size="sm" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Förklaring */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ShiftBadge type="D" size="sm" /> = Dagskift 08:00–17:30
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ShiftBadge type="N" size="sm" /> = Nattskift 17:30–08:00
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ShiftBadge type="X" size="sm" /> = Dygnskift 08:00–08:00
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <ShiftBadge type="L" size="sm" /> = Ledig
        </div>
      </div>
    </div>
  );
}
