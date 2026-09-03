"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type User = { id: string; nome: string; papel: string; ini: string; role: string };
type NavItem = { href: string; label: string; icon: string };
type NavSec = { id: string; sec: string; items: NavItem[] };

const NAV: NavSec[] = [
  {
    id: "operacao",
    sec: "Operação",
    items: [
      { href: "/expand/2026",            label: "Meu Dia",    icon: "grid" },
      { href: "/expand/planejamento",    label: "Calendário", icon: "calendar" },
    ],
  },
  {
    id: "projetos",
    sec: "Projetos",
    items: [
      { href: "/expand/2026/clientes",   label: "Clientes",    icon: "folder" },
      { href: "/expand/2026/tarefas",    label: "Tarefas",     icon: "kanban" },
      { href: "/expand/produtos",        label: "Produtos",    icon: "box" },
      { href: "/expand/equipe/humanos",  label: "Equipe",      icon: "users" },
      { href: "/expand/equipe/agentes",  label: "Agentes IA",  icon: "zap" },
    ],
  },
  {
    id: "comercial",
    sec: "Comercial",
    items: [
      { href: "/expand/comercial",           label: "Dashboard", icon: "bars" },
      { href: "/expand/comercial/pipeline",  label: "Funil",     icon: "filter" },
      { href: "/expand/comercial/placar",    label: "Placar",    icon: "target" },
      { href: "/expand/comercial/meta",      label: "Meta",      icon: "coin" },
    ],
  },
  {
    id: "ferramentas",
    sec: "Ferramentas",
    items: [
      { href: "/expand/ferramentas/capas", label: "Ebook Studio",   icon: "book" },
      { href: "/expand/ferramentas",       label: "Doc Studio",      icon: "slides" },
      { href: "/expand/ferramentas",       label: "Ver todas",       icon: "tool" },
    ],
  },
  {
    id: "config",
    sec: "Configurações",
    items: [
      { href: "/expand/acessos",  label: "Acessos",          icon: "shield" },
      { href: "/expand/empresa",  label: "Empresas",         icon: "building" },
      { href: "/expand/integracoes", label: "Integrações",   icon: "plug" },
      { href: "/expand/estilo",   label: "Folha de Estilo",  icon: "brush" },
    ],
  },
];

function Ic({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    folder:   <><path d="M3 7h18v13H3z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    zap:      <path d="M13 2 3 14h7l-1 8 10-12h-7z"/>,
    users:    <><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    target:   <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    book:     <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    filter:   <path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>,
    shield:   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    brush:    <><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></>,
    box:      <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></>,
    plug:     <><path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M7 8h10v4a5 5 0 0 1-10 0z"/></>,
    bars:     <><rect x="3" y="3" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="13" height="4" rx="1.5"/><rect x="3" y="17" width="9" height="4" rx="1.5"/></>,
    coin:     <><circle cx="12" cy="12" r="9"/><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-3-1.5M12 6.5v11"/></>,
    kanban:   <><rect x="3" y="3" width="6" height="18" rx="1.5"/><rect x="10.5" y="3" width="6" height="12" rx="1.5"/><rect x="18" y="3" width="3" height="8" rx="1.5"/></>,
    tool:     <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-2.3z"/>,
    building: <><rect x="3" y="9" width="18" height="13" rx="1.5"/><path d="M3 9l9-6 9 6"/><rect x="9" y="15" width="6" height="7"/></>,
    slides:   <><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/></>,
    moon:     <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>,
    sun:      <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    menu:     <path d="M3 12h18M3 6h18M3 18h18"/>,
    x:        <path d="M18 6 6 18M6 6l12 12"/>,
    logout:   <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 16, height: 16, flexShrink: 0 }}>
      {paths[name] ?? null}
    </svg>
  );
}

export default function ExpandShell2026({ user, children }: { user: User; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setDark(next === "dark");
    try { localStorage.setItem("hx-theme", next); } catch { /* noop */ }
  }

  async function sair() {
    const sb = createClient();
    await sb.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <div className="tema-expand" style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--txt)" }}>
      {/* Overlay mobile */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 49 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 220, background: "var(--bg-2)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : undefined,
        transition: "transform .22s ease",
      }}
        className="ex26-sidebar">
        {/* Header */}
        <div style={{ padding: "16px 14px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line)" }}>
          <img src="/midia/expand-icone-cream.png" width={28} height={28} alt="Expand" style={{ flexShrink: 0, objectFit: "contain" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".06em", color: "var(--txt)" }}>EXPAND</div>
            <div style={{ fontSize: 9.5, color: "var(--dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>Motor de Trabalho</div>
          </div>
          <button onClick={() => setOpen(false)} className="ex26-close-btn"
            style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 4 }}>
            <Ic name="x" />
          </button>
        </div>

        {/* Nav sections */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0 8px" }}>
          {NAV.map((sec) => (
            <div key={sec.id} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--dim)", padding: "6px 14px 2px" }}>
                {sec.sec}
              </div>
              {sec.items.map((item) => {
                const active = path === item.href || (item.href !== "/expand/2026" && path.startsWith(item.href));
                return (
                  <Link key={item.href + item.label} href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "7px 14px", fontSize: 13, textDecoration: "none",
                      color: active ? "var(--accent)" : "var(--txt)",
                      background: active ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                      borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                      transition: "background .15s, color .15s",
                      fontWeight: active ? 600 : 400,
                    }}>
                    <Ic name={item.icon} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: user + actions */}
        <div style={{ borderTop: "1px solid var(--line)", padding: "10px 14px" }}>
          <Link href="/expand/perfil" onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--txt)", marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--accent)", color: "#fff",
              display: "grid", placeItems: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {user.ini}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nome}</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.papel}</div>
            </div>
          </Link>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={toggleTheme}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 0",
                background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 7,
                color: "var(--dim)", cursor: "pointer", fontSize: 11 }}>
              <Ic name={dark ? "sun" : "moon"} />
            </button>
            <button onClick={sair}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 0",
                background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 7,
                color: "var(--dim)", cursor: "pointer", fontSize: 11 }}>
              <Ic name="logout" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }} className="ex26-main">
        {/* Topbar (mobile) */}
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          display: "flex", alignItems: "center", gap: 12,
          padding: "0 16px", height: 52,
          background: "var(--bg)", borderBottom: "1px solid var(--line)",
        }} className="ex26-topbar">
          <button onClick={() => setOpen(true)}
            style={{ background: "none", border: "none", color: "var(--txt)", cursor: "pointer", padding: 4, display: "flex" }}>
            <Ic name="menu" />
          </button>
          <img src="/midia/expand-icone-cream.png" width={22} height={22} alt="Expand" style={{ objectFit: "contain" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em" }}>EXPAND</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--dim)" }}>{user.nome}</span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px 28px", maxWidth: "100%" }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .ex26-sidebar { transform: translateX(0) !important; position: relative !important; flex-shrink: 0; }
          .ex26-topbar  { display: none !important; }
          .ex26-close-btn { display: none !important; }
          .ex26-main    { margin-left: 0; }
        }
        @media (max-width: 859px) {
          .ex26-sidebar { transform: translateX(-100%); }
        }
        .ex26-sidebar a:hover { background: color-mix(in srgb, var(--accent) 6%, transparent) !important; }
      `}</style>
    </div>
  );
}
