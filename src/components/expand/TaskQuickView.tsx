"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  iniciarEtapa, concluirEtapa, abrirChamado, alternarBloqueio,
  adicionarLink, comentarEtapa,
} from "@/app/expand/actions";

// ── Types ─────────────────────────────────────────────────────────────────────
export type QVEtapa = {
  id: string; titulo: string; criterio: string | null;
  area: string | null; agente: string | null;
  responsavel: string | null; responsavel_atual: string | null;
  status: string; sla: string | null; marco: boolean;
  data_prevista: string | null; iniciada_em: string | null;
  concluida_em: string | null; duracao_min: number | null;
  bloqueado: boolean; bloqueio_motivo: string | null;
  chamado: boolean; chamado_msg: string | null;
  fase: number;
};

export type QVArquivo = {
  id: string; nome: string; tipo: string; status: string; url: string | null;
  path: string | null; enviado_por: string | null; enviado_em: string | null;
  obs: string | null;
};

export type QVLog = {
  id: string; tipo: string; autor: string | null; detalhe: string | null; criado_em: string;
};

export type QVCliente = { id: string; nome: string };

const AREA_COR: Record<string, { n: string; cor: string }> = {
  cm: { n: "Comercial", cor: "#CE6A5F" },
  pm: { n: "PM",        cor: "#C89B5E" },
  cs: { n: "CS",        cor: "#E6D0A8" },
  av: { n: "Audiovisual", cor: "#6FBF92" },
  sm: { n: "Social",    cor: "#86C0A6" },
  tf: { n: "Tráfego",   cor: "#CE7F4C" },
  cl: { n: "Cliente",   cor: "#8A9990" },
};

const STATUS_META: Record<string, { l: string; c: string }> = {
  idle: { l: "Na fila",     c: "#7C8C7F" },
  wait: { l: "Aguardando",  c: "#D9A94E" },
  run:  { l: "Executando",  c: "#C89B5E" },
  done: { l: "Concluída",   c: "#3B82F6" },
  late: { l: "Atrasada",    c: "#CE6A5F" },
};

const ARQ_STATUS: Record<string, { l: string; c: string }> = {
  pendente:  { l: "Enviado", c: "#7C8C7F" },
  aprovado:  { l: "Aprovado",  c: "#6FBF92" },
  reprovado: { l: "Reprovado", c: "#CE6A5F" },
  aguardando:{ l: "Aguardando", c: "#D9A94E" },
};

const LOG_TIPO_META: Record<string, { icon: string; c: string }> = {
  comentario:   { icon: "💬", c: "var(--dim)" },
  iniciar:      { icon: "▶", c: "#6FBF92" },
  concluir:     { icon: "✓", c: "#3B82F6" },
  bloqueio:     { icon: "🔒", c: "#CE6A5F" },
  desbloqueio:  { icon: "🔓", c: "#6FBF92" },
  chamado:      { icon: "📣", c: "#D9A94E" },
  transferencia:{ icon: "→", c: "#C89B5E" },
  upload:       { icon: "📎", c: "var(--dim)" },
  aprovado:     { icon: "✓", c: "#6FBF92" },
  reprovado:    { icon: "✗", c: "#CE6A5F" },
  link:         { icon: "🔗", c: "var(--dim)" },
  agendamento:  { icon: "📅", c: "var(--dim)" },
};

function fmtTs(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000)  return "agora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fmtDur(min: number | null) {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? ` ${m}m` : ""}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

// ── TaskQuickView ─────────────────────────────────────────────────────────────
export function TaskQuickView({
  etapa, arquivos, logs, cliente, signedUrls, isAdmin,
}: {
  etapa: QVEtapa; arquivos: QVArquivo[]; logs: QVLog[];
  cliente: QVCliente | null; signedUrls: Map<string, string>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [comentario, setComentario] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("qv");
    router.push(url.pathname + (url.searchParams.size ? `?${url.searchParams}` : ""));
  };

  const ar   = etapa.area ? AREA_COR[etapa.area] : null;
  const st   = STATUS_META[etapa.status] ?? STATUS_META.idle;
  const run  = etapa.status === "run";
  const done = etapa.status === "done";
  const elapsed = etapa.iniciada_em && !done
    ? Math.round((Date.now() - new Date(etapa.iniciada_em).getTime()) / 60000) : null;

  const aprovados = arquivos.filter((a) => a.status === "aprovado").length;
  const recentLogs = logs.filter((l) => l.tipo !== "comentario").slice(0, 5);
  const comentarios = logs.filter((l) => l.tipo === "comentario").slice(0, 5);

  const fld: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={close}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.38)", zIndex: 1000 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: "min(460px, 100vw)", height: "100vh",
        background: "var(--bg)", borderLeft: "1px solid var(--line)",
        boxShadow: "-16px 0 48px rgba(0,0,0,.22)", zIndex: 1001,
        overflowY: "auto", padding: "0 0 80px",
      }}>

        {/* ── Header ────────────────────────────── */}
        <div style={{
          position: "sticky", top: 0, background: "var(--bg)", zIndex: 2,
          borderBottom: "1px solid var(--line)", padding: "14px 20px",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
              {ar && (
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: ar.cor, background: `color-mix(in srgb,${ar.cor} 14%,transparent)`, padding: "2px 8px", borderRadius: 20 }}>
                  {ar.n}
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: st.c, background: `color-mix(in srgb,${st.c} 14%,transparent)`, padding: "2px 8px", borderRadius: 20 }}>
                {run && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: st.c, marginRight: 4, animation: "qvPulse 1.6s ease-in-out infinite", verticalAlign: "middle" }} />}
                {st.l}
                {run && elapsed != null && ` · ${fmtDur(elapsed)}`}
              </span>
              {done && etapa.duracao_min && (
                <span style={{ fontSize: 10, color: "var(--dim)" }}>
                  {fmtDur(etapa.duracao_min)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: "var(--txt)", lineHeight: 1.25 }}>
              {etapa.marco && <span style={{ color: "var(--accent)" }}>◆ </span>}
              {etapa.titulo}
            </div>
            {cliente && (
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>
                {cliente.nome} · Fase {etapa.fase}
                {etapa.sla ? ` · SLA ${etapa.sla}` : ""}
              </div>
            )}
          </div>
          <button onClick={close} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 20, padding: "2px 4px", lineHeight: 1, flexShrink: 0, marginTop: 2 }}>✕</button>
        </div>

        {/* ── Criterio ──────────────────────────── */}
        {etapa.criterio && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>
            {etapa.criterio}
          </div>
        )}

        {/* ── Alerts ────────────────────────────── */}
        {(etapa.bloqueado || etapa.chamado) && (
          <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
            {etapa.bloqueado && (
              <div style={{ borderLeft: "3px solid var(--red)", background: "color-mix(in srgb,var(--red) 8%,transparent)", padding: "7px 12px", borderRadius: "0 8px 8px 0", fontSize: 12 }}>
                <b style={{ color: "var(--red)" }}>Bloqueada</b> — {etapa.bloqueio_motivo || "sem motivo"}
              </div>
            )}
            {etapa.chamado && (
              <div style={{ borderLeft: "3px solid var(--warn)", background: "color-mix(in srgb,var(--warn) 8%,transparent)", padding: "7px 12px", borderRadius: "0 8px 8px 0", fontSize: 12 }}>
                <b style={{ color: "var(--warn)" }}>Chamado</b> — {etapa.chamado_msg}
              </div>
            )}
          </div>
        )}

        {/* ── Quick actions ──────────────────────── */}
        {!done && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!run && (
              <form action={iniciarEtapa}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <button type="submit" style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 9, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ▶ Iniciar
                </button>
              </form>
            )}
            {run && (
              <form action={concluirEtapa}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <button type="submit" style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 9, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Concluir
                </button>
              </form>
            )}
            <form action={alternarBloqueio}>
              <input type="hidden" name="etapaId" value={etapa.id} />
              <input type="hidden" name="motivo" value={etapa.bloqueado ? "" : "Aguardando definição"} />
              <button type="submit" style={{ background: "none", border: `1px solid ${etapa.bloqueado ? "var(--red)" : "var(--line)"}`, color: etapa.bloqueado ? "var(--red)" : "var(--dim)", borderRadius: 9, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {etapa.bloqueado ? "🔓 Desbloquear" : "🔒 Bloquear"}
              </button>
            </form>
            {!etapa.chamado && (
              <form action={abrirChamado}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <input type="hidden" name="msg" value="Chamado aberto via painel" />
                <button type="submit" style={{ background: "none", border: "1px solid var(--line)", color: "var(--dim)", borderRadius: 9, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  📣 Chamado
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Entregáveis ────────────────────────── */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Entregáveis</span>
            <span style={{ fontSize: 11, background: `color-mix(in srgb,${aprovados === arquivos.length && arquivos.length > 0 ? "var(--green)" : "var(--accent)"} 14%,transparent)`, color: aprovados === arquivos.length && arquivos.length > 0 ? "var(--green)" : "var(--accent)", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>
              {aprovados}/{arquivos.length}
            </span>
          </div>

          {arquivos.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>Nenhum entregável ainda.</div>
          )}

          {arquivos.slice(0, 6).map((a) => {
            const s = ARQ_STATUS[a.status] ?? ARQ_STATUS.pendente;
            const href = a.tipo === "link" ? a.url : signedUrls.get(a.id);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{a.tipo === "link" ? "🔗" : "📄"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {href
                    ? <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--txt)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</a>
                    : <span style={{ fontSize: 12.5, color: "var(--txt)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nome}</span>
                  }
                  {a.enviado_por && (
                    <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{a.enviado_por}</span>
                  )}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: s.c, background: `color-mix(in srgb,${s.c} 12%,transparent)`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>
                  {s.l}
                </span>
              </div>
            );
          })}

          {/* Add link */}
          {!done && (
            <>
              {showLinkForm ? (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Nome do link" style={{ ...fld, flex: 2, minWidth: 100 }} />
                  <input value={novoLink} onChange={(e) => setNovoLink(e.target.value)} placeholder="https://..." style={{ ...fld, flex: 3, minWidth: 140 }} />
                  <button
                    onClick={() => {
                      if (!novoLink.trim()) return;
                      const fd = new FormData();
                      fd.set("etapaId", etapa.id);
                      fd.set("nome", linkLabel.trim() || novoLink.trim());
                      fd.set("url", novoLink.trim());
                      start(async () => { await adicionarLink(fd); setNovoLink(""); setLinkLabel(""); setShowLinkForm(false); router.refresh(); });
                    }}
                    style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Adicionar
                  </button>
                  <button onClick={() => setShowLinkForm(false)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setShowLinkForm(true)} style={{ marginTop: 8, background: "none", border: "1px dashed var(--line)", borderRadius: 8, padding: "5px 12px", fontSize: 11.5, color: "var(--dim)", cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
                  + Adicionar link
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Comentário rápido ──────────────────── */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 8 }}>Comentários</div>

          {comentarios.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "color-mix(in srgb,var(--accent) 20%,var(--panel-2))", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {(c.autor ?? "?").charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{c.autor ?? "?"} <span style={{ color: "var(--dim)", fontWeight: 400 }}>{fmtTs(c.criado_em)}</span></div>
                <div style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.5 }}>{c.detalhe}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escrever comentário..."
              style={{ ...fld, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && comentario.trim()) {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.set("etapaId", etapa.id);
                  fd.set("texto", comentario.trim());
                  start(async () => { await comentarEtapa(fd); setComentario(""); router.refresh(); });
                }
              }}
            />
            <button
              disabled={!comentario.trim()}
              onClick={() => {
                if (!comentario.trim()) return;
                const fd = new FormData();
                fd.set("etapaId", etapa.id);
                fd.set("texto", comentario.trim());
                start(async () => { await comentarEtapa(fd); setComentario(""); router.refresh(); });
              }}
              style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: comentario.trim() ? 1 : 0.5 }}>
              →
            </button>
          </div>
        </div>

        {/* ── Histórico ─────────────────────────── */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 8 }}>Histórico</div>
          {recentLogs.length === 0 && <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>Sem registros.</div>}
          {recentLogs.map((l) => {
            const m = LOG_TIPO_META[l.tipo] ?? { icon: "•", c: "var(--dim)" };
            return (
              <div key={l.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12 }}>
                <span style={{ fontSize: 14, flexShrink: 0, color: m.c }}>{m.icon}</span>
                <div>
                  <span style={{ color: "var(--dim)", marginRight: 6 }}>{fmtTs(l.criado_em)}</span>
                  {l.autor && <span style={{ color: "var(--txt)", fontWeight: 600, marginRight: 6 }}>{l.autor.split(" ")[0]}</span>}
                  {l.detalhe && <span style={{ color: "var(--dim)" }}>{l.detalhe.slice(0, 80)}{l.detalhe.length > 80 ? "…" : ""}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Ver tudo → ────────────────────────── */}
        <div style={{ padding: "16px 20px" }}>
          <Link href={`/expand/etapa/${etapa.id}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "color-mix(in srgb,var(--accent) 8%,transparent)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 13.5 }}>
            Abrir página completa da tarefa
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes qvPulse { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>
    </>
  );
}
