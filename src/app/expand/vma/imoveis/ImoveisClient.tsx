"use client";

import { useState, useTransition } from "react";
import type { VmaImovel } from "./actions";
import { excluirImovel, alterarStatus } from "./actions";

function fmt(v: number) {
  return v > 0 ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—";
}

const STATUS_COLOR: Record<string, string> = {
  Ativo:    "#22c55e",
  Suspenso: "#f59e0b",
  Vendido:  "#64748b",
  Locado:   "#8b5cf6",
};

const PORTAIS_LABELS: Record<string, string> = {
  olx: "OLX", chavenamao: "Chave", mercadolivre: "ML",
};

export default function ImoveisClient({ imoveis }: { imoveis: VmaImovel[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = imoveis.filter((im) => {
    if (filterStatus !== "todos" && im.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (im.titulo || "").toLowerCase().includes(q) ||
      (im.cidade || "").toLowerCase().includes(q) ||
      (im.bairro || "").toLowerCase().includes(q) ||
      (im.codigo || "").toLowerCase().includes(q)
    );
  });

  function handleDeletar(id: string) {
    startTransition(() => { excluirImovel(id); });
  }

  function handleStatus(id: string, status: string) {
    startTransition(() => { alterarStatus(id, status); });
  }

  return (
    <>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          type="text" placeholder="buscar por título, cidade, código…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--line-2)", background: "var(--bg)", color: "var(--txt)", fontSize: 12, outline: "none", minWidth: 220 }}
        />
        {["todos", "Ativo", "Suspenso", "Vendido", "Locado"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${filterStatus === s ? (STATUS_COLOR[s] || "var(--accent)") : "var(--line-2)"}`,
              background: filterStatus === s ? `color-mix(in srgb, ${STATUS_COLOR[s] || "var(--accent)"} 15%, transparent)` : "transparent",
              color: filterStatus === s ? (STATUS_COLOR[s] || "var(--accent)") : "var(--mut)" }}>
            {s === "todos" ? "Todos" : s} ({s === "todos" ? imoveis.length : imoveis.filter(i => i.status === s).length})
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>{visible.length} de {imoveis.length}</span>
      </div>

      {/* Modal confirmação exclusão */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="hx-glass" style={{ borderRadius: 16, padding: 28, maxWidth: 360, textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Excluir imóvel?</p>
            <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 20 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--line-2)", background: "transparent", color: "var(--txt)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => { handleDeletar(confirmDel); setConfirmDel(null); }}
                style={{ padding: "8px 20px", borderRadius: 8, background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {visible.length === 0 ? (
        <div className="hx-glass" style={{ borderRadius: 12, padding: 40, textAlign: "center", color: "var(--dim)" }}>
          {imoveis.length === 0
            ? <>Nenhum imóvel cadastrado. <a href="/expand/vma/imoveis/novo" style={{ color: "var(--accent)" }}>Criar o primeiro</a></>
            : "Nenhum imóvel encontrado com este filtro."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((im) => {
            const thumb = im.fotos?.[0]?.url || (im.fotos?.find(f => f.principal))?.url;
            const price = im.finalidade === "Locação" ? im.preco_locacao : im.preco_venda;
            const portaisAtivos = Object.entries(im.portais ?? {}).filter(([, v]) => v).map(([k]) => PORTAIS_LABELS[k] || k);

            return (
              <div key={im.id} className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", display: "flex", gap: 14, alignItems: "center", borderLeft: `3px solid ${STATUS_COLOR[im.status] || "var(--line-2)"}` }}>
                {/* Thumb */}
                {thumb ? (
                  <img src={thumb} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
                ) : (
                  <div style={{ width: 64, height: 48, borderRadius: 8, background: "var(--panel-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏠</div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {im.titulo || <span style={{ color: "var(--dim)", fontStyle: "italic" }}>sem título</span>}
                    {im.codigo && <span style={{ fontSize: 10.5, color: "var(--dim)", marginLeft: 8 }}>#{im.codigo}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                    {[im.tipo, im.bairro && im.cidade ? `${im.bairro}, ${im.cidade}` : im.cidade].filter(Boolean).join("  ·  ")}
                  </div>
                  {portaisAtivos.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {portaisAtivos.map(p => (
                        <span key={p} style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preço */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(price)}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{im.area_total > 0 ? `${im.area_total} m²` : ""}</div>
                  <div style={{ fontSize: 10, color: "var(--dim)" }}>📷 {im.fotos?.length ?? 0}</div>
                </div>

                {/* Status select */}
                <select
                  value={im.status}
                  onChange={(e) => handleStatus(im.id, e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${STATUS_COLOR[im.status] || "var(--line-2)"}`, background: `color-mix(in srgb, ${STATUS_COLOR[im.status] || "var(--line-2)"} 12%, var(--bg))`, color: STATUS_COLOR[im.status] || "var(--txt)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  <option>Ativo</option>
                  <option>Suspenso</option>
                  <option>Vendido</option>
                  <option>Locado</option>
                </select>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a href={`/expand/vma/imoveis/${im.id}`}
                    style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--line-2)", color: "var(--txt)", fontSize: 12, textDecoration: "none" }}>
                    Editar
                  </a>
                  <button onClick={() => setConfirmDel(im.id)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", background: "transparent", color: "var(--red)", fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
