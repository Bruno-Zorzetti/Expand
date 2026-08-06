import Link from "next/link";

export default function PublicHeader() {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 26px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--bg) 82%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <svg width="30" height="30" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
          <defs><linearGradient id="phg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" /></linearGradient></defs>
          <circle cx="50" cy="50" r="41" stroke="url(#phg)" strokeWidth="3.4" />
          <path d="M32 19 L70 74" stroke="url(#phg)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M69 19 L38 63" stroke="url(#phg)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M52 53 H88" stroke="url(#phg)" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="34" cy="70" r="7" stroke="url(#phg)" strokeWidth="3.4" />
        </svg>
        <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontWeight: 600, letterSpacing: 2, fontSize: 15, color: "var(--txt)" }}>EXPAND</span>
      </Link>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", fontSize: 13.5 }}>
        <Link href="/produtos" style={{ color: "var(--mut)", textDecoration: "none" }}>Produtos</Link>
        <Link href="/cliente" style={{ color: "var(--mut)", textDecoration: "none" }}>Área do cliente</Link>
        <Link href="/expand" style={{ color: "var(--mut)", textDecoration: "none" }}>Equipe</Link>
        <Link href="/login" className="hx-btn hx-btn-primary" style={{ padding: "7px 15px", fontSize: 13 }}>Entrar</Link>
      </nav>
    </header>
  );
}
