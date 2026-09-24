import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

export default async function HashesAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/hashes/admin');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'equipe'].includes(me?.role ?? '')) redirect('/aguardando');

  return (
    <div style={{ minHeight: '100vh', background: '#090e1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 24px', height: 52,
        background: '#0f1623', borderBottom: '1px solid #1e293b',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/hashes/admin" style={{ fontWeight: 800, fontSize: 15, color: '#60a5fa', letterSpacing: '-0.02em', textDecoration: 'none' }}>
          ⚡ Hashes
        </Link>
        <span style={{ color: '#1e293b', fontSize: 18 }}>|</span>
        <Link href="/hashes/crm" style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
          CRM
        </Link>
      </header>
      <main style={{ padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  );
}
