'use client';

import { useEffect, useState } from 'react';
import { GroupNumber, User } from '@/lib/types';
import {
  getConfig,
  setConfig,
  DEFAULT_CONFIG,
  getUser,
} from '@/lib/storage';
import {
  parseDate,
  formatDate,
  getShiftForDate,
} from '@/lib/schedule';
import ShiftBadge from '@/components/ShiftBadge';

const GROUP_COLORS: Record<GroupNumber, string> = {
  1: 'border-blue-400 bg-blue-50 text-blue-800',
  2: 'border-green-400 bg-green-50 text-green-800',
  3: 'border-purple-400 bg-purple-50 text-purple-800',
  4: 'border-orange-400 bg-orange-50 text-orange-800',
};

export default function InstallningarPage() {
  const [cycleStartDate, setCycleStartDate] = useState(DEFAULT_CONFIG.cycleStartDate);
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<GroupNumber>(1);
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const config = getConfig();
    setCycleStartDate(config.cycleStartDate);
    setUsers(config.users);
    setCurrentUser(getUser());
  }, []);

  function handleSaveCycleDate() {
    const config = getConfig();
    config.cycleStartDate = cycleStartDate;
    setConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAddUser() {
    if (!newName.trim()) return;
    const user: User = { name: newName.trim(), group: newGroup };
    const exists = users.some((u) => u.name.toLowerCase() === user.name.toLowerCase());
    if (exists) return;
    const updated = [...users, user];
    setUsers(updated);
    const config = getConfig();
    config.users = updated;
    setConfig(config);
    setNewName('');
  }

  function handleRemoveUser(name: string) {
    const updated = users.filter((u) => u.name !== name);
    setUsers(updated);
    const config = getConfig();
    config.users = updated;
    setConfig(config);
  }

  // Visa verifieringsdata: dag 1 och dag 8 för alla grupper
  const cycleStart = parseDate(cycleStartDate);
  const today = new Date();
  const groups: GroupNumber[] = [1, 2, 3, 4];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Inställningar</h1>

      {/* Cykelstartdatum */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Cykelstartdatum
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Ange det datum som är dag 1 i cykeln för Grupp 1. Schemat beräknas automatiskt
          för alla grupper utifrån detta datum.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={cycleStartDate}
            onChange={(e) => setCycleStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSaveCycleDate}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {saved ? '✓ Sparat' : 'Spara'}
          </button>
        </div>

        {/* Verifiering */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Verifiering – skift idag ({formatDate(today)}) per grupp:
          </p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const shift = getShiftForDate(today, g, cycleStart);
              return (
                <div key={g} className={`border rounded-lg px-3 py-1.5 text-xs ${GROUP_COLORS[g]}`}>
                  <span className="font-semibold">Grupp {g}:</span>{' '}
                  <ShiftBadge type={shift} size="sm" />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Kontrollera att dessa stämmer med ditt faktiska schema. Om inte, justera
            cykelstartdatumet.
          </p>
        </div>
      </section>

      {/* Användarhantering */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Användare (för bytesvisning)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Lägg till kollegor för att kunna se bytesmöjligheter med dem. Dessa sparas
          lokalt i din webbläsare.
        </p>

        {/* Lägg till ny */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Namn"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-40"
            onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
          />
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(Number(e.target.value) as GroupNumber)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            {([1, 2, 3, 4] as GroupNumber[]).map((g) => (
              <option key={g} value={g}>Grupp {g}</option>
            ))}
          </select>
          <button
            onClick={handleAddUser}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Lägg till
          </button>
        </div>

        {/* Användarlista */}
        {users.length === 0 ? (
          <p className="text-sm text-gray-400">Inga användare tillagda ännu.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.name}
                className={`flex items-center justify-between border rounded-lg px-3 py-2 ${GROUP_COLORS[u.group]}`}
              >
                <span className="text-sm font-medium">
                  {u.name}
                  {currentUser?.name === u.name && (
                    <span className="ml-2 text-xs opacity-70">(du)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Grupp {u.group}</span>
                  {currentUser?.name !== u.name && (
                    <button
                      onClick={() => handleRemoveUser(u.name)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Ta bort
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
