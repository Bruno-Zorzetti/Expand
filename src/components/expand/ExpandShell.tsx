"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Pessoa = { id: string; nome: string; papel: string; ini: string };

type NavItem = { href: string; label: string; icon: string; eyebrow: string; badge?: number };
const NAV: { sec: string; items: NavItem[] }[] = [
  {
    sec: "Operação",
    items: [
      { href: "/expand", label: "Meu Dia", icon: "grid", eyebrow: "Operação · PIDE", badge: 5 },
      { href: "/expand/gestao", label: "Gestão", icon: "kanban", eyebrow: "Painel Monday · tudo" },
      { href: "/expand/carteira", label: "Carteira", icon: "folder", eyebrow: "Visão geral" },
      { href: "/expand/equipe", label: "Equipe & Agentes", icon: "idcard", eyebrow: "Time único · humanos + IA" },
      { href: "/expand/organograma", label: "Organograma", icon: "tree", eyebrow: "Estrutura do time" },
      { href: "/expand/squads", label: "Squads", icon: "squad", eyebrow: "Time por projeto" },
      { href: "/expand/produtos", label: "Produtos", icon: "box", eyebrow: "Catálogo Hashes" },
      { href: "/expand/perfis", label: "Perfis de Cliente", icon: "users", eyebrow: "Dossiê comportamental" },
    ],
  },
  {
    sec: "Processo",
    items: [
      { href: "/expand/board", label: "Board de Entrega", icon: "layers", eyebrow: "Estado da conta" },
      { href: "/expand/fluxo", label: "Fluxograma", icon: "branch", eyebrow: "46 etapas" },
      { href: "/expand/contrato", label: "Linha do Contrato", icon: "calendar", eyebrow: "12 meses" },
      { href: "/expand/ritmo", label: "Ritmo e Governança", icon: "activity", eyebrow: "Rituais e SLA" },
    ],
  },
  {
    sec: "Comercial",
    items: [
      { href: "/expand/comercial", label: "Cockpit", icon: "target", eyebrow: "Comercial · Hoje" },
      { href: "/expand/comercial/playbook", label: "Playbook 3F", icon: "book", eyebrow: "Método 3F" },
      { href: "/expand/comercial/funis", label: "Funis", icon: "filter", eyebrow: "Prospecção" },
      { href: "/expand/comercial/objecoes", label: "Objeções", icon: "shield", eyebrow: "Contorno" },
    ],
  },
  {
    sec: "Sistema",
    items: [
      { href: "/expand/roadmap", label: "Roadmap", icon: "map", eyebrow: "Entregas & prazos" },
      { href: "/expand/integracoes", label: "Integrações", icon: "plug", eyebrow: "Conexões" },
      { href: "/expand/estilo", label: "Estilo", icon: "brush", eyebrow: "Design System" },
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
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    menu: <path d="M3 12h18M3 6h18M3 18h18" />,
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
  children,
}: {
  pessoa: Pessoa;
  equipe: Pessoa[];
  podeTrocar: boolean;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  function trocarPessoa(id: string) {
    document.cookie = `expand_pessoa=${id}; path=/; max-age=31536000`;
    router.refresh();
  }
  const all = NAV.flatMap((s) => s.items);
  const active =
    [...all].sort((a, b) => b.href.length - a.href.length).find((i) =>
      i.href === "/expand" ? path === "/expand" : path.startsWith(i.href),
    ) ?? all[0];

  return (
    <div className="ex-shell hx-ambient">
      <div className="ex-scrim" onClick={toggleNav} />

      <aside className="ex-side">
        <div className="ex-brand">
          <Logo />
          <div><div className="ex-bn">EXPAND</div><div className="ex-bs">Motor de Trabalho</div></div>
        </div>
        {NAV.map((s) => (
          <div key={s.sec}>
            <div className="ex-navsec">{s.sec}</div>
            {s.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => document.body.classList.remove("ex-nav-open")}
                className={`ex-navi${it.href === active.href ? " on" : ""}`}
              >
                <Ic name={it.icon} />
                {it.label}
                {it.badge ? <span className="ex-badge">{it.badge}</span> : null}
              </Link>
            ))}
          </div>
        ))}
        <div className="ex-usr">
          <div className="ex-uav">{pessoa.ini}</div>
          <div><div className="ex-un">{pessoa.nome}</div><div className="ex-ur">{pessoa.papel}</div></div>
        </div>
      </aside>

      <div className="ex-wrap">
        <div className="ex-topbar">
          <button className="ex-burger" onClick={toggleNav} aria-label="Menu"><Ic name="menu" /></button>
          <div className="ex-tbtt"><small>{active.eyebrow}</small>{active.label}</div>
          <div className="ex-search">
            <Ic name="search" />
            <input placeholder="Buscar conta, etapa, pessoa…" />
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
            <button className="ex-iconbtn" title="Notificações"><Ic name="bell" /></button>
            <div className="ex-tbav">{pessoa.ini}</div>
          </div>
        </div>

        <main className="ex-main">{children}</main>

        <footer className="ex-foot">
          <span className="fb">EXPAND</span>
          <span>Motor de Trabalho · Grupo Expand · dados da operação em tempo real</span>
        </footer>
      </div>

      <button className="ex-fab" title="Nova ação">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0A1512" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
