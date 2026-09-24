'use client';
import { useState, useEffect, useCallback } from 'react';

type Instance = {
  id: string; name: string; subdomain: string; status: string;
  phone: string | null; sent_today: number; daily_limit: number;
};

export default function InstanciasPage() {
  const [instancias, setInstancias] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ id: string; name: string } | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [novaForm, setNovaForm] = useState(false);
  const [form, setForm] = useState({ name: '', subdomain: '', daily_limit: 200 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/crm/instancias');
    const data = await res.json();
    setInstancias(data.instancias ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Polling de status ao vivo a cada 15s
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  // Polling de QR quando modal está aberto
  useEffect(() => {
    if (!qrModal) return;
    let active = true;
    const poll = async () => {
      while (active && qrModal) {
        setQrLoading(true);
        const res = await fetch(`/api/crm/instancias/${qrModal.id}/qr`);
        const data = await res.json();
        setQrLoading(false);
        if (data.connected) { setQrModal(null); load(); return; }
        if (data.qr) setQrData(data.qr);
        await new Promise(r => setTimeout(r, 8000));
      }
    };
    poll();
    return () => { active = false; };
  }, [qrModal, load]);

  const criarInstancia = async () => {
    if (!form.name || !form.subdomain) return;
    setSaving(true);
    await fetch('/api/crm/instancias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setNovaForm(false);
    setForm({ name: '', subdomain: '', daily_limit: 200 });
    load();
  };

  const STATUS_BADGE: Record<string, string> = {
    connected: 'crm-badge-green', connecting: 'crm-badge-amber',
    disconnected: 'crm-badge-gray', hibernated: 'crm-badge-purple',
  };
  const STATUS_LABEL: Record<string, string> = {
    connected: '● Conectado', connecting: '◌ Conectando',
    disconnected: '○ Desconectado', hibernated: '◌ Hibernado',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Instâncias WhatsApp</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Gerencie os números conectados ao disparador</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={() => setNovaForm(true)}>+ Nova instância</button>
      </div>

      {/* Formulário nova instância */}
      {novaForm && (
        <div className="crm-card" style={{ marginBottom: 20, borderColor: '#2563eb' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Nova Instância</h3>
          <div className="crm-grid-3" style={{ gap: 12, marginBottom: 16 }}>
            <div>
              <label className="crm-label">Nome</label>
              <input className="crm-input" placeholder="Ex: Número Principal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="crm-label">Subdomínio uazapi</label>
              <input className="crm-input" placeholder="Ex: meuservidor" value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
            </div>
            <div>
              <label className="crm-label">Limite diário</label>
              <input className="crm-input" type="number" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="crm-btn crm-btn-primary" onClick={criarInstancia} disabled={saving}>{saving ? 'Criando...' : 'Criar'}</button>
            <button className="crm-btn crm-btn-ghost" onClick={() => setNovaForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#64748b' }}>Carregando...</p>}

      <div className="crm-grid-3">
        {instancias.map(inst => (
          <div key={inst.id} className="crm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className={`crm-badge ${STATUS_BADGE[inst.status] ?? 'crm-badge-gray'}`}>
                {STATUS_LABEL[inst.status] ?? inst.status}
              </span>
              {inst.status !== 'connected' && (
                <button className="crm-btn crm-btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => { setQrModal({ id: inst.id, name: inst.name }); setQrData(null); }}>
                  Conectar
                </button>
              )}
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{inst.name}</p>
            <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 12px' }}>{inst.phone ?? inst.subdomain + '.uazapi.com'}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: '#090e1a', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Enviados hoje</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa', margin: 0 }}>{inst.sent_today}</p>
              </div>
              <div style={{ flex: 1, background: '#090e1a', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Limite diário</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#94a3b8', margin: 0 }}>{inst.daily_limit}</p>
              </div>
            </div>
            {/* Barra de progresso diário */}
            <div style={{ marginTop: 10, background: '#1e293b', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ background: inst.sent_today >= inst.daily_limit ? '#ef4444' : '#3b82f6', width: `${Math.min(100, (inst.sent_today / inst.daily_limit) * 100)}%`, height: '100%', transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Modal QR Code */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="crm-card" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Conectar: {qrModal.name}</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Abra o WhatsApp Business → Dispositivos conectados → Conectar dispositivo</p>
            {qrLoading && !qrData && <p style={{ color: '#64748b' }}>Carregando QR...</p>}
            {qrData && (
              <img
                src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                alt="QR Code"
                style={{ width: 260, height: 260, borderRadius: 12, margin: '0 auto 16px', display: 'block', background: '#fff', padding: 8 }}
              />
            )}
            <p style={{ color: '#475569', fontSize: 11, marginBottom: 16 }}>O QR atualiza automaticamente. A janela fecha ao conectar.</p>
            <button className="crm-btn crm-btn-ghost" style={{ width: '100%' }} onClick={() => setQrModal(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
