"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import AssistentesDock from "@/components/expand/AssistentesDock";
import Notificacoes, { type Notif } from "@/components/expand/Notificacoes";

type Pessoa = { id: string; nome: string; papel: string; ini: string };
type Sub = { href: string; label: string; external?: boolean };
type NavItem = {
  href: string; label: string; icon: string; eyebrow: string;
  badge?: number; external?: boolean; gate?: "admin" | "comercial"; sub?: Sub[];
};
type NavSec = { id: string; sec: string; items: NavItem[] };

const NAV: NavSec[] = [
  {
    id: "operacao",
    sec: "Operação & Atividades",
    items: [
      { href: "/expand", label: "Hub do Dia", icon: "grid", eyebrow: "Suas tarefas hoje" },
      { href: "/expand/planejamento", label: "Calendário", icon: "calendar", eyebrow: "Agenda e planejamento" },
      { href: "/expand/plano", label: "Plano de Ação", icon: "list", eyebrow: "Reunião de líderes" },
      { href: "/expand/board", label: "Board de Atividades", icon: "kanban", eyebrow: "Estado das contas" },
      { href: "/expand/ritmo", label: "Rituais & SLA", icon: "activity", eyebrow: "Cadência da operação" },
    ],
  },
  {
    id: "produtos",
    sec: "Produtos & Equipe",
    items: [
      { href: "/expand/produtos", label: "Produtos", icon: "box", eyebrow: "Catálogo e processos" },
      { href: "/expand/carteira", label: "Clientes", icon: "folder", eyebrow: "Carteira e dossiês" },
      {
        href: "/expand/equipe", label: "Time & Agentes", icon: "idcard", eyebrow: "Humanos + IA",
        sub: [
          { href: "/expand/organograma", label: "Organograma" },
          { href: "/expand/squads", label: "Squads" },
        ],
      },
    ],
  },
  {
    id: "ferramentas",
    sec: "Ferramentas & Conhecimento",
    items: [
      {
        href: "/expand/biblioteca", label: "Conhecimento", icon: "library", eyebrow: "Metodologia Expand",
        sub: [
          { href: "/expand/comercial/playbook", label: "Playbook 3F" },
          { href: "/expand/comercial/funis", label: "Funis de Vendas" },
          { href: "/expand/comercial/objecoes", label: "Contorno de Objeções" },
        ],
      },
      { href: "/expand/apresentacoes", label: "Apresentações", icon: "slides", eyebrow: "Editor de decks" },
      {
        href: "/expand/ferramentas", label: "Ferramentas", icon: "tool", eyebrow: "Utilitários da operação",
        gate: "admin",
        sub: [
          { href: "/expand/ferramentas/grupo", label: "Criar grupo WA" },
          { href: "/expand/apresentacoes", label: "Criar slides" },
        ],
      },
    ],
  },
  {
    id: "comercial",
    sec: "Comercial",
    items: [
      { href: "/expand/comercial/pipeline", label: "Funil CRM", icon: "filter", eyebrow: "Pipeline de vendas", gate: "comercial" },
      { href: "/expand/comercial", label: "Hoje · Placar", icon: "target", eyebrow: "Gamificação diária", gate: "comercial" },
      { href: "/expand/comercial/meta", label: "A Meta", icon: "coin", eyebrow: "Calculadora de vendas", gate: "comercial" },
      { href: "/expand/comercial/semana", label: "A Semana", icon: "squad", eyebrow: "Placar Luiz × Pedro", gate: "comercial" },
      { href: "/expand/comercial/guia", label: "O Guia", icon: "book", eyebrow: "Como usar o sistema", gate: "comercial" },
    ],
  },
  {
    id: "financeiro",
    sec: "Financeiro",
    items: [
      { href: "/expand/financas", label: "Finanças", icon: "bars", eyebrow: "DRE & valuation", gate: "admin" },
      { href: "/expand/roadmap", label: "Roadmap", icon: "map", eyebrow: "Entregas & prazos", gate: "admin" },
    ],
  },
  {
    id: "config",
    sec: "Configurações",
    items: [
      { href: "/expand/empresa", label: "Empresa", icon: "building", eyebrow: "Identidade & marca", gate: "admin" },
      { href: "/expand/acessos", label: "Acessos", icon: "lock", eyebrow: "Aprovações & papéis", gate: "admin" },
      { href: "/expand/rbac", label: "Permissões RBAC", icon: "shield", eyebrow: "Matriz de acessos", gate: "admin" },
      { href: "/expand/integracoes", label: "Integrações", icon: "plug", eyebrow: "Conexões", gate: "admin" },
      { href: "/expand/rotinas", label: "Rotinas", icon: "zap", eyebrow: "Automações & tokens", gate: "admin" },
      { href: "/expand/gestao", label: "Visão Geral", icon: "layers", eyebrow: "Painel administrativo", gate: "admin" },
      { href: "/expand/log", label: "Log", icon: "list", eyebrow: "Auditoria do sistema", gate: "admin" },
      { href: "/expand/estilo", label: "Estilo", icon: "brush", eyebrow: "Design System", gate: "admin" },
    ],
  },
];

function Ic({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    folder: <><path d="M3 7h18v13H3z" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    zap: <path d="M13 2 3 14h7l-1 8 10-12h-7z" />,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>,
    layers: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></>,
    branch: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M6 9v6M20 6h-6a4 4 0 0 0-4 4v8" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5z" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    brush: <><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" /></>,
    plug: <><path d="M12 22v-5" /><path d="M9 8V2M15 8V2" /><path d="M7 8h10v4a5 5 0 0 1-10 0z" /></>,
    map: <><path d="M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3z" /><path d="M9 7v13M15 4v13" /></>,
    idcard: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M13 9h5M13 13h5M5.5 16c.5-1.4 1.9-2 3.5-2s3 .6 3.5 2" /></>,
    tree: <><circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M12 7v3M6 17v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M12 10v3" /></>,
    squad: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.2" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M15.6 20c0-1.8.7-3 1.9-3.6" /></>,
    kanban: <><rect x="3" y="3" width="6" height="18" rx="1.5" /><rect x="10.5" y="3" width="6" height="12" rx="1.5" /><rect x="18" y="3" width="3" height="8" rx="1.5" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.2" /><circle cx="3.5" cy="12" r="1.2" /><circle cx="3.5" cy="18" r="1.2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    menu: <path d="M3 12h18M3 6h18M3 18h18" />,
    coin: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2a3 3 0 0 1-3-1.5M12 6.5v11" /></>,
    library: <><path d="M12 6.5C10.5 5 8 4.5 4 4.8v13C8 17.5 10.5 18 12 19.3M12 6.5C13.5 5 16 4.5 20 4.8v13C16 17.5 13.5 18 12 19.3M12 6.5v12.8" /></>,
    slides: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8" /></>,
    lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-2.3z" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    chevdown: <path d="M6 9l6 6 6-6" />,
    building: <><rect x="3" y="9" width="18" height="13" rx="1.5" /><path d="M3 9l9-6 9 6" /><rect x="9" y="15" width="6" height="7" /></>,
    bars: <><rect x="3" y="3" width="18" height="4" rx="1.5" /><rect x="3" y="10" width="13" height="4" rx="1.5" /><rect x="3" y="17" width="9" height="4" rx="1.5" /></>,
    grip: <><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>,
  };
  return <svg className="ex-ic" viewBox="0 0 24 24">{paths[name]}</svg>;
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="exg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="41" stroke="url(#exg)" strokeWidth="3.4" />
      <path d="M32 19 L70 74" stroke="url(#exg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M69 19 L38 63" stroke="url(#exg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 53 H88" stroke="url(#exg)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="34" cy="70" r="7" stroke="url(#exg)" strokeWidth="3.4" />
    </svg>
  );
}

function toggleTema() {
  const r = document.documentElement;
  const next = r.getAttribute("data-theme") === "light" ? "dark" : "light";
  r.setAttribute("data-theme", next);
  try { localStorage.setItem("hx-theme", next); } catch { /* noop */ }
}
function toggleNav() {
  document.body.classList.toggle("ex-nav-open");
}

export default function ExpandShell({
  pessoa,
  equipe,
  podeTrocar,
  isAdmin = false,
  acessos = [],
  notif = [],
  marcarLida,
  marcarTodas,
  children,
}: {
  pessoa: Pessoa;
  equipe: Pessoa[];
  podeTrocar: boolean;
  isAdmin?: boolean;
  acessos?: string[];
  notif?: Notif[];
  marcarLida?: (fd: FormData) => Promise<void>;
  marcarTodas?: () => Promise<void>;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  // sub-item open state (in-session)
  const [aberto, setAberto] = useState<Record<string, boolean>>({});

  // section collapsed state (persisted)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // per-section item order (persisted; values are ordered href arrays)
  const [order, setOrder] = useState<Record<string, string[]>>({});

  // drag state
  const dragRef = useRef<{ sec: string; fromIdx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sec: string; idx: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (e.key === "Escape" && document.activeElement === searchRef.current) searchRef.current?.blur();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("ex-nav-collapsed") ?? "{}");
      const o = JSON.parse(localStorage.getItem("ex-nav-order") ?? "{}");
      setCollapsed(c);
      setOrder(o);
    } catch { /* noop */ }
  }, []);

  function trocarPessoa(id: string) {
    document.cookie = `expand_pessoa=${id}; path=/; max-age=31536000`;
    router.refresh();
  }

  function podeVer(it: NavItem) {
    return !it.gate || (it.gate === "admin" ? isAdmin : isAdmin || acessos.includes(it.gate));
  }

  function toggleSection(id: string) {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("ex-nav-collapsed", JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }

  function getDisplayedItems(sec: NavSec): NavItem[] {
    const filtered = sec.items.filter(podeVer);
    const ord = order[sec.id];
    if (!ord?.length) return filtered;
    const byHref = new Map(filtered.map(i => [i.href, i]));
    const sorted = ord.map(h => byHref.get(h)).filter(Boolean) as NavItem[];
    const rest = filtered.filter(i => !ord.includes(i.href));
    return [...sorted, ...rest];
  }

  function handleDragStart(e: React.DragEvent, secId: string, idx: number) {
    dragRef.current = { sec: secId, fromIdx: idx };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
  }

  function handleDragOver(e: React.DragEvent, secId: string, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ sec: secId, idx });
  }

  function handleDrop(e: React.DragEvent, secId: string, toIdx: number) {
    e.preventDefault();
    const dr = dragRef.current;
    if (!dr || dr.sec !== secId || dr.fromIdx === toIdx) { setDropTarget(null); return; }

    setOrder(prev => {
      const sec = NAV.find(s => s.id === secId)!;
      const displayed = getDisplayedItemsForSec(sec, prev);
      const hrefs = displayed.map(i => i.href);
      const [moved] = hrefs.splice(dr.fromIdx, 1);
      hrefs.splice(toIdx, 0, moved);
      const next = { ...prev, [secId]: hrefs };
      try { localStorage.setItem("ex-nav-order", JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });

    dragRef.current = null;
    setDropTarget(null);
  }

  // stable helper (without closure over state) to avoid stale closure in handleDrop
  function getDisplayedItemsForSec(sec: NavSec, ord: Record<string, string[]>): NavItem[] {
    const filtered = sec.items.filter(podeVer);
    const savedOrd = ord[sec.id];
    if (!savedOrd?.length) return filtered;
    const byHref = new Map(filtered.map(i => [i.href, i]));
    const sorted = savedOrd.map(h => byHref.get(h)).filter(Boolean) as NavItem[];
    const rest = filtered.filter(i => !savedOrd.includes(i.href));
    return [...sorted, ...rest];
  }

  // active item detection (longest-prefix wins)
  const activeHref = (() => {
    const all = NAV.flatMap(s => s.items.flatMap(i => [
      i.href,
      ...(i.sub ?? []).map(sub => sub.href),
    ]));
    return [...all]
      .sort((a, b) => b.length - a.length)
      .find(h => h === "/expand" ? path === "/expand" : path.startsWith(h)) ?? "/expand";
  })();

  const activeInfo = (() => {
    for (const s of NAV) {
      for (const item of s.items) {
        for (const sub of item.sub ?? []) {
          if (sub.href === activeHref) return { label: sub.label, eyebrow: item.eyebrow };
        }
        if (item.href === activeHref) return { label: item.label, eyebrow: item.eyebrow };
      }
    }
    return { label: "Hub do Dia", eyebrow: "Suas tarefas hoje" };
  })();

  return (
    <div className="ex-shell hx-ambient">
      <div className="ex-scrim" onClick={toggleNav} />

      <aside className="ex-side">
        <div className="ex-brand">
          <Logo />
          <div><div className="ex-bn">EXPAND</div><div className="ex-bs">Motor de Trabalho</div></div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {NAV.map((s) => {
            const items = getDisplayedItems(s);
            if (!items.length) return null;
            const isCollapsed = !!collapsed[s.id];

            return (
              <div key={s.id}>
                {/* Section header — clickable to collapse */}
                <button
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className="ex-navsec-hd"
                >
                  <span>{s.sec}</span>
                  <span style={{ transition: "transform .2s", transform: isCollapsed ? "rotate(-90deg)" : "none", display: "inline-flex" }}>
                    <Ic name="chevdown" />
                  </span>
                </button>

                {!isCollapsed && items.map((it, idx) => {
                  const isActive = it.href === activeHref || (it.sub ?? []).some(s => s.href === activeHref);
                  const hasOpenSub = aberto[it.href] ?? (it.sub ?? []).some(s => path.startsWith(s.href));

                  if (it.sub?.length) {
                    return (
                      <div
                        key={it.href}
                        className={`ex-navi-row${dropTarget?.sec === s.id && dropTarget?.idx === idx ? " drop-active" : ""}`}
                        onDragOver={(e) => handleDragOver(e, s.id, idx)}
                        onDrop={(e) => handleDrop(e, s.id, idx)}
                        onDragLeave={() => setDropTarget(null)}
                      >
                        <span
                          className="ex-grip"
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, s.id, idx); }}
                          onDragEnd={() => { setDropTarget(null); dragRef.current = null; }}
                        >
                          <Ic name="grip" />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={() => setAberto(a => ({ ...a, [it.href]: !hasOpenSub }))}
                            className={`ex-navi${isActive ? " on" : ""}`}
                            style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", margin: 0 }}
                          >
                            <Ic name={it.icon} />
                            {it.label}
                            <span style={{ marginLeft: "auto", display: "inline-flex", transform: hasOpenSub ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                              <Ic name="chevron" />
                            </span>
                          </button>
                          {hasOpenSub && it.sub!.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              {...(sub.external ? { target: "_blank", rel: "noreferrer" } : {})}
                              onClick={() => document.body.classList.remove("ex-nav-open")}
                              className={`ex-navi${sub.href === activeHref ? " on" : ""}`}
                              style={{ paddingLeft: 40, fontSize: 12.5, margin: 0 }}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return it.external ? (
                    <div key={it.href} className={`ex-navi-row${dropTarget?.sec === s.id && dropTarget?.idx === idx ? " drop-active" : ""}`}
                      onDragOver={(e) => handleDragOver(e, s.id, idx)}
                      onDrop={(e) => handleDrop(e, s.id, idx)}
                      onDragLeave={() => setDropTarget(null)}
                    >
                      <span className="ex-grip" draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, s.id, idx); }} onDragEnd={() => { setDropTarget(null); dragRef.current = null; }}>
                        <Ic name="grip" />
                      </span>
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => document.body.classList.remove("ex-nav-open")}
                        className="ex-navi"
                        style={{ flex: 1, margin: 0 }}
                      >
                        <Ic name={it.icon} />
                        {it.label}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>↗</span>
                      </a>
                    </div>
                  ) : (
                    <div key={it.href} className={`ex-navi-row${dropTarget?.sec === s.id && dropTarget?.idx === idx ? " drop-active" : ""}`}
                      onDragOver={(e) => handleDragOver(e, s.id, idx)}
                      onDrop={(e) => handleDrop(e, s.id, idx)}
                      onDragLeave={() => setDropTarget(null)}
                    >
                      <span className="ex-grip" draggable onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, s.id, idx); }} onDragEnd={() => { setDropTarget(null); dragRef.current = null; }}>
                        <Ic name="grip" />
                      </span>
                      <Link
                        href={it.href}
                        onClick={() => document.body.classList.remove("ex-nav-open")}
                        className={`ex-navi${isActive ? " on" : ""}`}
                        style={{ flex: 1, margin: 0 }}
                      >
                        <Ic name={it.icon} />
                        {it.label}
                        {it.badge ? <span className="ex-badge">{it.badge}</span> : null}
                      </Link>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="ex-usr">
          <div className="ex-uav">{pessoa.ini}</div>
          <div><div className="ex-un">{pessoa.nome}</div><div className="ex-ur">{pessoa.papel}</div></div>
        </div>
      </aside>

      <div className="ex-wrap">
        <div className="ex-topbar">
          <button className="ex-burger" onClick={toggleNav} aria-label="Menu"><Ic name="menu" /></button>
          <div className="ex-tbtt"><small>{activeInfo.eyebrow}</small>{activeInfo.label}</div>
          <div className="ex-search">
            <Ic name="search" />
            <input ref={searchRef} placeholder="Buscar conta, etapa, pessoa…" style={{ flex: 1, minWidth: 0, width: "auto" }} />
            <kbd style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "var(--panel-2)", border: "1px solid var(--line-2)", color: "var(--dim)", pointerEvents: "none", flexShrink: 0 }}>Ctrl K</kbd>
          </div>
          <div className="ex-tbr">
            {podeTrocar ? (
              <select
                className="ex-vercomo"
                value={pessoa.id}
                onChange={(e) => trocarPessoa(e.target.value)}
                title="Ver o dia de outra pessoa da equipe"
              >
                {equipe.map((p) => <option key={p.id} value={p.id}>Ver como {p.nome}</option>)}
              </select>
            ) : null}
            <button className="ex-iconbtn" onClick={toggleTema} title="Tema claro/escuro"><Ic name="moon" /></button>
            {marcarLida && marcarTodas
              ? <Notificacoes notas={notif} marcarLida={marcarLida} marcarTodas={marcarTodas} />
              : <button className="ex-iconbtn" title="Notificações"><Ic name="bell" /></button>}
            <div className="ex-tbav">{pessoa.ini}</div>
          </div>
        </div>

        <main className="ex-main">{children}</main>

        <footer className="ex-foot">
          <span className="fb">EXPAND</span>
          <span>Motor de Trabalho · Grupo Expand · dados da operação em tempo real</span>
        </footer>
      </div>

      <AssistentesDock pessoaId={pessoa.id} pessoaNome={pessoa.nome} />
    </div>
  );
}
