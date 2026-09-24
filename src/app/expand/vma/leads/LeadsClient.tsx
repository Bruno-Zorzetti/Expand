"use client";

import { useState, useTransition } from "react";
import type { VmaLead } from "./page";
import { atualizarStatusLead } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  novo:       "#ef4444",
  contatado:  "#f59e0b",
  descartado: "#64748b",
  fechado:    "#22c55e",
};

const PORTAL_LABEL: Record<string, string> = {
  olx:           "OLX",
  chavenamao:    "Chave na Mão",
  mercadolivre:  "Mercado Livre",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "agora";
}

export default function LeadsClient({ leads }: { leads: VmaLead[] }) {
  const [filter, setFilter] = useState<"todos" | VmaLead["status"]>("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = leads.filter(l => filter === "todos" || l.status === filter);

  function changeStatus(id: string, status: string) {
    startTransition(() => { atualizarStatusLead(id, status); });
  }

  if (leads.length === 0) {
    return (
      <div className="hx-glass" style={{ borderRadius: 12, padding: 40, textAlign: "center", color: "var(--dim)" }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>📭</p>
        <p>Nenhum lead recebido ainda.</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Configure a URL <code style={{ color: "var(--accent)" }}>/api/vma/leads</code> no painel do portal.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(["todos", "novo", "contatado", "descartado", "fechado"] as const).map(f => {
          const count = f === "todos" ? leads.length : leads.filter(l => l.status === f).length;
          const col   = STATUS_COLOR[f] || "var(--accent)";
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${filter === f ? col : "var(--line-2)"}`,
                background: filter === f ? `color-mix(in srgb, ${col} 15%, transparent)` : "transparent",
                color: filter === f ? col : "var(--mut)" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)", alignSelf: "center" }}>
          {visible.length} de {leads.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map(lead => {
          const col    = STATUS_COLOR[lead.status] || "var(--line-2)";
          const isOpen = expanded === lead.id;
          const portal = PORTAL_LABEL[lead.portal] || lead.portal?.toUpperCase() || "—";

          return (
            <div key={lead.id} className="hx-glass" style={{ borderRadius: 12, overflow: "hidden", borderLeft: `3px solid ${col}` }}>
              {/* Linha principal */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : lead.id)}>

                {/* Ícone portal */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {lead.portal === "olx" ? "🔶" : lead.portal === "chavenamao" ? "🔑" : lead.portal === "mercadolivre" ? "🛒" : "📋"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {lead.nome || <span style={{ color: "var(--dim)", fontStyle: "italic" }}>sem nome</span>}
                    <span style={{ fontSize: 10.5, fontWeight: 400, color: "var(--dim)", marginLeft: 8 }}>via {portal}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                    {[
                      lead.telefone,
                      lead.email,
                      lead.listing_id ? `Imóvel: ${lead.listing_id}` : null,
                    ].filter(Boolean).join("  ·  ")}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--dim)", flexShrink: 0 }}>
                  {timeAgo(lead.criado_em)}
                </div>

                {/* Status select */}
                <select value={lead.status} onClick={e => e.stopPropagation()}
                  onChange={e => changeStatus(lead.id, e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${col}`, background: `color-mix(in srgb, ${col} 12%, var(--bg))`, color: col, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  <option value="novo">Novo</option>
                  <option value="contatado">Contatado</option>
                  <option value="descartado">Descartado</option>
                  <option value="fechado">Fechado</option>
                </select>

                <span style={{ color: "var(--dim)", fontSize: 12, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* Detalhe */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Contato</div>
                    {[
                      ["Nome",    lead.nome],
                      ["E-mail",  lead.email],
                      ["Telefone",lead.telefone],
                      ["Imóvel",  lead.listing_id],
                      ["Portal",  portal],
                      ["Recebido",new Date(lead.criado_em).toLocaleString("pt-BR")],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={String(k)} style={{ display: "flex", gap: 8, fontSize: 12, padding: "3px 0", borderBottom: "1px solid var(--line)" }}>
                        <span style={{ color: "var(--mut)", minWidth: 80, flexShrink: 0 }}>{k}</span>
                        <span style={{ wordBreak: "break-all" }}>
                          {k === "E-mail" ? <a href={`mailto:${v}`} style={{ color: "var(--accent)" }}>{v}</a>
                           : k === "Telefone" ? <a href={`https://wa.me/55${String(v).replace(/\D/g, "")}`} target="_blank" rel="noopener" style={{ color: "#22c55e" }}>📱 {v}</a>
                           : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div>
                    {lead.mensagem && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Mensagem</div>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--txt)", margin: 0 }}>{lead.mensagem}</p>
                      </>
                    )}

                    {/* Acções rápidas */}
                    <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {lead.telefone && (
                        <a href={`https://wa.me/55${String(lead.telefone).replace(/\D/g, "")}?text=Olá ${encodeURIComponent(lead.nome || "")}! Vi seu interesse no imóvel${lead.listing_id ? ` ${lead.listing_id}` : ""}. Posso ajudar?`}
                          target="_blank" rel="noopener"
                          style={{ padding: "6px 14px", borderRadius: 8, background: "#22c55e", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                          💬 WhatsApp
                        </a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}?subject=Imóvel de seu interesse${lead.listing_id ? ` (${lead.listing_id})` : ""}`}
                          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--line-2)", color: "var(--txt)", fontSize: 12, textDecoration: "none" }}>
                          ✉ E-mail
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
