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

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
      <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" /></linearGradient></defs>
      <circle cx="50" cy="50" r="41" stroke="url(#pg)" strokeWidth="3.4" />
      <path d="M32 19 L70 74" stroke="url(#pg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M69 19 L38 63" stroke="url(#pg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 53 H88" stroke="url(#pg)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="34" cy="70" r="7" stroke="url(#pg)" strokeWidth="3.4" />
    </svg>
  );
}

export default function ExpandClienteShell({
  clienteId,
  clienteNome,
  children,
}: {
  clienteId: string;
  clienteNome: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const base = `/portal/${clienteId}`;
  const tabs = [
    { href: base, label: "Este Mês" },
    { href: `${base}/contrato`, label: "Meu PIDE" },
    { href: `${base}/aprovacoes`, label: "Aprovações" },
    { href: `${base}/resultados`, label: "Resultados" },
  ];
  const on = (href: string) => (href === base ? path === base : path.startsWith(href));

  return (
    <div className="ex-cwrap hx-ambient">
      <div className="ex-ctop">
        <Logo />
        <div><div className="ex-cbn">EXPAND</div><div className="ex-cbs">Portal do cliente</div></div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{clienteNome}</div>
            <div style={{ fontSize: 10.5, color: "var(--dim)" }}>Sua conta</div>
          </div>
          <button className="ex-iconbtn" onClick={toggleTema} title="Tema claro/escuro">
            <svg className="ex-ic" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
          </button>
        </div>
      </div>
      <div className="ex-ctabs">
        {tabs.map((t) => <Link key={t.href} href={t.href} className={`ex-ctab${on(t.href) ? " on" : ""}`}>{t.label}</Link>)}
      </div>
      <div className="ex-cmain">{children}</div>
      <footer className="ex-foot"><span className="fb">EXPAND</span><span>Portal do cliente · acompanhamento do seu PIDE</span></footer>
    </div>
  );
}
