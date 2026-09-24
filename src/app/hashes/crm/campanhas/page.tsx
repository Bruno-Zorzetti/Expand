import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function CampanhasPage() {
  const supabase = await createClient();

  const { data: camps } = await supabase
    .from('crm_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  const campanhas = await Promise.all(
    (camps ?? []).map(async (c) => {
      const [total, sent, replied, failed] = await Promise.all([
        supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id),
        supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'sent'),
        supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).in('status', ['replied', 'read']),
        supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('status', 'failed'),
      ]);
      return { ...c, total: total.count ?? 0, sent: sent.count ?? 0, replied: replied.count ?? 0, failed: failed.count ?? 0 };
    }),
  );

  const STATUS_BADGE: Record<string, string> = {
    draft: 'crm-badge-gray', queued: 'crm-badge-blue', sending: 'crm-badge-green',
    paused: 'crm-badge-amber', done: 'crm-badge-gray',
  };
  const STATUS_LABEL: Record<string, string> = {
    draft: 'Rascunho', queued: 'Na fila', sending: 'Enviando', paused: 'Pausada', done: 'Concluída',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Campanhas</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/hashes/crm/campanhas/nova" className="crm-btn crm-btn-primary">+ Nova campanha</Link>
      </div>

      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Campanha</th><th>Status</th><th>Total</th><th>Enviados</th>
              <th>Responderam</th><th>Falhas</th><th>Resp. %</th><th></th>
            </tr>
          </thead>
          <tbody>
            {campanhas.map(c => {
              const taxa = c.sent > 0 ? Math.round((c.replied / c.sent) * 100) : 0;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className={`crm-badge ${STATUS_BADGE[c.status] ?? 'crm-badge-gray'}`}>{STATUS_LABEL[c.status] ?? c.status}</span></td>
                  <td>{c.total}</td>
                  <td style={{ color: '#60a5fa' }}>{c.sent}</td>
                  <td style={{ color: '#4ade80' }}>{c.replied}</td>
                  <td style={{ color: '#f87171' }}>{c.failed}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#1e293b', borderRadius: 4, height: 6, width: 60, overflow: 'hidden' }}>
                        <div style={{ background: '#22c55e', width: `${taxa}%`, height: '100%' }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{taxa}%</span>
                    </div>
                  </td>
                  <td>
                    <Link href={`/hashes/crm/campanhas/${c.id}`} style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}>Detalhes →</Link>
                  </td>
                </tr>
              );
            })}
            {!campanhas.length && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#475569', padding: 32 }}>Nenhuma campanha criada ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
