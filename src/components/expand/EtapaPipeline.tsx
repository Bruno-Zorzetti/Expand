"use client";

import { useState, useId } from "react";

/* ══════════════════════════════════════════════════════════════════
   EtapaPipeline — Rota visual de uma tarefa

   Mostra cada "ponto" da rota com: departamento (cor), responsável,
   data/hora exata do evento. Ao final, calcula o custo por área
   e permite que o PMO gere o relatório para o Financeiro.
   ══════════════════════════════════════════════════════════════════ */

// ── Definições de área (mesmo mapa do expand-esteira) ─────────────
export const AREA_DEF: Record<string, { n: string; cor: string; taxa: number }> = {
  cm: { n: "Comercial",   cor: "#CE6A5F", taxa: 85  },
  pm: { n: "PM",          cor: "#C89B5E", taxa: 110 },
  cs: { n: "CS",          cor: "#E6D0A8", taxa: 80  },
  av: { n: "Audiovisual", cor: "#6FBF92", taxa: 130 },
  sm: { n: "Social",      cor: "#86C0A6", taxa: 95  },
  tf: { n: "Tráfego",     cor: "#CE7F4C", taxa: 120 },
  cl: { n: "Cliente",     cor: "#8A9990", taxa: 0   },
};

// Custo/h por agente de IA (tokens + infra estimados)
const AGENT_TAXA: Record<string, number> = {
  lara: 25, sofia: 20, alan: 20, nina: 20,
};

// Tipos de log que viram pontos na rota
const TIPOS_ROTA = new Set([
  "inicio", "transferencia", "conclusao", "bloqueio", "desbloqueio",
  "chamado", "aprovacao", "agendamento",
]);

// Cor de evento especial (sobrescreve cor da área)
const TIPO_COR: Record<string, string> = {
  bloqueio:    "#EF4444",
  desbloqueio: "#22C55E",
  chamado:     "#F59E0B",
  conclusao:   "#22C55E",
  aprovacao:   "#3B82F6",
};

// Label de evento
const TIPO_LABEL: Record<string, string> = {
  inicio:       "Início",
  transferencia:"Transferência",
  conclusao:    "Concluída",
  bloqueio:     "Bloqueio",
  desbloqueio:  "Desbloqueio",
  chamado:      "Chamado",
  aprovacao:    "Aprovação",
  agendamento:  "Agendamento",
};

// ── Tipos ─────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  tipo: string;
  autor: string | null;
  detalhe: string | null;
  criado_em: string;
}

export interface EtapaPipelineProps {
  etapaId: string;
  titulo: string;
  area: string | null;
  agente: string | null;
  responsavel: string | null;
  status: string;
  duracao_min: number | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  logs: LogEntry[];
  isAdmin?: boolean;
  onEnviarFinanceiro?: (payload: CustoPayload) => Promise<void>;
}

export interface CustoPayload {
  etapaId: string;
  area: string;
  agente: string | null;
  duracao_min: number;
  custo_area: number;
  custo_agente: number;
  custo_total: number;
  detalhes: string; // JSON legível
}

// ── Helpers ───────────────────────────────────────────────────────

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDur(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m ? ` ${m}min` : ""}`;
}

function brl(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Construção da rota ────────────────────────────────────────────

interface RoutePoint {
  id: string;
  tipo: string;
  label: string;
  autor: string | null;
  detalhe: string | null;
  ts: string;
  area: string | null;
  cor: string;
}

function buildRoute(props: EtapaPipelineProps): RoutePoint[] {
  const { area, logs, iniciada_em, concluida_em, responsavel } = props;
  const areaDef = area ? AREA_DEF[area] : null;
  const corBase = areaDef?.cor ?? "#475569";

  const points: RoutePoint[] = [];

  // Ponto 0: início da tarefa
  if (iniciada_em) {
    points.push({
      id: "start",
      tipo: "inicio",
      label: TIPO_LABEL.inicio,
      autor: responsavel,
      detalhe: areaDef ? `${areaDef.n}` : null,
      ts: iniciada_em,
      area,
      cor: corBase,
    });
  }

  // Pontos intermediários: log relevantes
  const relevantes = logs
    .filter(l => TIPOS_ROTA.has(l.tipo) && l.tipo !== "inicio" && l.tipo !== "conclusao")
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  for (const l of relevantes) {
    points.push({
      id: l.id,
      tipo: l.tipo,
      label: TIPO_LABEL[l.tipo] ?? l.tipo,
      autor: l.autor,
      detalhe: l.detalhe,
      ts: l.criado_em,
      area,
      cor: TIPO_COR[l.tipo] ?? corBase,
    });
  }

  // Ponto final: conclusão
  if (concluida_em) {
    points.push({
      id: "end",
      tipo: "conclusao",
      label: TIPO_LABEL.conclusao,
      autor: responsavel,
      detalhe: null,
      ts: concluida_em,
      area,
      cor: TIPO_COR.conclusao,
    });
  }

  // Se não há nenhum ponto mas existe área, mostra pelo menos o estado atual
  if (points.length === 0 && area) {
    points.push({
      id: "pending",
      tipo: "pendente",
      label: "Aguardando",
      autor: responsavel,
      detalhe: areaDef?.n ?? null,
      ts: new Date().toISOString(),
      area,
      cor: corBase,
    });
  }

  return points;
}

// ── Componente ────────────────────────────────────────────────────

export default function EtapaPipeline(props: EtapaPipelineProps) {
  const {
    etapaId, area, agente, duracao_min, status,
    onEnviarFinanceiro,
  } = props;

  const uid    = useId().replace(/:/g, "");
  const route  = buildRoute(props);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const areaDef   = area ? AREA_DEF[area] : null;
  const corBase   = areaDef?.cor ?? "#475569";
  const dur       = duracao_min ?? 0;
  const taxa      = areaDef?.taxa ?? 0;
  const taxaAg    = agente ? (AGENT_TAXA[agente] ?? 0) : 0;
  const custoArea = Math.round((dur / 60) * taxa * 100) / 100;
  const custoAg   = Math.round((dur / 60) * taxaAg * 100) / 100;
  const custoTotal = Math.round((custoArea + custoAg) * 100) / 100;

  const isDone    = status === "done";
  const isRunning = status === "run";

  // ── SVG pipeline ─────────────────────────────────────────────
  const n    = route.length;
  const W    = 560;
  const H    = 110;
  const PAD  = 40;
  const step = n > 1 ? (W - PAD * 2) / (n - 1) : 0;

  function nodeX(i: number) { return PAD + i * step; }
  const nodeY = 50;

  // Path for animated dot (complete route)
  const routeD = n > 1
    ? route.map((_, i) => `${i === 0 ? "M" : "L"}${nodeX(i).toFixed(1)},${nodeY}`).join(" ")
    : `M${PAD},${nodeY} L${W - PAD},${nodeY}`;

  async function handleEnviar() {
    if (!onEnviarFinanceiro || sending || sent) return;
    setSending(true);
    const payload: CustoPayload = {
      etapaId,
      area: area ?? "—",
      agente,
      duracao_min: dur,
      custo_area:  custoArea,
      custo_agente: custoAg,
      custo_total:  custoTotal,
      detalhes: JSON.stringify({
        area: areaDef?.n ?? area,
        taxa_hora: taxa,
        duracao_min: dur,
        custo_area: custoArea,
        agente,
        taxa_agente_hora: taxaAg,
        custo_agente: custoAg,
        total: custoTotal,
        gerado_em: new Date().toISOString(),
        rota: route.map(p => ({ tipo: p.tipo, autor: p.autor, ts: p.ts })),
      }),
    };
    try {
      await onEnviarFinanceiro(payload);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* ── SVG Timeline ─────────────────────────────────────── */}
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", minWidth: Math.max(320, n * 90), width: "100%", overflow: "visible" }}
          aria-label="Rota da tarefa"
        >
          <defs>
            {/* Filter por nó */}
            {route.map((p) => (
              <filter key={p.id} id={`${uid}-f-${p.id}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation={p.tipo === "conclusao" ? "3.5" : "2.5"} result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}

            {/* Gradiente da linha de progresso */}
            {n > 1 && (
              <linearGradient id={`${uid}-lg`} x1="0%" y1="0%" x2="100%" y2="0%">
                {route.map((p, i) => (
                  <stop key={p.id} offset={`${(i / (n - 1)) * 100}%`} stopColor={p.cor} stopOpacity="0.6" />
                ))}
              </linearGradient>
            )}

            {/* Path para animateMotion */}
            <path id={`${uid}-route`} d={routeD} />

            {/* Dot gradient */}
            <radialGradient id={`${uid}-dotg`} cx="40%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.95" />
              <stop offset="60%"  stopColor={corBase} stopOpacity="0.9" />
              <stop offset="100%" stopColor={corBase} stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {/* ── Segmentos da linha ── */}
          {n > 1 && route.slice(0, -1).map((p, i) => {
            const x1 = nodeX(i), x2 = nodeX(i + 1);
            const next = route[i + 1];
            // Glow
            return (
              <g key={`seg-${p.id}`}>
                <line x1={x1} y1={nodeY} x2={x2} y2={nodeY}
                  stroke={next.cor} strokeWidth="4" strokeOpacity="0.12" strokeLinecap="round" />
                <line x1={x1} y1={nodeY} x2={x2} y2={nodeY}
                  stroke={next.cor} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
              </g>
            );
          })}

          {/* ── Dot animado (só quando running) ── */}
          {isRunning && n > 1 && (
            <circle r="4.5" fill={`url(#${uid}-dotg)`}>
              <animateMotion dur="3s" begin="0s" repeatCount="indefinite" calcMode="linear">
                <mpath href={`#${uid}-route`} />
              </animateMotion>
            </circle>
          )}

          {/* ── Nós ── */}
          {route.map((p, i) => {
            const x = nodeX(i);
            const isHov = hovered === p.id;
            const r = p.tipo === "conclusao" || p.tipo === "inicio" ? 10 : 8;

            // Timestamp label (abaixo do nó)
            const tsLabel = fmtTs(p.ts);
            // Event label (acima)
            const evLabel = p.label;
            // Author
            const autLabel = p.autor ? p.autor.split(" ")[0] : "";

            return (
              <g key={p.id}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              >
                {/* Pulse ring */}
                {(isRunning && i === route.length - 1) && (
                  <circle cx={x} cy={nodeY} r={r + 6} fill="none" stroke={p.cor} strokeWidth="0.8">
                    <animate attributeName="r"              values={`${r+4};${r+9};${r+4}`}     dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.4;0.05;0.4"               dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Body */}
                <circle cx={x} cy={nodeY} r={r}
                  fill="var(--panel-2, #0c1629)"
                  stroke={p.cor}
                  strokeWidth={p.tipo === "conclusao" || p.tipo === "inicio" ? 2.5 : 1.8}
                  filter={`url(#${uid}-f-${p.id})`} />
                {/* Check for conclusao */}
                {p.tipo === "conclusao" && (
                  <text x={x} y={nodeY + 4} textAnchor="middle"
                    fill={p.cor} fontSize="9" fontFamily="ui-monospace,monospace">✓</text>
                )}
                {/* Dot for bloqueio */}
                {p.tipo === "bloqueio" && (
                  <text x={x} y={nodeY + 4} textAnchor="middle"
                    fill={p.cor} fontSize="9" fontFamily="ui-monospace,monospace">!</text>
                )}

                {/* Event label above */}
                <text x={x} y={nodeY - r - 12} textAnchor="middle"
                  fill={isHov ? p.cor : "var(--dim, #64748b)"}
                  fontSize="8" fontFamily="ui-monospace,monospace"
                  fontWeight={p.tipo === "inicio" || p.tipo === "conclusao" ? "700" : "500"}>
                  {evLabel}
                </text>
                {/* Author above event label */}
                {autLabel && (
                  <text x={x} y={nodeY - r - 22} textAnchor="middle"
                    fill={p.cor} fontSize="7.5" fontFamily="ui-monospace,monospace">
                    {autLabel}
                  </text>
                )}

                {/* Timestamp below */}
                <text x={x} y={nodeY + r + 14} textAnchor="middle"
                  fill="var(--mut, #475569)" fontSize="7.5" fontFamily="ui-monospace,monospace">
                  {tsLabel}
                </text>

                {/* Tooltip on hover: detalhe */}
                {isHov && p.detalhe && (
                  <g>
                    <rect x={x - 70} y={nodeY + r + 22} width={140} height={24}
                      fill="var(--panel-2, #0c1629)" stroke={p.cor} strokeWidth="0.8" rx="4" />
                    <text x={x} y={nodeY + r + 37} textAnchor="middle"
                      fill={p.cor} fontSize="7.5" fontFamily="ui-monospace,monospace">
                      {p.detalhe.length > 30 ? p.detalhe.slice(0, 30) + "…" : p.detalhe}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Custo ─────────────────────────────────────────────── */}
      {dur > 0 && (
        <div style={{
          marginTop: 16, borderTop: "1px solid var(--line, #1e3a5f)",
          paddingTop: 14, display: "grid",
          gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end",
        }}>
          {/* Breakdown */}
          <div>
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em",
              color: "var(--dim)", fontWeight: 700, marginBottom: 8,
            }}>
              Custo estimado da tarefa
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
              {/* Área */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: corBase, display: "inline-block" }} />
                <span style={{ fontSize: 11.5, color: "var(--txt)" }}>
                  {areaDef?.n ?? area} · {fmtDur(dur)} · R$ {taxa}/h
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: corBase }}>
                  {brl(custoArea)}
                </span>
              </div>
              {/* Agente */}
              {agente && taxaAg > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "var(--dim)" }}>⚡ Agente IA · R$ {taxaAg}/h</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dim)" }}>
                    {brl(custoAg)}
                  </span>
                </div>
              )}
            </div>
            <div style={{
              marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)",
              display: "flex", alignItems: "baseline", gap: 10,
            }}>
              <span style={{ fontSize: 11, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                Total
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)" }}>
                {brl(custoTotal)}
              </span>
              {!isDone && (
                <span style={{ fontSize: 10, color: "var(--dim)" }}>· tempo parcial</span>
              )}
            </div>
          </div>

          {/* Botão enviar ao Financeiro */}
          {onEnviarFinanceiro && (
            <div style={{ textAlign: "right" }}>
              {sent ? (
                <div style={{
                  fontSize: 11, color: "var(--green)",
                  padding: "8px 14px", border: "1px solid var(--green)",
                  borderRadius: 8, background: "color-mix(in srgb, var(--green) 8%, transparent)",
                }}>
                  ✓ Enviado ao Financeiro
                </div>
              ) : (
                <button
                  onClick={handleEnviar}
                  disabled={sending}
                  style={{
                    background: "none",
                    border: `1px solid ${corBase}`,
                    color: corBase,
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: sending ? "wait" : "pointer",
                    opacity: sending ? 0.6 : 1,
                    fontFamily: "inherit",
                    letterSpacing: ".02em",
                    transition: "background 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sending ? "Enviando…" : "↗ Gerar custo · PMO → Financeiro"}
                </button>
              )}
              <div style={{ fontSize: 9.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.4 }}>
                Registra no log financeiro<br />com rota completa e breakdown
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
