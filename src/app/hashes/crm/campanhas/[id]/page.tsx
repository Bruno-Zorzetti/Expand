'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';

type Progress = { status: string; total: number; sent: number; failed: number; replied: number; started_at: string | null; done_at: string | null };
type Recipient = { id: string; name: string | null; phone: string; type: string; ddd: string | null; status: string; tags: string[]; sent_at: string | null };

export default function CampanhaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [campName, setCampName] = useState('Campanha');
  const [pausing, setPausing] = useState(false);

  // Carregar nome e recipients
  useEffect(() => {
    fetch(`/api/crm/campanhas/${id}`)
      .then(r => r.json())
      .then(d => {
        setCampName(d.campanha?.name ?? 'Campanha');
        setRecipients(d.recipients ?? []);
      });
  }, [id]);

  // SSE para progresso
  useEffect(() => {
    const es = new EventSource(`/api/crm/campanhas/${id}/status`);
    es.onmessage = (e) => {
      try { setProgress(JSON.parse(e.data)); } catch { /* */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [id]);

  // Polling de recipients a cada 10s enquanto enviando
  useEffect(() => {
    if (!progress || progress.status === 'done') return;
    const t = setInterval(() => {
      fetch(`/api/crm/campanhas/${id}`)
        .then(r => r.json())
        .then(d => setRecipients(d.recipients ?? []));
    }, 10000);
    return () => clearInterval(t);
  }, [id, progress?.status]);

  const pausar = async () => {
    setPausing(true);
    await fetch(`/api/crm/campanhas/${id}/pausar`, { method: 'POST' });
    setPausing(false);
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: 'crm-badge-gray', sent: 'crm-badge-green', failed: 'crm-badge-red',
    replied: 'crm-badge-purple', read: 'crm-badge-blue',
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendente', sent: 'Enviado', failed: 'Falhou', replied: 'Respondeu', read: 'Leu',
  };

  const pct = progress && progress.total > 0
    ? Math.round(((progress.sent + progress.failed) / progress.total) * 100)
    : 0;

  const taxaResposta = progress && progress.sent > 0
    ? Math.round((progress.replied / progress.sent) * 100)
    : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/hashes/crm/campanhas" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>← Campanhas</Link>
        <span style={{ color: '#334155' }}>/</span>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{campName}</h1>
        {progress && (
          <span className={`crm-badge ${progress.status === 'sending' ? 'crm-badge-green' : progress.status === 'paused' ? 'crm-badge-amber' : progress.status === 'done' ? 'crm-badge-gray' : 'crm-badge-blue'}`}>
            {progress.status === 'sending' ? '● Enviando' : progress.status === 'queued' ? '◌ Na fila' : progress.status === 'paused' ? '⏸ Pausada' : progress.status === 'done' ? '✓ Concluída' : progress.status}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {progress && ['sending', 'queued'].includes(progress.status) && (
          <button className="crm-btn crm-btn-ghost" onClick={pausar} disabled={pausing}>{pausing ? '...' : '⏸ Pausar'}</button>
        )}
        {progress?.status === 'paused' && (
          <button className="crm-btn crm-btn-primary" onClick={pausar} disabled={pausing}>{pausing ? '...' : '▶ Retomar'}</button>
        )}
      </div>

      {/* KPIs */}
      {progress && (
        <>
          <div className="crm-grid-4" style={{ marginBottom: 16 }}>
            {[
              { label: 'Total', value: progress.total, color: '#94a3b8' },
              { label: 'Enviados', value: progress.sent, color: '#60a5fa' },
              { label: 'Responderam', value: progress.replied, color: '#4ade80' },
              { label: 'Falhas', value: progress.failed, color: '#f87171' },
            ].map(k => (
              <div key={k.label} className="crm-card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Barra de progresso */}
          <div className="crm-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Progresso</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{pct}% · Taxa resposta: {taxaResposta}%</span>
            </div>
            <div style={{ background: '#1e293b', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ background: '#3b82f6', width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%`, transition: 'width 0.5s' }} />
                <div style={{ background: '#ef4444', width: `${progress.total > 0 ? (progress.failed / progress.total) * 100 : 0}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b' }}>
              <span>🔵 Enviados</span><span>🔴 Falhas</span>
            </div>
          </div>
        </>
      )}

      {/* Tabela de recipients */}
      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Destinatários</h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>{recipients.length} total</span>
        </div>
        <table className="crm-table">
          <thead><tr><th>Nome</th><th>Telefone</th><th>DDD</th><th>Tipo</th><th>Status</th><th>Tags</th><th>Enviado em</th></tr></thead>
          <tbody>
            {recipients.slice(0, 100).map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.name ?? '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.phone}</td>
                <td style={{ color: '#64748b' }}>{r.ddd ?? '—'}</td>
                <td><span className="crm-badge crm-badge-gray" style={{ fontSize: 10 }}>{r.type}</span></td>
                <td><span className={`crm-badge ${STATUS_BADGE[r.status] ?? 'crm-badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                <td style={{ fontSize: 11, color: '#64748b' }}>{r.tags?.join(', ')}</td>
                <td style={{ fontSize: 11, color: '#64748b' }}>{r.sent_at ? new Date(r.sent_at).toLocaleTimeString('pt-BR') : '—'}</td>
              </tr>
            ))}
            {!recipients.length && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>Aguardando início...</td></tr>
            )}
          </tbody>
        </table>
        {recipients.length > 100 && (
          <p style={{ padding: '12px 20px', fontSize: 12, color: '#475569' }}>Mostrando 100 de {recipients.length}</p>
        )}
      </div>
    </div>
  );
}
