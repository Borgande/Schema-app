'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GroupNumber, User } from '@/lib/types';
import { addUser, setUser } from '@/lib/storage';

const GROUP_COLORS: Record<GroupNumber, string> = {
  1: 'border-blue-400 bg-blue-50 text-blue-800',
  2: 'border-green-400 bg-green-50 text-green-800',
  3: 'border-purple-400 bg-purple-50 text-purple-800',
  4: 'border-orange-400 bg-orange-50 text-orange-800',
};

const GROUP_SELECTED: Record<GroupNumber, string> = {
  1: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
  2: 'border-green-500 bg-green-100 ring-2 ring-green-400',
  3: 'border-purple-500 bg-purple-100 ring-2 ring-purple-400',
  4: 'border-orange-500 bg-orange-100 ring-2 ring-orange-400',
};

export default function LoginPage() {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<GroupNumber | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ange ditt namn.');
      return;
    }
    if (!group) {
      setError('Välj din grupp.');
      return;
    }
    const user: User = { name: name.trim(), group };
    setUser(user);
    addUser(user);
    router.replace('/schema');
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Skiftschema</h1>
          <p className="text-gray-500 text-sm mt-1">Logga in för att se ditt schema</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Namnfält */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ditt namn
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Förnamn Efternamn"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Gruppval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Din grupp
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2, 3, 4] as GroupNumber[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setGroup(g); setError(''); }}
                  className={`border-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                    group === g
                      ? GROUP_SELECTED[g]
                      : GROUP_COLORS[g] + ' hover:opacity-80'
                  }`}
                >
                  Grupp {g}
                </button>
              ))}
            </div>
          </div>

          {/* Felmeddelande */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Logga in
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Ingen inloggning behövs – din info sparas lokalt i webbläsaren.
        </p>
      </div>
    </div>
  );
}
