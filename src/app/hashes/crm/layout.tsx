import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/hashes/crm',            label: 'Dashboard'   },
  { href: '/hashes/crm/instancias', label: 'Instâncias'  },
  { href: '/hashes/crm/campanhas',  label: 'Campanhas'   },
  { href: '/hashes/crm/mensagens',  label: 'Mensagens'   },
  { href: '/hashes/crm/leads',      label: 'Leads'       },
];

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/hashes/crm');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['admin', 'equipe'].includes(me?.role ?? '')) redirect('/aguardando');

  return (
    <div style={{ minHeight: '100vh', background: '#090e1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Topbar */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 24,
        padding: '0 24px', height: 56,
        background: '#0f1623', borderBottom: '1px solid #1e293b',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/hashes/crm" style={{ fontWeight: 800, fontSize: 15, color: '#60a5fa', letterSpacing: '-0.02em', textDecoration: 'none' }}>
          ⚡ Hashes CRM
        </Link>
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 13,
              color: '#94a3b8', textDecoration: 'none',
              fontWeight: 500,
            }}
              className="crm-nav-link"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/hashes" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>
          ← Hashes
        </Link>
      </header>

      <main style={{ padding: '24px' }}>
        {children}
      </main>

      <style>{`
        .crm-nav-link:hover { color: #e2e8f0 !important; background: #1e293b; }
        .crm-card { background: #0f1623; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; }
        .crm-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .crm-badge-green  { background: #14532d; color: #4ade80; }
        .crm-badge-blue   { background: #1e3a5f; color: #60a5fa; }
        .crm-badge-amber  { background: #431407; color: #fb923c; }
        .crm-badge-red    { background: #450a0a; color: #f87171; }
        .crm-badge-gray   { background: #1e293b; color: #64748b; }
        .crm-badge-purple { background: #2e1065; color: #c084fc; }
        .crm-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: opacity 0.15s; }
        .crm-btn:hover { opacity: 0.85; }
        .crm-btn-primary { background: #2563eb; color: #fff; }
        .crm-btn-ghost   { background: #1e293b; color: #94a3b8; }
        .crm-btn-danger  { background: #7f1d1d; color: #fca5a5; }
        .crm-input { background: #0f1623; border: 1px solid #1e293b; border-radius: 8px; color: #e2e8f0; padding: 8px 12px; font-size: 13px; width: 100%; outline: none; }
        .crm-input:focus { border-color: #2563eb; }
        .crm-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 4px; display: block; }
        .crm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .crm-table th { background: #0a0f1a; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px; text-align: left; }
        .crm-table td { padding: 10px 12px; border-bottom: 1px solid #0f1623; color: #cbd5e1; }
        .crm-table tr:hover td { background: #0f1623; }
        .crm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .crm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .crm-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
        @media (max-width: 768px) { .crm-grid-2, .crm-grid-3, .crm-grid-4 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
