"use client";

import { useState, useEffect } from "react";

const LS_KEY = "expand_relatorios_cfg_v1";

type GrupoTipo = "lideres" | "setor" | "cliente" | "bordo";

type Grupo = {
  id: string;
  nome: string;
  tipo: GrupoTipo;
  whatsappId: string;
  relatorios: {
    diario: boolean;
    semanal: boolean;
    conteudo: ("atrasadas" | "andamento" | "concluidas" | "resumo")[];
  };
};

const TIPO_LABEL: Record<GrupoTipo, string> = {
  lideres: "Líderes",
  setor: "Por setor",
  cliente: "Clientes",
  bordo: "Diário de bordo",
};

const TIPO_COR: Record<GrupoTipo, string> = {
  lideres: "var(--accent)",
  setor: "var(--green)",
  cliente: "#7B8FE8",
  bordo: "var(--warn)",
};

const CONTEUDO_LABEL = {
  atrasadas: "Tarefas atrasadas",
  andamento: "Em andamento",
  concluidas: "Concluídas hoje",
  resumo: "Resumo executivo",
};

const GRUPOS_PADRAO: Grupo[] = [
  {
    id: "lideres",
    nome: "Grupo dos Líderes",
    tipo: "lideres",
    whatsappId: "",
    relatorios: { diario: true, semanal: true, conteudo: ["atrasadas", "andamento", "concluidas", "resumo"] },
  },
  {
    id: "entrega",
    nome: "Setor de Entrega",
    tipo: "setor",
    whatsappId: "",
    relatorios: { diario: true, semanal: false, conteudo: ["atrasadas", "andamento", "concluidas"] },
  },
  {
    id: "comercial",
    nome: "Setor Comercial",
    tipo: "setor",
    whatsappId: "",
    relatorios: { diario: true, semanal: false, conteudo: ["andamento", "concluidas"] },
  },
  {
    id: "clientes_geral",
    nome: "Grupo Geral de Clientes",
    tipo: "cliente",
    whatsappId: "",
    relatorios: { diario: false, semanal: true, conteudo: ["resumo"] },
  },
  {
    id: "bordo",
    nome: "Diário de Bordo (equipe)",
    tipo: "bordo",
    whatsappId: "",
    relatorios: { diario: true, semanal: true, conteudo: ["atrasadas", "andamento", "concluidas"] },
  },
];

const HORARIO_PADRAO = "17:30";

export default function RelatoriosConfig() {
  const [grupos, setGrupos] = useState<Grupo[]>(GRUPOS_PADRAO);
  const [horario, setHorario] = useState(HORARIO_PADRAO);
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.grupos) setGrupos(c.grupos);
        if (c.horario) setHorario(c.horario);
      }
    } catch { /* noop */ }
  }, []);

  function salvar() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ grupos, horario, savedAt: new Date().toISOString() }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* noop */ }
  }

  function toggleConteudo(grupoId: string, item: keyof typeof CONTEUDO_LABEL) {
    setGrupos((prev) =>
      prev.map((g) => {
        if (g.id !== grupoId) return g;
        const has = g.relatorios.conteudo.includes(item);
        return {
          ...g,
          relatorios: {
            ...g.relatorios,
            conteudo: has ? g.relatorios.conteudo.filter((c) => c !== item) : [...g.relatorios.conteudo, item],
          },
        };
      })
    );
  }

  function updateGrupo(id: string, patch: Partial<Grupo>) {
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function addGrupo() {
    const novo: Grupo = {
      id: `grupo_${Date.now()}`,
      nome: "Novo grupo",
      tipo: "setor",
      whatsappId: "",
      relatorios: { diario: true, semanal: false, conteudo: ["andamento", "concluidas"] },
    };
    setGrupos((prev) => [...prev, novo]);
    setEditId(novo.id);
  }

  function removeGrupo(id: string) {
    setGrupos((prev) => prev.filter((g) => g.id !== id));
    if (editId === id) setEditId(null);
  }

  return (
    <>
      <p className="hx-eyebrow">Configurações · WhatsApp</p>
      <h1 className="ex-h1">
        Relatórios de <span className="hx-accent-text">Status</span>
      </h1>
      <p className="ex-sub">
        Configure quais grupos do WhatsApp recebem cada tipo de relatório e o que incluir. O envio automático acontece diariamente às 17:30 (requer integração uazapi ativa).
      </p>

      {/* Aviso de roadmap */}
      <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 18px", marginBottom: 24, borderLeft: "3px solid var(--warn)", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🚧</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)", marginBottom: 2 }}>Funcionalidade em roadmap</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
            O envio automático está previsto na Fase 8 da plataforma. Configure agora — quando a integração ficar pronta, os grupos já estarão mapeados. A configuração fica salva localmente até ser sincronizada com o banco.
          </div>
        </div>
      </div>

      {/* Horário global */}
      <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 10 }}>Horário de envio</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 6 }}>Relatório diário</div>
            <input
              type="time"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--txt)", fontSize: 14, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}
            />
          </div>
          <div style={{ color: "var(--dim)", fontSize: 13 }}>
            Relatório semanal: <strong style={{ color: "var(--txt)" }}>Sexta-feira às {horario}</strong>
          </div>
        </div>
      </div>

      {/* Lista de grupos */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>Grupos configurados</div>
        <button
          onClick={addGrupo}
          className="hx-btn"
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          + Adicionar grupo
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {grupos.map((g) => {
          const isEdit = editId === g.id;
          const cor = TIPO_COR[g.tipo];

          return (
            <div
              key={g.id}
              className="hx-glass"
              style={{
                borderRadius: 14, border: isEdit ? `1px solid ${cor}40` : "1px solid var(--line)",
                overflow: "hidden", transition: "border-color .2s",
              }}
            >
              {/* Header row */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
                onClick={() => setEditId(isEdit ? null : g.id)}
              >
                <div style={{ width: 10, height: 10, borderRadius: 99, background: cor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--txt)" }}>{g.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>
                    {TIPO_LABEL[g.tipo]} ·{" "}
                    {[g.relatorios.diario && "Diário", g.relatorios.semanal && "Semanal"].filter(Boolean).join(" + ") || "nenhum"} ·{" "}
                    {g.whatsappId ? `ID: ${g.whatsappId}` : "sem ID configurado"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {g.relatorios.diario && (
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `color-mix(in srgb,${cor} 12%,transparent)`, color: cor, fontWeight: 700 }}>Diário</span>
                  )}
                  {g.relatorios.semanal && (
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `color-mix(in srgb,var(--green) 12%,transparent)`, color: "var(--green)", fontWeight: 700 }}>Semanal</span>
                  )}
                  <span style={{ color: "var(--dim)", fontSize: 14, transition: "transform .15s", transform: isEdit ? "rotate(180deg)" : "none" }}>▾</span>
                </div>
              </div>

              {/* Edit panel */}
              {isEdit && (
                <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Nome do grupo</label>
                      <input
                        value={g.nome}
                        onChange={(e) => updateGrupo(g.id, { nome: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--txt)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Tipo</label>
                      <select
                        value={g.tipo}
                        onChange={(e) => updateGrupo(g.id, { tipo: e.target.value as GrupoTipo })}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--txt)", fontSize: 13, fontFamily: "inherit" }}
                      >
                        {(Object.keys(TIPO_LABEL) as GrupoTipo[]).map((t) => (
                          <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>ID do grupo no WhatsApp (uazapi)</label>
                      <input
                        value={g.whatsappId}
                        onChange={(e) => updateGrupo(g.id, { whatsappId: e.target.value })}
                        placeholder="Ex: 5511999999999-1234567890@g.us"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--txt)", fontSize: 13, fontFamily: "inherit", fontVariantNumeric: "tabular-nums", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Frequência de envio</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {(["diario", "semanal"] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => updateGrupo(g.id, { relatorios: { ...g.relatorios, [freq]: !g.relatorios[freq] } })}
                          style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${g.relatorios[freq] ? cor : "var(--line)"}`, background: g.relatorios[freq] ? `color-mix(in srgb,${cor} 15%,transparent)` : "transparent", color: g.relatorios[freq] ? cor : "var(--dim)", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {freq === "diario" ? `Diário (${horario})` : "Semanal (sex.)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Conteúdo do relatório</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(Object.keys(CONTEUDO_LABEL) as (keyof typeof CONTEUDO_LABEL)[]).map((item) => {
                        const on = g.relatorios.conteudo.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleConteudo(g.id, item)}
                            style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${on ? cor : "var(--line)"}`, background: on ? `color-mix(in srgb,${cor} 12%,transparent)` : "transparent", color: on ? cor : "var(--dim)", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {on ? "✓ " : ""}{CONTEUDO_LABEL[item]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                      onClick={() => { if (confirm(`Remover "${g.nome}"?`)) removeGrupo(g.id); }}
                      style={{ fontSize: 12, color: "var(--red)", background: "none", border: "1px solid color-mix(in srgb,var(--red) 30%,transparent)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Remover grupo
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      style={{ fontSize: 12, color: "var(--dim)", background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview da mensagem */}
      <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 10 }}>Prévia do relatório diário</div>
        <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "14px 16px", fontFamily: "monospace", fontSize: 12.5, color: "var(--txt)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
{`📊 *Status Report Expand — ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}*

*Atrasadas:* 3 tarefas
  • Cliente X — Entrega de banner (2d atraso)
  • Cliente Y — Revisão de copy (1d atraso)
  • Cliente Z — Reunião de resultado (1h atraso)

*Em andamento:* 7 tarefas
  • Ana · Criação de conteúdo (Cliente W)
  • Bruno · Diagnóstico GMB (Cliente V)
  ...

*Concluídas hoje:* 5 tarefas ✅

_Expandir detalhes: app.expand.com.br_`}
        </div>
        <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 8 }}>O conteúdo real será gerado dinamicamente a partir das etapas do banco.</p>
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={salvar}
          className="hx-btn"
          style={{ padding: "11px 24px", fontSize: 14 }}
        >
          {saved ? "✓ Salvo!" : "Salvar configuração"}
        </button>
        <span style={{ fontSize: 12, color: "var(--dim)" }}>
          Configuração local — será sincronizada com o banco na Fase 8
        </span>
      </div>
    </>
  );
}
