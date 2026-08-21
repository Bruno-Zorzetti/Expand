"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function toggleTema() {
  const r = document.documentElement;
  const next = r.getAttribute("data-theme") === "light" ? "dark" : "light";
  r.setAttribute("data-theme", next);
  try { localStorage.setItem("hx-theme", next); } catch { /* noop */ }
}

const NAV = [
  { href: "", label: "Visão Geral", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/contrato", label: "Meu Plano", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/aprovacoes", label: "Aprovações", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", badge: true },
  { href: "/historico", label: "Histórico", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/diagnosticos", label: "Diagnósticos", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/resultados", label: "Resultados", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
];

export default function ExpandClienteShell({
  clienteId,
  clienteNome,
  qtdPendentes,
  grupoLink,
  acoes,
  sino,
  children,
}: {
  clienteId: string;
  clienteNome: string;
  qtdPendentes?: number;
  grupoLink?: string | null;
  acoes?: ReactNode;
  sino?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const base = `/portal/${clienteId}`;
  const on = (href: string) => href === "" ? path === base : path.startsWith(base + href);
  const initials = clienteNome.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const sideStyle: React.CSSProperties = {
    width: 240, minWidth: 240, height: "100vh", position: "sticky", top: 0,
    display: "flex", flexDirection: "column", gap: 0,
    background: "var(--panel)", borderRight: "1px solid var(--line)",
    overflowY: "auto",
  };

  return (
    <div className="tema-expand" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Sidebar ── */}
      <aside style={sideStyle}>

        {/* Logo */}
        <div style={{ padding: "20px 18px 12px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                <path d="M32 19 L70 74" stroke="#08110E" strokeWidth="6" strokeLinecap="round" />
                <path d="M69 19 L38 63" stroke="#08110E" strokeWidth="6" strokeLinecap="round" />
                <path d="M52 53 H88" stroke="#08110E" strokeWidth="6" strokeLinecap="round" />
                <circle cx="34" cy="70" r="7" stroke="#08110E" strokeWidth="5" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 13, fontWeight: 600, letterSpacing: "2px", color: "var(--txt)" }}>EXPAND</div>
              <div style={{ fontSize: 8.5, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--accent)", fontWeight: 600 }}>Portal do cliente</div>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Projeto atual</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb, var(--accent) 18%, var(--panel-2))", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "var(--accent)", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clienteNome}</div>
              <div style={{ fontSize: 10, color: "var(--mut)", display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", flexShrink: 0 }} />
                PIDE Anual
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px 0" }}>
          {NAV.map((n) => {
            const active = on(n.href);
            return (
              <Link key={n.href} href={base + n.href} style={{
                display: "flex", alignItems: "center", gap: 9, padding: "9px 10px",
                borderRadius: 9, marginBottom: 2, textDecoration: "none",
                background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                color: active ? "var(--accent)" : "var(--mut)",
                fontWeight: active ? 700 : 500, fontSize: 13,
                transition: "background .15s, color .15s",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d={n.icon} />
                </svg>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && (qtdPendentes ?? 0) > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: "var(--accent)", color: "var(--bg)", borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>
                    {qtdPendentes}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Ajuda */}
        {grupoLink && (
          <div style={{ margin: "12px 10px", padding: "12px 13px", borderRadius: 11, background: "var(--panel-2)", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Precisa de ajuda?</div>
            <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 8 }}>Fale com seu time</div>
            <a href={grupoLink} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 8,
              background: "color-mix(in srgb, var(--green) 14%, transparent)", color: "var(--green)",
              textDecoration: "none", fontSize: 11.5, fontWeight: 700, border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Conversar no WhatsApp
            </a>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clienteNome}</div>
            <div style={{ fontSize: 10, color: "var(--mut)" }}>Cliente</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {sino}
            <button className="ex-iconbtn" onClick={toggleTema} title="Tema">
              <svg className="ex-ic" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        {children}
      </main>

      {acoes}
    </div>
  );
}
