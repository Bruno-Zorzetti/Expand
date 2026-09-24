'use client';
import { useState, useEffect, useCallback } from 'react';

type Pool = { id: string; name: string; body: string; category: string | null; use_ai_rewrite: boolean; ativo: boolean };

const CATEGORIAS = ['prospecção', 'follow-up', 'oferta', 'onboarding', 'reativação', 'outro'];
const VARIAVEIS = ['{{nome}}', '{{empresa}}', '{{bairro}}', '{{ddd}}'];

export default function MensagensPage() {
  const [pool, setPool] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Pool | null>(null);
  const [novoForm, setNovoForm] = useState(false);
  const [form, setForm] = useState({ name: '', body: '', category: 'prospecção', use_ai_rewrite: true });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [filtro, setFiltro] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/crm/mensagens');
    if (res.ok) { const d = await res.json(); setPool(d.pool ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const body = editando?.body ?? form.body;
    setPreview(
      body
        .replace(/\{\{nome\}\}/gi, 'João Silva')
        .replace(/\{\{empresa\}\}/gi, 'Empresa Teste')
        .replace(/\{\{bairro\}\}/gi, 'Centro')
        .replace(/\{\{ddd\}\}/gi, '11')
    );
  }, [form.body, editando?.body]);

  const salvar = async () => {
    setSaving(true);
    const payload = editando ? { ...editando } : { ...form };
    const method = editando ? 'PATCH' : 'POST';
    const url = editando ? `/api/crm/mensagens/${editando.id}` : '/api/crm/mensagens';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    setEditando(null);
    setNovoForm(false);
    setForm({ name: '', body: '', category: 'prospecção', use_ai_rewrite: true });
    load();
  };

  const toggleAtivo = async (item: Pool) => {
    await fetch(`/api/crm/mensagens/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    load();
  };

  const filtrado = pool.filter(p => filtro ? p.category === filtro : true);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Pool de Mensagens</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Templates base — a IA reescreve cada um de forma única antes de enviar</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={() => setNovoForm(true)}>+ Novo template</button>
      </div>

      {/* Filtro por categoria */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`crm-btn ${!filtro ? 'crm-btn-primary' : 'crm-btn-ghost'}`} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setFiltro('')}>Todos</button>
        {CATEGORIAS.map(c => (
          <button key={c} className={`crm-btn ${filtro === c ? 'crm-btn-primary' : 'crm-btn-ghost'}`} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setFiltro(c)}>{c}</button>
        ))}
      </div>

      {/* Formulário novo / edição */}
      {(novoForm || editando) && (
        <div className="crm-card" style={{ marginBottom: 24, borderColor: '#2563eb' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{editando ? 'Editar template' : 'Novo template'}</h3>
          <div className="crm-grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="crm-label">Nome</label>
                  <input className="crm-input" value={editando?.name ?? form.name}
                    onChange={e => editando ? setEditando({ ...editando, name: e.target.value }) : setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="crm-label">Categoria</label>
                  <select className="crm-input" style={{ width: 'auto' }} value={editando?.category ?? form.category}
                    onChange={e => editando ? setEditando({ ...editando, category: e.target.value }) : setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label className="crm-label">Corpo da mensagem</label>
              <textarea className="crm-input" rows={8} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                value={editando?.body ?? form.body}
                onChange={e => editando ? setEditando({ ...editando, body: e.target.value }) : setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Olá, {{nome}}! Temos uma oferta especial para você..." />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {VARIAVEIS.map(v => (
                  <button key={v} className="crm-btn crm-btn-ghost" style={{ padding: '2px 8px', fontSize: 11, fontFamily: 'monospace' }}
                    onClick={() => {
                      const val = editando ? editando.body + v : form.body + v;
                      editando ? setEditando({ ...editando, body: val }) : setForm(f => ({ ...f, body: val }));
                    }}>{v}</button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editando?.use_ai_rewrite ?? form.use_ai_rewrite}
                  onChange={e => editando ? setEditando({ ...editando, use_ai_rewrite: e.target.checked }) : setForm(f => ({ ...f, use_ai_rewrite: e.target.checked }))} />
                <span>IA reescreve antes de cada envio <span style={{ color: '#64748b', fontSize: 11 }}>(recomendado)</span></span>
              </label>
            </div>
            <div>
              <label className="crm-label">Preview (dados fictícios)</label>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 16, minHeight: 180, fontSize: 13, color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {preview || <span style={{ color: '#475569' }}>Digite a mensagem para ver o preview...</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="crm-btn crm-btn-primary" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button className="crm-btn crm-btn-ghost" onClick={() => { setEditando(null); setNovoForm(false); }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#64748b' }}>Carregando...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtrado.map(item => (
          <div key={item.id} className="crm-card" style={{ opacity: item.ativo ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {item.category && <span className="crm-badge crm-badge-blue" style={{ fontSize: 10 }}>{item.category}</span>}
              {item.use_ai_rewrite && <span className="crm-badge crm-badge-purple" style={{ fontSize: 10 }}>✨ IA</span>}
              {!item.ativo && <span className="crm-badge crm-badge-gray" style={{ fontSize: 10 }}>Inativo</span>}
            </div>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{item.name}</p>
            <p style={{ color: '#64748b', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 16, maxHeight: 80, overflow: 'hidden' }}>
              {item.body}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="crm-btn crm-btn-ghost" style={{ flex: 1, padding: '6px', fontSize: 12 }} onClick={() => setEditando(item)}>Editar</button>
              <button className="crm-btn crm-btn-ghost" style={{ fontSize: 12 }} onClick={() => toggleAtivo(item)}>
                {item.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
