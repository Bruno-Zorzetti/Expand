"use client";

import React, { useState, useId } from "react";

/* ══════════════════════════════════════════════════════════════════
   EtapaPipeline — Rota visual de uma tarefa

   Custo = tempo_real_trabalhado × custo_hora_do_responsável
   (não pelo SLA; não pela área — pela pessoa que executou × tempo efetivo)

   Seção de custo e taxa visível SOMENTE para isAdmin.
   ══════════════════════════════════════════════════════════════════ */

// Cores por área (para linha da rota) — taxa removida daqui
export const AREA_COR: Record<string, { n: string; cor: string }> = {
  cm:        { n: "Comercial",    cor: "#CE6A5F" },
  pm:        { n: "PM",           cor: "#C89B5E" },
  cs:        { n: "CS",           cor: "#E6D0A8" },
  av:        { n: "Audiovisual",  cor: "#6FBF92" },
  sm:        { n: "Social",       cor: "#86C0A6" },
  tf:        { n: "Tráfego",      cor: "#CE7F4C" },
  cl:        { n: "Cliente",      cor: "#8A9990" },
  Operação:  { n: "Operação",     cor: "#6FBF92" },
  Comercial: { n: "Comercial",    cor: "#CE6A5F" },
  Admin:     { n: "Admin",        cor: "#C89B5E" },
  Clientes:  { n: "Clientes",     cor: "#86C0A6" },
  Equipe:    { n: "Equipe",       cor: "#8A9990" },
};

// Custo estimado de agentes de IA (tokens + infra, R$/h)
// Admin pode ajustar estes valores conforme o uso real de API
export const AGENT_TAXA: Record<string, number> = {
  "lara": 5, "sofia": 4, "alan": 4, "nina": 4,
  "claude-code": 8, "teo": 4, "bia": 4, "daniel": 5,
};

const TIPOS_ROTA = new Set([
  "inicio", "transferencia", "conclusao", "bloqueio", "desbloqueio",
  "chamado", "aprovacao", "agendamento",
]);

const TIPO_COR: Record<string, string> = {
  bloqueio:    "#EF4444",
  desbloqueio: "#22C55E",
  chamado:     "#F59E0B",
  conclusao:   "#22C55E",
  aprovacao:   "#3B82F6",
};

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
  duracao_min: number | null;     // tempo real trabalhado (calculado pelo chamador)
  iniciada_em: string | null;
  concluida_em: string | null;
  logs: LogEntry[];
  isAdmin?: boolean;
  custoHoraResponsavel?: number | null;  // R$/h configurado no perfil do membro
  custoHoraAgente?: number | null;       // R$/h do agente de IA (ou usa AGENT_TAXA)
  onEnviarFinanceiro?: (payload: CustoPayload) => Promise<void>;
}

export interface CustoPayload {
  etapaId: string;
  area: string;
  agente: string | null;
  duracao_min: number;
  responsavel: string | null;
  custo_responsavel: number;
  custo_agente: number;
  custo_total: number;
  detalhes: string;
}

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
  const areaDef = area ? AREA_COR[area] : null;
  const corBase = areaDef?.cor ?? "#475569";

  const points: RoutePoint[] = [];

  if (iniciada_em) {
    points.push({
      id: "start", tipo: "inicio", label: TIPO_LABEL.inicio,
      autor: responsavel, detalhe: areaDef ? areaDef.n : null,
      ts: iniciada_em, area, cor: corBase,
    });
  }

  const relevantes = logs
    .filter(l => TIPOS_ROTA.has(l.tipo) && l.tipo !== "inicio" && l.tipo !== "conclusao")
    .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

  for (const l of relevantes) {
    points.push({
      id: l.id, tipo: l.tipo, label: TIPO_LABEL[l.tipo] ?? l.tipo,
      autor: l.autor, detalhe: l.detalhe, ts: l.criado_em, area,
      cor: TIPO_COR[l.tipo] ?? corBase,
    });
  }

  if (concluida_em) {
    points.push({
      id: "end", tipo: "conclusao", label: TIPO_LABEL.conclusao,
      autor: responsavel, detalhe: null, ts: concluida_em, area,
      cor: TIPO_COR.conclusao,
    });
  }

  if (points.length === 0 && area) {
    points.push({
      id: "pending", tipo: "pendente", label: "Aguardando",
      autor: responsavel, detalhe: areaDef?.n ?? null,
      ts: new Date().toISOString(), area, cor: corBase,
    });
  }

  return points;
}

export default function EtapaPipeline(props: EtapaPipelineProps) {
  const {
    etapaId, area, agente, responsavel, duracao_min, status,
    isAdmin, custoHoraResponsavel, custoHoraAgente,
    onEnviarFinanceiro,
  } = props;

  const uid     = useId().replace(/:/g, "");
  const route   = buildRoute(props);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const areaDef  = area ? AREA_COR[area] : null;
  const corBase  = areaDef?.cor ?? "#475569";
  const dur      = duracao_min ?? 0;

  // ── Cálculo de custo ─────────────────────────────────────────────
  // Custo do responsável humano: tempo_real × taxa_da_pessoa
  const taxaResp   = custoHoraResponsavel ?? 0;
  const custoResp  = Math.round((dur / 60) * taxaResp * 100) / 100;

  // Custo do agente de IA: mesmo tempo × taxa do agente
  const taxaAg     = custoHoraAgente ?? (agente ? (AGENT_TAXA[agente] ?? 0) : 0);
  const custoAg    = Math.round((dur / 60) * taxaAg * 100) / 100;

  const custoTotal = Math.round((custoResp + custoAg) * 100) / 100;

  const isDone    = status === "done";
  const isRunning = status === "run";

  const n    = route.length;
  const W    = 560;
  const H    = 110;
  const PAD  = 40;
  const step = n > 1 ? (W - PAD * 2) / (n - 1) : 0;

  function nodeX(i: number) { return PAD + i * step; }
  const nodeY = 50;

  const routeD = n > 1
    ? route.map((_, i) => `${i === 0 ? "M" : "L"}${nodeX(i).toFixed(1)},${nodeY}`).join(" ")
    : `M${PAD},${nodeY} L${W - PAD},${nodeY}`;

  async function handleEnviar() {
    if (!onEnviarFinanceiro || sending || sent) return;
    setSending(true);
    const payload: CustoPayload = {
      etapaId, area: area ?? "—", agente, responsavel,
      duracao_min: dur,
      custo_responsavel: custoResp,
      custo_agente: custoAg,
      custo_total: custoTotal,
      detalhes: JSON.stringify({
        responsavel, taxa_hora_responsavel: taxaResp,
        agente, taxa_hora_agente: taxaAg,
        duracao_min: dur, duracao_texto: fmtDur(dur),
        custo_responsavel: custoResp, custo_agente: custoAg,
        custo_total: custoTotal,
        metodo: "tempo_real × custo_hora_responsavel",
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
            {route.map((p) => (
              <filter key={p.id} id={`${uid}-f-${p.id}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation={p.tipo === "conclusao" ? "3.5" : "2.5"} result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            {n > 1 && (
              <linearGradient id={`${uid}-lg`} x1="0%" y1="0%" x2="100%" y2="0%">
                {route.map((p, i) => (
                  <stop key={p.id} offset={`${(i / (n - 1)) * 100}%`} stopColor={p.cor} stopOpacity="0.6" />
                ))}
              </linearGradient>
            )}
            <path id={`${uid}-route`} d={routeD} />
            <radialGradient id={`${uid}-dotg`} cx="40%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#fff" stopOpacity="0.95" />
              <stop offset="60%"  stopColor={corBase} stopOpacity="0.9" />
              <stop offset="100%" stopColor={corBase} stopOpacity="0.2" />
            </radialGradient>
          </defs>

          {n > 1 && route.slice(0, -1).map((p, i) => {
            const x1 = nodeX(i), x2 = nodeX(i + 1);
            const next = route[i + 1];
            return (
              <g key={`seg-${p.id}`}>
                <line x1={x1} y1={nodeY} x2={x2} y2={nodeY}
                  stroke={next.cor} strokeWidth="4" strokeOpacity="0.12" strokeLinecap="round" />
                <line x1={x1} y1={nodeY} x2={x2} y2={nodeY}
                  stroke={next.cor} strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
              </g>
            );
          })}

          {isRunning && n > 1 && (
            <circle r="4.5" fill={`url(#${uid}-dotg)`}>
              <animateMotion dur="3s" begin="0s" repeatCount="indefinite" calcMode="linear">
                <mpath href={`#${uid}-route`} />
              </animateMotion>
            </circle>
          )}

          {route.map((p, i) => {
            const x = nodeX(i);
            const isHov = hovered === p.id;
            const r = p.tipo === "conclusao" || p.tipo === "inicio" ? 10 : 8;
            const tsLabel = fmtTs(p.ts);
            const evLabel = p.label;
            const autLabel = p.autor ? p.autor.split(" ")[0] : "";
            return (
              <g key={p.id}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "default" }}
              >
                {(isRunning && i === route.length - 1) && (
                  <circle cx={x} cy={nodeY} r={r + 6} fill="none" stroke={p.cor} strokeWidth="0.8">
                    <animate attributeName="r"              values={`${r+4};${r+9};${r+4}`}     dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.4;0.05;0.4"               dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={nodeY} r={r}
                  fill="var(--panel-2, #0c1629)" stroke={p.cor}
                  strokeWidth={p.tipo === "conclusao" || p.tipo === "inicio" ? 2.5 : 1.8}
                  filter={`url(#${uid}-f-${p.id})`} />
                {p.tipo === "conclusao" && (
                  <text x={x} y={nodeY + 4} textAnchor="middle" fill={p.cor} fontSize="9" fontFamily="ui-monospace,monospace">✓</text>
                )}
                {p.tipo === "bloqueio" && (
                  <text x={x} y={nodeY + 4} textAnchor="middle" fill={p.cor} fontSize="9" fontFamily="ui-monospace,monospace">!</text>
                )}
                <text x={x} y={nodeY - r - 12} textAnchor="middle"
                  fill={isHov ? p.cor : "var(--dim, #64748b)"} fontSize="8"
                  fontFamily="ui-monospace,monospace"
                  fontWeight={p.tipo === "inicio" || p.tipo === "conclusao" ? "700" : "500"}>
                  {evLabel}
                </text>
                {autLabel && (
                  <text x={x} y={nodeY - r - 22} textAnchor="middle"
                    fill={p.cor} fontSize="7.5" fontFamily="ui-monospace,monospace">
                    {autLabel}
                  </text>
                )}
                <text x={x} y={nodeY + r + 14} textAnchor="middle"
                  fill="var(--mut, #475569)" fontSize="7.5" fontFamily="ui-monospace,monospace">
                  {tsLabel}
                </text>
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

      {/* ── Cupons fiscais de custo — somente admin ────────────── */}
      {isAdmin && dur > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line, #1e3a5f)", paddingTop: 14 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            Custo detalhado da tarefa
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "color-mix(in srgb,var(--warn) 14%,transparent)", color: "var(--warn)", fontWeight: 700, letterSpacing: 0 }}>ADMIN</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* CUPOM 001 — Responsável humano */}
            {taxaResp > 0 ? (
              <CupomFiscal num="001" titulo="Tempo do responsável" cor={corBase}>
                <CupomLinha desc={`${responsavel ?? "—"}`} obs={`${fmtDur(dur)} × ${brl(taxaResp)}/h`} valor={brl(custoResp)} cor={corBase} />
              </CupomFiscal>
            ) : responsavel ? (
              <CupomFiscal num="001" titulo="Tempo do responsável" cor="#64748b">
                <CupomLinha desc={`${responsavel}`} obs={`${fmtDur(dur)} · taxa não configurada`} valor="—" cor="#64748b" />
                <div style={{ fontSize: 9.5, color: "var(--warn)", marginTop: 4, fontStyle: "italic" }}>Configure em /expand/equipe</div>
              </CupomFiscal>
            ) : null}

            {/* CUPOM 002 — Assinatura Claude (proporcional) */}
            {agente && (() => {
              const mensalidade = 900; // R$
              const horasMes = 730;
              const custoHora = mensalidade / horasMes;
              const custoAssinatura = Math.round((dur / 60) * custoHora * 100) / 100;
              return (
                <CupomFiscal num="002" titulo="Assinatura Claude" cor="#7C3AED">
                  <CupomLinha desc="Plano mensal Claude" obs={`R$${mensalidade}/mês ÷ ${horasMes}h × ${fmtDur(dur)}`} valor={brl(custoAssinatura)} cor="#7C3AED" />
                </CupomFiscal>
              );
            })()}

            {/* CUPOM 003 — Tokens API Anthropic (estimativa) */}
            {agente && (() => {
              // Estimativa: ~50 tokens/min de trabalho (input+output combinados)
              // Claude Sonnet: $3/1M input, $15/1M output → média ~$6/1M tokens
              // Câmbio estimado: R$5.50/USD
              const tokensEstimados = dur * 50;
              const custoPorMilhao = 6 * 5.50; // R$33/1M tokens
              const custoTokens = Math.round((tokensEstimados / 1_000_000) * custoPorMilhao * 100) / 100;
              return (
                <CupomFiscal num="003" titulo="API Anthropic (tokens)" cor="#7C3AED">
                  <CupomLinha
                    desc="Tokens estimados (input+output)"
                    obs={`~${tokensEstimados.toLocaleString("pt-BR")} tokens · $6/1M avg × R$5,50`}
                    valor={brl(custoTokens)}
                    cor="#7C3AED"
                  />
                  <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 3, fontStyle: "italic" }}>Estimativa: ~50 tokens/min de execução</div>
                </CupomFiscal>
              );
            })()}

            {/* CUPOM 004 — Agente Apify/outros (estimativa por hora de uso) */}
            {agente === "lara" && (() => {
              const custoApify = Math.round((dur / 60) * 3 * 100) / 100; // ~R$3/h estimado
              return (
                <CupomFiscal num="004" titulo="Apify (scraping/leads)" cor="#FF7C00">
                  <CupomLinha desc="Créditos Apify estimados" obs={`~R$3/h × ${fmtDur(dur)}`} valor={brl(custoApify)} cor="#FF7C00" />
                </CupomFiscal>
              );
            })()}
          </div>

          {/* Total geral */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "2px solid var(--line)", display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Total estimado</span>
              {!isDone && <span style={{ fontSize: 10, color: "var(--dim)" }}>· em andamento</span>}
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--txt)" }}>{custoTotal > 0 ? brl(custoTotal) : "—"}</span>
          </div>

          {/* Botão enviar ao Financeiro */}
          {onEnviarFinanceiro && (
            <div style={{ textAlign: "right", marginTop: 10 }}>
              {sent ? (
                <div style={{ fontSize: 11, color: "var(--green)", padding: "8px 14px", border: "1px solid var(--green)", borderRadius: 8, background: "color-mix(in srgb, var(--green) 8%, transparent)" }}>
                  ✓ Enviado ao Financeiro
                </div>
              ) : (
                <button onClick={handleEnviar} disabled={sending} style={{ background: "none", border: `1px solid ${corBase}`, color: corBase, borderRadius: 8, padding: "8px 16px", fontSize: 11.5, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1, fontFamily: "inherit", letterSpacing: ".02em", transition: "background 0.15s", whiteSpace: "nowrap" }}>
                  {sending ? "Enviando…" : "↗ Gerar custo · PMO → Financeiro"}
                </button>
              )}
              <div style={{ fontSize: 9.5, color: "var(--dim)", marginTop: 5, lineHeight: 1.4 }}>Registra no log financeiro com breakdown detalhado</div>
            </div>
          )}
        </div>
      )}

      {/* Duração visível para todos (sem custo) */}
      {dur > 0 && !isAdmin && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--dim)" }}>
          Tempo trabalhado: <strong style={{ color: "var(--txt)" }}>{fmtDur(dur)}</strong>
          {!isDone && <span style={{ marginLeft: 6, fontSize: 11 }}>· em andamento</span>}
        </div>
      )}
    </div>
  );
}

/* ── Componentes auxiliares — cupom fiscal ─────────────────────── */

function CupomFiscal({ num, titulo, cor, children }: {
  num: string; titulo: string; cor: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      border: `1px dashed ${cor}60`, borderRadius: 8,
      padding: "8px 11px", fontFamily: "ui-monospace,monospace",
      background: `color-mix(in srgb, ${cor} 5%, var(--panel-2))`,
    }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: cor, letterSpacing: ".06em", textTransform: "uppercase" }}>
          CUPOM {num}
        </span>
        <span style={{ fontSize: 9.5, color: "var(--dim)", letterSpacing: ".03em" }}>{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function CupomLinha({ desc, obs, valor, cor }: {
  desc: string; obs: string; valor: string; cor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--txt)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
        <div style={{ fontSize: 9.5, color: "var(--dim)", marginTop: 1, lineHeight: 1.3 }}>{obs}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: cor, whiteSpace: "nowrap", flexShrink: 0 }}>{valor}</div>
    </div>
  );
}
