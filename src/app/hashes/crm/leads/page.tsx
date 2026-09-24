import { createClient } from '@/lib/supabase/server';
import { leadTier, TIER_LABEL, TIER_COLOR } from '@/lib/crm';

type SearchParams = { score_min?: string; score_max?: string; ddd?: string; tag?: string; blocked?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('crm_leads')
    .select('*')
    .order('score', { ascending: false })
    .limit(200);

  if (sp.score_min) query = query.gte('score', Number(sp.score_min));
  if (sp.score_max) query = query.lte('score', Number(sp.score_max));
  if (sp.ddd) query = query.eq('ddd', sp.ddd);
  if (sp.blocked === 'true') query = query.eq('blocked', true);
  if (sp.tag) query = query.contains('tags', [sp.tag]);

  const { data: leads } = await query;

  // Contagens por tier
  const { count: hot }  = await supabase.from('crm_leads').select('id', { count: 'exact', head: true }).gte('score', 50).eq('blocked', false);
  const { count: warm } = await supabase.from('crm_leads').select('id', { count: 'exact', head: true }).gte('score', 10).lt('score', 50).eq('blocked', false);
  const { count: cold } = await supabase.from('crm_leads').select('id', { count: 'exact', head: true }).lt('score', 10).eq('blocked', false);
  const { count: blk }  = await supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('blocked', true);

  // DDDs disponíveis para filtro
  const { data: dddsRaw } = await supabase.from('crm_leads').select('ddd').not('ddd', 'is', null);
  const ddds = [...new Set(dddsRaw?.map(r => r.ddd).filter(Boolean) ?? [])].sort();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Leads</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Score acumulativo cross-campanha · Leads quentes recebem primeiro nas próximas campanhas</p>
      </div>

      {/* KPIs tier */}
      <div className="crm-grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Quentes (≥50)', value: hot ?? 0, color: '#ef4444', href: '?score_min=50' },
          { label: 'Mornos (10–49)', value: warm ?? 0, color: '#f59e0b', href: '?score_min=10&score_max=49' },
          { label: 'Frios (<10)', value: cold ?? 0, color: '#64748b', href: '?score_max=9' },
          { label: 'Bloqueados', value: blk ?? 0, color: '#334155', href: '?blocked=true' },
        ].map(k => (
          <a key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div className="crm-card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <a href="/hashes/crm/leads" className="crm-btn crm-btn-ghost" style={{ fontSize: 12, textDecoration: 'none' }}>Todos</a>
        <a href="?score_min=50" className="crm-btn crm-btn-ghost" style={{ fontSize: 12, textDecoration: 'none', color: '#ef4444' }}>🔴 Quentes</a>
        <a href="?score_min=10&score_max=49" className="crm-btn crm-btn-ghost" style={{ fontSize: 12, textDecoration: 'none', color: '#f59e0b' }}>🟡 Mornos</a>
        <a href="?score_max=9" className="crm-btn crm-btn-ghost" style={{ fontSize: 12, textDecoration: 'none', color: '#64748b' }}>⚪ Frios</a>
        {ddds.length > 0 && (
          <select style={{ background: '#0f1623', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', padding: '4px 10px', fontSize: 12 }}
            defaultValue={sp.ddd ?? ''}
            onChange={e => window ? (window.location.href = e.target.value ? `?ddd=${e.target.value}` : '/hashes/crm/leads') : null}>
            <option value="">Todos os DDDs</option>
            {ddds.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Lead</th><th>Telefone</th><th>DDD / Estado</th><th>Bairro</th>
              <th>Score</th><th>Tier</th><th>Campanhas</th><th>Respondeu</th><th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map(l => {
              const tier = leadTier(l.score, l.blocked);
              return (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{l.phone}</td>
                  <td style={{ color: '#64748b' }}>{l.ddd ? `${l.ddd} · ${l.state ?? '?'}` : '—'}</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>{l.bairro ?? '—'}</td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: 16, color: TIER_COLOR[tier] }}>{l.score}</span>
                  </td>
                  <td>
                    <span className={`crm-badge ${tier === 'hot' ? 'crm-badge-red' : tier === 'warm' ? 'crm-badge-amber' : tier === 'blocked' ? 'crm-badge-gray' : 'crm-badge-gray'}`}>
                      {TIER_LABEL[tier]}
                    </span>
                  </td>
                  <td style={{ color: '#64748b', textAlign: 'center' }}>{l.total_received}</td>
                  <td style={{ color: '#4ade80', textAlign: 'center', fontWeight: l.total_replied > 0 ? 700 : 400 }}>{l.total_replied}</td>
                  <td style={{ fontSize: 10, color: '#475569', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.tags?.join(', ')}
                  </td>
                </tr>
              );
            })}
            {!leads?.length && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: '#475569', padding: 32 }}>Nenhum lead encontrado com esse filtro</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
