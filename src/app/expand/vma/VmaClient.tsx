"use client";

import { useState } from "react";
import type { Listing } from "./page";

const STATUS_COLORS = {
  ok:      { dot: "#22c55e", label: "Pronto",  bg: "color-mix(in srgb, #22c55e 10%, transparent)" },
  warning: { dot: "#f59e0b", label: "Aviso",   bg: "color-mix(in srgb, #f59e0b 10%, transparent)" },
  error:   { dot: "#ef4444", label: "Erro",    bg: "color-mix(in srgb, #ef4444 10%, transparent)" },
};

const PT: Record<string, string> = {
  "For Sale": "Venda",
  "For Rent": "Aluguel",
  Residential: "Residencial",
  Commercial:  "Comercial",
  Apartment:   "Apartamento",
  House:       "Casa",
  Land:        "Terreno",
};

function fmt(v: number, currency = "BRL") {
  return v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency, maximumFractionDigits: 0 }) : "—";
}

export default function VmaClient({ listings }: { listings: Listing[] }) {
  const [filter, setFilter] = useState<"all" | "ok" | "warning" | "error">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = listings.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.neighborhood.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      {/* Filtros */}
      <div className="ex-grph" style={{ marginBottom: 12 }}>
        <span className="gt">Imóveis do feed</span>
        <span className="gc">{visible.length} de {listings.length} exibidos</span>
        <span className="gl" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "ok", "warning", "error"] as const).map((f) => {
          const counts = { all: listings.length, ok: listings.filter(l=>l.status==="ok").length, warning: listings.filter(l=>l.status==="warning").length, error: listings.filter(l=>l.status==="error").length };
          const colors = { all: "var(--accent)", ok: "#22c55e", warning: "#f59e0b", error: "#ef4444" };
          const labels = { all: "Todos", ok: "Prontos", warning: "Avisos", error: "Erros" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1px solid ${filter === f ? colors[f] : "var(--line-2)"}`,
                background: filter === f ? `color-mix(in srgb, ${colors[f]} 15%, transparent)` : "transparent",
                color: filter === f ? colors[f] : "var(--mut)",
                cursor: "pointer",
              }}
            >
              {labels[f]} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
            </button>
          );
        })}

        <input
          type="text"
          placeholder="buscar por título, cidade, bairro…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: "auto", padding: "5px 12px", borderRadius: 20, border: "1px solid var(--line-2)",
            background: "var(--bg)", color: "var(--txt)", fontSize: 12, outline: "none", minWidth: 200,
          }}
        />
      </div>

      {listings.length === 0 && (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "24px", textAlign: "center", color: "var(--mut)", fontSize: 13 }}>
          Nenhum imóvel encontrado no feed.
        </div>
      )}

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((l) => {
          const sc = STATUS_COLORS[l.status];
          const isOpen = expanded === l.id;

          return (
            <div key={l.id} className="hx-glass" style={{ borderRadius: 12, overflow: "hidden", borderLeft: `3px solid ${sc.dot}` }}>
              {/* Cabeçalho do card */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
                onClick={() => setExpanded(isOpen ? null : l.id)}
              >
                {/* Thumb */}
                {l.photoUrls[0] ? (
                  <img
                    src={l.photoUrls[0]}
                    alt={l.title}
                    style={{ width: 60, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "var(--panel-2)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{ width: 60, height: 44, borderRadius: 6, background: "var(--panel-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--dim)" }}>🏠</div>
                )}

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {l.title || <span style={{ color: "var(--dim)", fontStyle: "italic" }}>sem título</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                    {[PT[l.subPropertyType] || PT[l.propertyType] || l.propertyType, PT[l.transactionType] || l.transactionType, l.city && l.neighborhood ? `${l.neighborhood}, ${l.city}` : l.city || l.neighborhood].filter(Boolean).join("  ·  ")}
                  </div>
                </div>

                {/* Preço */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt)" }}>{fmt(l.price)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{l.area > 0 ? `${l.area} m²` : "—"}</div>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.dot, border: `1px solid ${sc.dot}33` }}>
                    {sc.label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>📷 {l.photos}</span>
                </div>

                {/* Score */}
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: l.score >= 80 ? "color-mix(in srgb, #22c55e 15%, transparent)" : l.score >= 50 ? "color-mix(in srgb, #f59e0b 15%, transparent)" : "color-mix(in srgb, #ef4444 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: l.score >= 80 ? "#22c55e" : l.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                  {l.score}
                </div>

                <span style={{ color: "var(--dim)", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* Detalhe expandido */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "16px 16px 16px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Coluna esquerda: dados */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Dados do imóvel</div>
                      {[
                        ["ID",           l.id || "—"],
                        ["Tipo",         [PT[l.subPropertyType] || PT[l.propertyType] || l.propertyType, l.transactionType].filter(Boolean).join(" · ")],
                        ["Preço",        fmt(l.price, l.currency)],
                        ["Quartos",      l.bedrooms || "—"],
                        ["Banheiros",    l.bathrooms || "—"],
                        ["Vagas",        l.garages || "—"],
                        ["Área total",   l.area ? `${l.area} m²` : "—"],
                        ["Área útil",    l.usableArea ? `${l.usableArea} m²` : "—"],
                        ["CEP",          l.zipCode || "—"],
                        ["Coordenadas",  l.latitude ? `${l.latitude}, ${l.longitude}` : "—"],
                        ["Fotos",        `${l.photos} foto${l.photos !== 1 ? "s" : ""}`],
                        ["Link externo", l.externalLink ? "✓ presente" : "—"],
                      ].map(([k, v]) => (
                        <div key={String(k)} style={{ display: "flex", gap: 8, fontSize: 12, padding: "3px 0", borderBottom: "1px solid var(--line)" }}>
                          <span style={{ color: "var(--mut)", minWidth: 110, flexShrink: 0 }}>{k}</span>
                          <span style={{ color: "var(--txt)", wordBreak: "break-all" }}>{v}</span>
                        </div>
                      ))}

                      {/* Descrição */}
                      {l.description && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Descrição ({l.description.length} chars)</div>
                          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, margin: 0, maxHeight: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{l.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Coluna direita: issues + fotos */}
                    <div>
                      {/* Problemas */}
                      {l.issues.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                            Pendências OLX ({l.issues.length})
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                            {l.issues.map(issue => (
                              <div key={issue.id} style={{ borderRadius: 8, padding: "8px 12px", background: issue.severity === "error" ? "color-mix(in srgb, #ef4444 8%, transparent)" : "color-mix(in srgb, #f59e0b 8%, transparent)", border: `1px solid ${issue.severity === "error" ? "color-mix(in srgb, #ef4444 20%, transparent)" : "color-mix(in srgb, #f59e0b 20%, transparent)"}` }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: issue.severity === "error" ? "#ef4444" : "#f59e0b" }}>
                                  {issue.severity === "error" ? "✗" : "⚠"} {issue.label}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>{issue.hint}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {l.issues.length === 0 && (
                        <div style={{ borderRadius: 8, padding: "10px 14px", background: "color-mix(in srgb, #22c55e 8%, transparent)", border: "1px solid color-mix(in srgb, #22c55e 20%, transparent)", color: "#22c55e", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                          ✓ Pronto para publicar no OLX
                        </div>
                      )}

                      {/* Fotos */}
                      {l.photoUrls.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                            Fotos ({l.photos})
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                            {l.photoUrls.slice(0, 6).map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Foto ${i + 1}`}
                                style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 6 }}
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                              />
                            ))}
                          </div>
                          {l.photos > 6 && <p style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 4 }}>+{l.photos - 6} fotos não exibidas</p>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && listings.length > 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "var(--mut)", fontSize: 13 }}>
          Nenhum imóvel corresponde ao filtro atual.
        </div>
      )}
    </>
  );
}
