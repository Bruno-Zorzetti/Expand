"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export type SidebarCliente = {
  id: string; nome: string; maturidade: string | null;
  urgencia: "critico" | "atencao" | "normal";
};

const URG_COR: Record<string, string> = {
  critico: "var(--red)", atencao: "var(--warn)", normal: "var(--green)",
};
const MAT_COR_S: Record<string, string> = {
  "Estruturação": "var(--green)", "Validação": "#a78bfa",
  "Otimização": "var(--accent)", "Escala": "var(--green)",
};

function ini(nome: string) {
  return nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function BoardSidebar({ clientes, selectedId, viewMode }: {
  clientes: SidebarCliente[]; selectedId: string; viewMode: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("board-sidebar-v2");
    // Default collapsed on narrow screens
    const defaultCollapsed = window.innerWidth < 900;
    setCollapsed(stored !== null ? stored === "1" : defaultCollapsed);
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("board-sidebar-v2", next ? "1" : "0");
      return next;
    });
  }

  const href = (id: string) =>
    `/expand/board?c=${id}${viewMode === "kanban" ? "&v=kanban" : ""}`;

  // ── Collapsed strip ──────────────────────────────────────────────────────
  if (ready && collapsed) {
    return (
      <div style={{
        width: 46, flexShrink: 0,
        position: "sticky", top: 20,
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        <button
          onClick={toggle}
          title="Expandir lista de contas"
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: "var(--panel)", border: "1px solid var(--line-2)",
            cursor: "pointer", color: "var(--dim)", fontSize: 18, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--panel-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--dim)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--panel)";
          }}
        >›</button>

        <div style={{ width: 1, height: 8 }} />

        {clientes.map((c) => {
          const isSel = c.id === selectedId;
          return (
            <Link key={c.id} href={href(c.id)} title={c.nome} style={{
              width: 38, height: 38, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
              background: isSel
                ? "color-mix(in srgb, var(--accent) 16%, var(--panel))"
                : "var(--panel)",
              border: `1px solid ${isSel
                ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                : "var(--line)"}`,
              transition: "background .12s, border-color .12s",
              position: "relative",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800,
                color: isSel ? "var(--accent)" : "var(--dim)",
              }}>{ini(c.nome)}</span>
              <span style={{
                position: "absolute", bottom: 4, right: 4,
                width: 6, height: 6, borderRadius: "50%",
                background: URG_COR[c.urgencia],
                boxShadow: `0 0 4px ${URG_COR[c.urgencia]}`,
              }} />
            </Link>
          );
        })}
      </div>
    );
  }

  // ── Expanded sidebar ─────────────────────────────────────────────────────
  return (
    <div style={{
      width: ready ? 200 : 200, flexShrink: 0,
      position: "sticky", top: 20,
      opacity: ready ? 1 : 0,
      transition: "opacity .15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)" }}>
          Contas · {clientes.length}
        </span>
        <button
          onClick={toggle}
          title="Recolher"
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--panel-2)", border: "1px solid var(--line)",
            cursor: "pointer", color: "var(--dim)", fontSize: 16, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--dim)";
          }}
        >‹</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {clientes.map((c) => {
          const isSel = c.id === selectedId;
          const matCor = c.maturidade ? (MAT_COR_S[c.maturidade] ?? "var(--dim)") : "var(--dim)";
          return (
            <Link key={c.id} href={href(c.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
              borderRadius: 11, textDecoration: "none",
              background: isSel
                ? "color-mix(in srgb, var(--accent) 14%, var(--panel))"
                : "transparent",
              border: `1px solid ${isSel
                ? "color-mix(in srgb, var(--accent) 40%, transparent)"
                : "transparent"}`,
              transition: "background .12s, border-color .12s",
            }}
            onMouseEnter={(e) => {
              if (!isSel) (e.currentTarget as HTMLAnchorElement).style.background = "var(--panel-2)";
            }}
            onMouseLeave={(e) => {
              if (!isSel) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10.5, fontWeight: 800,
                background: isSel
                  ? "color-mix(in srgb, var(--accent) 25%, var(--panel-2))"
                  : "var(--panel-2)",
                color: isSel ? "var(--accent)" : "var(--dim)",
                border: `1.5px solid ${URG_COR[c.urgencia]}`,
                boxShadow: isSel ? `0 0 8px color-mix(in srgb, ${URG_COR[c.urgencia]} 40%, transparent)` : "none",
              }}>{ini(c.nome)}</span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: isSel ? 700 : 500,
                  color: isSel ? "var(--txt)" : "var(--mut)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{c.nome}</div>
                {c.maturidade && (
                  <div style={{ fontSize: 10.5, color: isSel ? matCor : "var(--dim)", marginTop: 1 }}>
                    {c.maturidade}
                  </div>
                )}
              </div>

              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: URG_COR[c.urgencia],
                boxShadow: `0 0 5px ${URG_COR[c.urgencia]}`,
              }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
