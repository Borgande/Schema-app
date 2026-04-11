'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getUser } from '@/lib/storage';
import { User } from '@/lib/types';

const PUBLIC_PATHS = ['/login'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setReady(true);

    if (!u && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login');
    }
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400 text-sm">Laddar...</div>
      </div>
    );
  }

  return (
    <>
      <Navigation user={user} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
