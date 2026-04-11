'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { clearUser } from '@/lib/storage';

interface NavigationProps {
  user: User | null;
}

const GROUP_COLORS: Record<number, string> = {
  1: 'bg-blue-600',
  2: 'bg-green-600',
  3: 'bg-purple-600',
  4: 'bg-orange-600',
};

const NAV_LINKS = [
  { href: '/schema', label: 'Schema' },
  { href: '/mitt-schema', label: 'Mitt schema' },
  { href: '/byta', label: 'Byta pass' },
  { href: '/installningar', label: 'Inställningar' },
];

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearUser();
    router.push('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logotyp */}
          <Link href="/schema" className="text-lg font-bold text-gray-800">
            Skiftschema
          </Link>

          {/* Navigeringslänkar */}
          <div className="hidden sm:flex gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Användare */}
          {user ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                  GROUP_COLORS[user.group]
                }`}
              >
                {user.group}
              </span>
              <span className="text-sm text-gray-700 hidden sm:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-600 ml-1"
              >
                Logga ut
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Logga in
            </Link>
          )}
        </div>

        {/* Mobil-navigation */}
        <div className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap px-3 py-1 rounded text-xs font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
