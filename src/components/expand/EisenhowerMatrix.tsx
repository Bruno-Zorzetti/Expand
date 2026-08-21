"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Urgval = "urgente" | "alta" | "normal" | "baixa";

export type MatrixTask = {
  id: string;
  titulo: string;
  cliente: string | null;
  responsavel: string | null;
  dateStr: string | null;
  isPast: boolean;
  isMarco: boolean;
  statusColor: string;
  urgencia: Urgval;
  quickviewUrl: string;
};

const QUADS = [
  {
    key: "urgente" as Urgval,
    label: "Fazer Agora",
    sub: "Urgente + Importante",
    emoji: "🔴",
    col: "var(--red)",
    bg: "color-mix(in srgb,var(--red) 8%,transparent)",
    border: "var(--red)",
    help: "Crises, prazos vencendo, problemas que travam o time. Execute agora — cada hora que passa aumenta o custo.",
    action: "Executar imediatamente",
  },
  {
    key: "alta" as Urgval,
    label: "Agendar",
    sub: "Importante · Não urgente",
    emoji: "🟠",
    col: "var(--warn)",
    bg: "color-mix(in srgb,var(--warn) 8%,transparent)",
    border: "var(--warn)",
    help: "Planejamento estratégico, desenvolvimento, preparação. Reserve blocos de tempo dedicados. É aqui que mora o crescimento.",
    action: "Bloquear agenda",
  },
  {
    key: "normal" as Urgval,
    label: "Delegar",
    sub: "Urgente · Menos crítico",
    emoji: "🔵",
    col: "var(--accent)",
    bg: "color-mix(in srgb,var(--accent) 8%,transparent)",
    border: "var(--accent)",
    help: "Pedidos, interrupções, reuniões de rotina. Delegue para quem tem a capacidade. Proteja seu tempo de foco.",
    action: "Atribuir a alguém",
  },
  {
    key: "baixa" as Urgval,
    label: "Eliminar",
    sub: "Baixa prioridade",
    emoji: "⚪",
    col: "var(--dim)",
    bg: "var(--panel-2)",
    border: "var(--line-2)",
    help: "Distrações, backlog sem valor, 'seria legal ter'. Cancele ou remova antes que consuma energia da equipe.",
    action: "Cancelar ou adiar indefinidamente",
  },
] as const;

const LS_KEY = "expand_eisenhower_v1";

export default function EisenhowerMatrix({
  tasks,
  canEdit,
}: {
  tasks: MatrixTask[];
  canEdit: boolean;
}) {
  const [overrides, setOverrides] = useState<Record<string, Urgval>>({});
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState<Urgval | null>(null);
  const [pendingElim, setPendingElim] = useState<string | null>(null);
  const [openHelp, setOpenHelp]   = useState<Urgval | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setOverrides(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  function quad(t: MatrixTask): Urgval {
    return overrides[t.id] ?? t.urgencia;
  }

  function applyOverride(id: string, q: Urgval) {
    const next = { ...overrides, [id]: q };
    setOverrides(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }

  function clearOverride(id: string) {
    const next = { ...overrides };
    delete next[id];
    setOverrides(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }

  function handleDrop(target: Urgval) {
    if (!dragId) return;
    setDragOver(null);
    if (target === "baixa") {
      setPendingElim(dragId);
    } else {
      applyOverride(dragId, target);
    }
    setDragId(null);
  }

  const pendingTask = tasks.find(t => t.id === pendingElim);

  return (
    <div>
      {/* ── Header bar ── */}
      <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
          {canEdit
            ? "Arraste tarefas entre os quadrantes para reclassificar manualmente. A classificação padrão usa SLA, marcos e datas."
            : "Classificação por urgência derivada de datas, SLA e marcos."}
        </p>
        <button
          onClick={() => setShowGuide(g => !g)}
          style={{ fontSize: 11.5, color: "var(--accent)", background: "none", border: "1px solid var(--accent)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
        >
          {showGuide ? "Fechar guia" : "? Como usar a Matriz"}
        </button>
      </div>

      {/* ── Guide section ── */}
      {showGuide && (
        <div style={{ marginBottom: 16, background: "color-mix(in srgb,var(--accent) 6%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 40%,transparent)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--accent)", marginBottom: 10 }}>Matriz de Eisenhower</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--txt)", margin: "0 0 12px" }}>
            Criada pelo presidente Dwight Eisenhower e popularizada por Stephen Covey no livro <em>Os 7 Hábitos das Pessoas Altamente Eficazes</em>, a matriz divide tarefas em dois eixos: <strong>urgência</strong> (precisa ser feito agora?) e <strong>importância</strong> (gera resultado relevante?).
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {QUADS.map(q => (
              <div key={q.key} style={{ background: q.bg, border: `1px solid ${q.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: 12.5, color: q.col, marginBottom: 4 }}>{q.emoji} {q.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--mut)", lineHeight: 1.5, marginBottom: 6 }}>{q.help}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: q.col, textTransform: "uppercase", letterSpacing: ".05em" }}>→ {q.action}</div>
              </div>
            ))}
          </div>
          {canEdit && (
            <p style={{ fontSize: 11.5, color: "var(--dim)", margin: 0, lineHeight: 1.5 }}>
              <strong>Dica:</strong> Arraste um card para outro quadrante para reclassificá-lo. O ajuste fica salvo no navegador. Clique em ↩ no card para desfazer e voltar à classificação automática.
            </p>
          )}
        </div>
      )}

      {/* ── Confirm "Eliminar" dialog ── */}
      {pendingElim && pendingTask && (
        <div style={{ marginBottom: 16, background: "color-mix(in srgb,var(--red) 8%,transparent)", border: "1px solid var(--red)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "var(--red)", marginBottom: 4 }}>Mover para Eliminar?</div>
            <div style={{ fontSize: 12.5, color: "var(--txt)" }}>
              <strong>{pendingTask.titulo}</strong> será reclassificada como baixa prioridade. O registro não será apagado.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => { applyOverride(pendingElim, "baixa"); setPendingElim(null); }}
              style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Confirmar
            </button>
            <button
              onClick={() => setPendingElim(null)}
              style={{ background: "var(--panel-2)", color: "var(--txt)", border: "1px solid var(--line-2)", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── 2×2 Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {QUADS.map(q => {
          const items = tasks.filter(t => quad(t) === q.key);
          const isTarget = dragOver === q.key;
          return (
            <div
              key={q.key}
              onDragOver={canEdit ? (e) => { e.preventDefault(); setDragOver(q.key); } : undefined}
              onDragLeave={canEdit ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); } : undefined}
              onDrop={canEdit ? (e) => { e.preventDefault(); handleDrop(q.key); } : undefined}
              style={{
                borderRadius: 14,
                border: `2px solid ${isTarget ? q.col : q.border}`,
                background: isTarget ? q.bg : "var(--panel)",
                display: "flex", flexDirection: "column",
                minHeight: 200, overflow: "hidden",
                transition: "border-color .12s, background .12s",
              }}
            >
              {/* Quadrant header */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${isTarget ? q.col : q.border}`, background: q.bg, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{q.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: q.col }}>{q.label}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{q.sub}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `color-mix(in srgb,${q.col} 18%,transparent)`, color: q.col }}>
                  {items.length}
                </span>
                <button
                  onClick={() => setOpenHelp(openHelp === q.key ? null : q.key)}
                  title={`O que é "${q.label}"?`}
                  style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `1px solid ${q.col}`,
                    background: openHelp === q.key ? q.col : "transparent",
                    color: openHelp === q.key ? "#fff" : q.col,
                    cursor: "pointer", fontSize: 11, fontWeight: 800,
                    padding: 0, flexShrink: 0, lineHeight: 1, fontFamily: "inherit",
                  }}
                >?</button>
              </div>

              {/* Quadrant help */}
              {openHelp === q.key && (
                <div style={{ padding: "10px 14px", background: q.bg, borderBottom: `1px solid ${q.border}`, fontSize: 12, color: "var(--txt)", lineHeight: 1.6 }}>
                  {q.help}
                  <div style={{ marginTop: 5, fontSize: 11, fontWeight: 700, color: q.col }}>→ {q.action}</div>
                </div>
              )}

              {/* Drop indicator */}
              {isTarget && (
                <div style={{ padding: "7px 12px", background: `color-mix(in srgb,${q.col} 15%,transparent)`, borderBottom: `1px dashed ${q.col}`, fontSize: 11.5, color: q.col, fontWeight: 700, textAlign: "center" }}>
                  Soltar aqui ↓
                </div>
              )}

              {/* Task cards */}
              <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 380 }}>
                {items.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--dim)", margin: "auto", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
                    {isTarget ? "↓ Solte aqui" : "Nenhuma tarefa"}
                  </p>
                )}
                {items.slice(0, 20).map(t => (
                  <div
                    key={t.id}
                    draggable={canEdit}
                    onDragStart={canEdit ? (e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; } : undefined}
                    onDragEnd={canEdit ? () => { setDragId(null); setDragOver(null); } : undefined}
                    style={{
                      background: "var(--panel)",
                      borderRadius: 10,
                      padding: "9px 12px",
                      borderLeft: `3px solid ${t.statusColor}`,
                      cursor: canEdit ? "grab" : "default",
                      opacity: dragId === t.id ? 0.35 : 1,
                      transition: "opacity .12s",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={t.quickviewUrl} style={{ textDecoration: "none", color: "inherit" }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", lineHeight: 1.35, marginBottom: 4 }}>
                            {t.isMarco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
                            {t.titulo}
                          </div>
                        </Link>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                          {t.cliente && (
                            <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: "color-mix(in srgb,var(--accent) 13%,transparent)", color: "var(--accent)", fontWeight: 600 }}>
                              {t.cliente}
                            </span>
                          )}
                          {t.responsavel && <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{t.responsavel}</span>}
                          {t.dateStr && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: t.isPast ? "var(--red)" : "var(--dim)", marginLeft: "auto" }}>
                              {t.isPast ? "⚠ " : "📅 "}{t.dateStr}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Reset override button */}
                      {overrides[t.id] && canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clearOverride(t.id); }}
                          title="Desfazer reclassificação manual"
                          style={{ background: "none", border: "1px solid var(--line-2)", borderRadius: 5, color: "var(--dim)", fontSize: 11, cursor: "pointer", padding: "2px 6px", flexShrink: 0, fontFamily: "inherit" }}
                        >↩</button>
                      )}
                    </div>
                  </div>
                ))}
                {items.length > 20 && (
                  <p style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", padding: "4px 0", margin: 0 }}>
                    +{items.length - 20} tarefas neste quadrante
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
