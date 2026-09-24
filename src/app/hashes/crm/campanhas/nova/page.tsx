'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Instance = { id: string; name: string; status: string; phone: string | null };
type Pool = { id: string; name: string; body: string; category: string | null };
type Recipient = { name: string; phone: string; empresa: string; bairro: string };

const STEPS = ['Configuração', 'Mensagens', 'Destinatários', 'Revisão'];
const TONS = [
  { value: 'casual', label: 'Casual', desc: 'Natural e descontraído' },
  { value: 'profissional', label: 'Profissional', desc: 'Formal e cordial' },
  { value: 'urgente', label: 'Urgente', desc: 'Direto e impactante' },
];

export default function NovaCampanhaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [instancias, setInstancias] = useState<Instance[]>([]);
  const [pool, setPool] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [csvError, setCsvError] = useState('');

  const [form, setForm] = useState({
    name: '',
    instance_ids: [] as string[],
    delay_min_ms: 3000,
    delay_max_ms: 9000,
    daily_limit_per_instance: 150,
    use_ai_rewrite: true,
    ai_tone: 'casual',
    message_pool_ids: [] as string[],
  });

  const load = useCallback(async () => {
    const [iRes, pRes] = await Promise.all([fetch('/api/crm/instancias'), fetch('/api/crm/mensagens')]);
    const [iData, pData] = await Promise.all([iRes.json(), pRes.json()]);
    setInstancias(iData.instancias ?? []);
    setPool(pData.pool ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const parseCsv = (text: string) => {
    setCsvError('');
    const lines = text.trim().split('\n').filter(Boolean);
    if (!lines.length) { setRecipients([]); return; }
    // Detectar separador
    const sep = lines[0].includes(';') ? ';' : ',';
    // Pular cabeçalho se tiver texto
    const startIdx = /^(nome|name|phone|telefone)/i.test(lines[0]) ? 1 : 0;
    const parsed: Recipient[] = [];
    for (const line of lines.slice(startIdx)) {
      const parts = line.split(sep).map(s => s.trim().replace(/^["']|["']$/g, ''));
      const phone = (parts[1] ?? parts[0] ?? '').replace(/\D/g, '');
      if (!phone || phone.length < 10) continue;
      parsed.push({
        name: parts[0] ?? '',
        phone,
        empresa: parts[2] ?? '',
        bairro: parts[3] ?? '',
      });
    }
    if (!parsed.length) setCsvError('Nenhum telefone válido encontrado. Formato esperado: nome,telefone,empresa,bairro');
    setRecipients(parsed);
  };

  const toggleInstanceId = (id: string) => {
    setForm(f => ({
      ...f,
      instance_ids: f.instance_ids.includes(id)
        ? f.instance_ids.filter(i => i !== id)
        : [...f.instance_ids, id],
    }));
  };
  const togglePoolId = (id: string) => {
    setForm(f => ({
      ...f,
      message_pool_ids: f.message_pool_ids.includes(id)
        ? f.message_pool_ids.filter(i => i !== id)
        : [...f.message_pool_ids, id],
    }));
  };

  const disparar = async () => {
    setSaving(true);
    // 1. Criar campanha
    const campRes = await fetch('/api/crm/campanhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const campData = await campRes.json();
    if (!campRes.ok) { setSaving(false); alert(campData.error); return; }
    const campId = campData.campanha.id;

    // 2. Disparar (enfileirar recipients)
    const disparoRes = await fetch(`/api/crm/campanhas/${campId}/disparar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients }),
    });
    const disparoData = await disparoRes.json();
    if (!disparoRes.ok) { setSaving(false); alert(disparoData.error); return; }

    setSaving(false);
    router.push(`/hashes/crm/campanhas/${campId}`);
  };

  const canNext = () => {
    if (step === 0) return form.name && form.instance_ids.length > 0;
    if (step === 1) return form.message_pool_ids.length > 0;
    if (step === 2) return recipients.length > 0;
    return true;
  };

  if (loading) return <div style={{ color: '#64748b', padding: 40 }}>Carregando...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nova Campanha</h1>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#22c55e' : i === step ? '#2563eb' : '#1e293b',
                color: i <= step ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 400, color: i === step ? '#e2e8f0' : '#64748b' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ height: 1, width: 24, background: '#1e293b', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Configuração */}
      {step === 0 && (
        <div className="crm-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Configuração básica</h2>
          <div style={{ marginBottom: 16 }}>
            <label className="crm-label">Nome da campanha</label>
            <input className="crm-input" placeholder="Ex: Prospecção Outubro 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="crm-label">Instâncias (números) a usar</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {instancias.filter(i => i.status === 'connected').map(i => (
                <button key={i.id} className={`crm-btn ${form.instance_ids.includes(i.id) ? 'crm-btn-primary' : 'crm-btn-ghost'}`}
                  style={{ fontSize: 12 }} onClick={() => toggleInstanceId(i.id)}>
                  {form.instance_ids.includes(i.id) ? '✓ ' : ''}{i.name} {i.phone ? `(${i.phone.slice(-4)})` : ''}
                </button>
              ))}
              {!instancias.filter(i => i.status === 'connected').length && (
                <p style={{ color: '#ef4444', fontSize: 13 }}>Nenhuma instância conectada. Vá em Instâncias e conecte um número primeiro.</p>
              )}
            </div>
          </div>
          <div className="crm-grid-3" style={{ gap: 12, marginBottom: 16 }}>
            <div>
              <label className="crm-label">Delay mínimo (ms)</label>
              <input className="crm-input" type="number" value={form.delay_min_ms} onChange={e => setForm(f => ({ ...f, delay_min_ms: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="crm-label">Delay máximo (ms)</label>
              <input className="crm-input" type="number" value={form.delay_max_ms} onChange={e => setForm(f => ({ ...f, delay_max_ms: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="crm-label">Limite diário / número</label>
              <input className="crm-input" type="number" value={form.daily_limit_per_instance} onChange={e => setForm(f => ({ ...f, daily_limit_per_instance: Number(e.target.value) }))} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#475569' }}>💡 Delay entre {form.delay_min_ms / 1000}s–{form.delay_max_ms / 1000}s = ~{Math.round(3600000 / ((form.delay_min_ms + form.delay_max_ms) / 2))} mensagens/hora por número</p>
        </div>
      )}

      {/* Step 1: Mensagens */}
      {step === 1 && (
        <div className="crm-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Selecionar mensagens</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.use_ai_rewrite} onChange={e => setForm(f => ({ ...f, use_ai_rewrite: e.target.checked }))} />
            <span>IA reescreve cada mensagem de forma única antes de enviar <span style={{ color: '#4ade80', fontSize: 11 }}>(recomendado — evita detecção de spam)</span></span>
          </label>
          {form.use_ai_rewrite && (
            <div style={{ marginBottom: 20 }}>
              <label className="crm-label">Tom da reescrita</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TONS.map(t => (
                  <button key={t.value} className={`crm-btn ${form.ai_tone === t.value ? 'crm-btn-primary' : 'crm-btn-ghost'}`}
                    style={{ flex: 1, flexDirection: 'column', fontSize: 13 }} onClick={() => setForm(f => ({ ...f, ai_tone: t.value }))}>
                    <div>{form.ai_tone === t.value ? '✓ ' : ''}{t.label}</div>
                    <div style={{ fontSize: 10, color: form.ai_tone === t.value ? 'rgba(255,255,255,0.7)' : '#475569' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="crm-label">Templates do pool ({form.message_pool_ids.length} selecionados — sorteia aleatório a cada envio)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {pool.map(p => (
              <button key={p.id} onClick={() => togglePoolId(p.id)} style={{
                background: form.message_pool_ids.includes(p.id) ? 'rgba(37,99,235,0.15)' : '#090e1a',
                border: `1px solid ${form.message_pool_ids.includes(p.id) ? '#2563eb' : '#1e293b'}`,
                borderRadius: 10, padding: 14, textAlign: 'left', cursor: 'pointer', color: '#e2e8f0',
              }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {p.category && <span className="crm-badge crm-badge-blue" style={{ fontSize: 10 }}>{p.category}</span>}
                  {form.message_pool_ids.includes(p.id) && <span className="crm-badge crm-badge-green" style={{ fontSize: 10 }}>✓ Selecionado</span>}
                </div>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.name}</p>
                <p style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', maxHeight: 40 }}>{p.body.slice(0, 100)}{p.body.length > 100 ? '...' : ''}</p>
              </button>
            ))}
            {!pool.length && (
              <p style={{ color: '#475569', fontSize: 13, gridColumn: '1/-1' }}>Nenhum template criado. Vá em Mensagens e crie alguns templates primeiro.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Destinatários */}
      {step === 2 && (
        <div className="crm-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Destinatários</h2>
          <label className="crm-label">Colar lista CSV (nome, telefone, empresa, bairro)</label>
          <textarea className="crm-input" rows={10} style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8, resize: 'vertical' }}
            placeholder={'nome,telefone,empresa,bairro\nJoão Silva,11999998888,Empresa X,Centro\nMaria Santos,21988887777,Empresa Y,Ipanema'}
            value={csvText}
            onChange={e => { setCsvText(e.target.value); parseCsv(e.target.value); }} />
          {csvError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>⚠ {csvError}</p>}
          {recipients.length > 0 && (
            <div style={{ background: '#090e1a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#4ade80', marginBottom: 8 }}>✓ {recipients.length} destinatários importados</p>
              <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                {recipients.slice(0, 8).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', padding: '3px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ width: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</span>
                    <span style={{ fontFamily: 'monospace' }}>{r.phone}</span>
                    {r.bairro && <span style={{ color: '#64748b' }}>{r.bairro}</span>}
                  </div>
                ))}
                {recipients.length > 8 && <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>+{recipients.length - 8} mais...</p>}
              </div>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#475569' }}>
            Os leads são ordenados por score (quentes primeiro). Leads marcados como bloqueados são ignorados automaticamente.
            Horário de envio calculado por DDD (8h–19h no fuso local de cada número).
          </p>
        </div>
      )}

      {/* Step 3: Revisão */}
      {step === 3 && (
        <div className="crm-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Revisão e disparo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#090e1a', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>CAMPANHA</p>
              <p style={{ fontWeight: 700 }}>{form.name}</p>
            </div>
            <div style={{ background: '#090e1a', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>NÚMEROS ({form.instance_ids.length})</p>
              <p style={{ fontWeight: 600, fontSize: 13 }}>{instancias.filter(i => form.instance_ids.includes(i.id)).map(i => i.name).join(', ')}</p>
            </div>
            <div style={{ background: '#090e1a', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>MENSAGENS ({form.message_pool_ids.length} templates)</p>
              <p style={{ fontWeight: 600, fontSize: 13 }}>{pool.filter(p => form.message_pool_ids.includes(p.id)).map(p => p.name).join(' · ')}</p>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>IA {form.use_ai_rewrite ? 'ativa' : 'desativada'} · Tom: {form.ai_tone}</p>
            </div>
            <div style={{ background: '#090e1a', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>DESTINATÁRIOS</p>
              <p style={{ fontWeight: 700, fontSize: 20, color: '#60a5fa' }}>{recipients.length}</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Delay {form.delay_min_ms / 1000}s–{form.delay_max_ms / 1000}s · Máx {form.daily_limit_per_instance}/dia/número</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>Envio apenas 8h–19h no fuso de cada DDD</p>
            </div>
          </div>
          <button className="crm-btn crm-btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15 }}
            onClick={disparar} disabled={saving}>
            {saving ? '⏳ Enfileirando...' : '🚀 Disparar Campanha'}
          </button>
          <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 8 }}>
            Os envios começam automaticamente pelo cron a cada 5 minutos
          </p>
        </div>
      )}

      {/* Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="crm-btn crm-btn-ghost" onClick={() => step === 0 ? router.push('/hashes/crm/campanhas') : setStep(s => s - 1)}>
          {step === 0 ? 'Cancelar' : '← Voltar'}
        </button>
        {step < 3 && (
          <button className="crm-btn crm-btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Próximo →
          </button>
        )}
      </div>
    </div>
  );
}
