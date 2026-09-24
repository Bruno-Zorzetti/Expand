import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { leadTier, TIER_LABEL, TIER_COLOR } from '@/lib/crm';

export default async function CrmDashboard() {
  const supabase = await createClient();

  const [
    { data: camps },
    { count: totalLeads },
    { count: hotLeads },
    { data: topLeads },
    { data: instancias },
  ] = await Promise.all([
    supabase.from('crm_campaigns').select('id, name, status, started_at').in('status', ['queued', 'sending', 'paused']).limit(5),
    supabase.from('crm_leads').select('id', { count: 'exact', head: true }),
    supabase.from('crm_leads').select('id', { count: 'exact', head: true }).gte('score', 50).eq('blocked', false),
    supabase.from('crm_leads').select('phone, name, score, tags, ddd, state, blocked').order('score', { ascending: false }).limit(8),
    supabase.from('crm_instances').select('id, name, status, sent_today, daily_limit').order('created_at'),
  ]);

  // Contagens por status nos últimos 7 dias
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: sentCount } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).gte('sent_at', since7d);
  const { count: repliedCount } = await supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).gte('last_replied_at', since7d);

  const taxaResposta = sentCount && sentCount > 0 ? Math.round(((repliedCount ?? 0) / sentCount) * 100) : 0;

  const STATUS_LABEL: Record<string, string> = { queued: 'Na fila', sending: 'Enviando', paused: 'Pausada', done: 'Concluída', draft: 'Rascunho' };
  const STATUS_BADGE: Record<string, string> = { queued: 'crm-badge-blue', sending: 'crm-badge-green', paused: 'crm-badge-amber', done: 'crm-badge-gray', draft: 'crm-badge-gray' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Visão geral do CRM de disparos WhatsApp</p>
        </div>
        <Link href="/hashes/crm/campanhas/nova" className="crm-btn crm-btn-primary">+ Nova Campanha</Link>
      </div>

      {/* KPI Cards */}
      <div className="crm-grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Enviados (7d)',  value: sentCount ?? 0,    color: '#60a5fa' },
          { label: 'Responderam',   value: repliedCount ?? 0,  color: '#4ade80' },
          { label: 'Taxa resposta', value: `${taxaResposta}%`, color: '#f59e0b' },
          { label: 'Leads quentes', value: hotLeads ?? 0,      color: '#ef4444' },
        ].map((k) => (
          <div key={k.label} className="crm-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="crm-grid-2" style={{ gap: 20 }}>
        {/* Campanhas ativas */}
        <div className="crm-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Campanhas ativas</h2>
            <Link href="/hashes/crm/campanhas" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>Ver todas →</Link>
          </div>
          {!camps?.length && <p style={{ color: '#475569', fontSize: 13 }}>Nenhuma campanha ativa</p>}
          {camps?.map((c) => (
            <Link key={c.id} href={`/hashes/crm/campanhas/${c.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              <div style={{ background: '#090e1a', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`crm-badge ${STATUS_BADGE[c.status] ?? 'crm-badge-gray'}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>{c.name}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Instâncias */}
        <div className="crm-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Instâncias</h2>
            <Link href="/hashes/crm/instancias" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>Gerenciar →</Link>
          </div>
          {instancias?.map((inst) => (
            <div key={inst.id} style={{ background: '#090e1a', borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`crm-badge ${inst.status === 'connected' ? 'crm-badge-green' : inst.status === 'connecting' ? 'crm-badge-amber' : 'crm-badge-gray'}`}>
                {inst.status === 'connected' ? '● Online' : inst.status === 'connecting' ? '◌ Conectando' : '○ Offline'}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>{inst.name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{inst.sent_today}/{inst.daily_limit}</span>
            </div>
          ))}
          {!instancias?.length && <p style={{ color: '#475569', fontSize: 13 }}>Nenhuma instância configurada</p>}
        </div>
      </div>

      {/* Top Leads */}
      <div className="crm-card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Top Leads por Score</h2>
          <Link href="/hashes/crm/leads" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>Ver todos ({totalLeads ?? 0}) →</Link>
        </div>
        <table className="crm-table">
          <thead>
            <tr><th>Contato</th><th>DDD / Estado</th><th>Score</th><th>Tier</th><th>Tags</th></tr>
          </thead>
          <tbody>
            {topLeads?.map((l) => {
              const tier = leadTier(l.score, l.blocked);
              return (
                <tr key={l.phone}>
                  <td style={{ fontWeight: 500 }}>{l.name ?? l.phone}</td>
                  <td style={{ color: '#64748b' }}>{l.ddd ? `${l.ddd} · ${l.state ?? '?'}` : '—'}</td>
                  <td><span style={{ fontWeight: 700, color: TIER_COLOR[tier] }}>{l.score}</span></td>
                  <td><span className={`crm-badge ${tier === 'hot' ? 'crm-badge-red' : tier === 'warm' ? 'crm-badge-amber' : tier === 'blocked' ? 'crm-badge-gray' : 'crm-badge-gray'}`}>{TIER_LABEL[tier]}</span></td>
                  <td style={{ color: '#64748b', fontSize: 11 }}>{l.tags?.slice(0, 3).join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
