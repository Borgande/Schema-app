'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { getUser } from '@/lib/storage';
import { User } from '@/lib/types';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  // Rendera ingenting under SSR för att undvika hydration-mismatch med localStorage
  if (!mounted) return null;

  return (
    <>
      <Navigation user={user} />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
