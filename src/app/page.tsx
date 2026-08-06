import Link from "next/link";
import { Cinzel } from "next/font/google";
import Icon from "@/components/Icon";
import PublicHeader from "@/components/expand/PublicHeader";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

export default function Home() {
  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <main className="hx-ambient" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", color: "var(--txt)" }}>
        <PublicHeader />
        <section style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 26px", textAlign: "center", flex: 1, width: "100%" }}>
          <p className="hx-eyebrow">Marketing e tecnologia · a IA executa</p>
          <h1 style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 54, fontWeight: 600, letterSpacing: 1, margin: "14px 0 12px", lineHeight: 1.05 }}>Grupo <span className="hx-accent-text">Expand</span></h1>
          <p style={{ color: "var(--mut)", maxWidth: 560, margin: "0 auto", fontSize: 15 }}>Você preenche o briefing, a IA produz, a equipe cuida e você aprova cada etapa. Escolha por onde entrar.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, maxWidth: 720, margin: "40px auto 0" }}>
            <Link href="/cliente" className="hx-glass hx-glass-hover" style={{ padding: 26, textDecoration: "none", color: "inherit", textAlign: "left" }}>
              <span className="hx-icon-tile" style={{ width: 48, height: 48, display: "inline-flex", marginBottom: 14 }}><Icon name="users" size={24} /></span>
              <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 20, fontWeight: 600 }}>Área do cliente</div>
              <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 6 }}>Acompanhe seu projeto, aprove as entregas e veja os resultados.</p>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, marginTop: 12, display: "inline-block" }}>Entrar →</span>
            </Link>
            <Link href="/expand" className="hx-glass hx-glass-hover" style={{ padding: 26, textDecoration: "none", color: "inherit", textAlign: "left" }}>
              <span className="hx-icon-tile" style={{ width: 48, height: 48, display: "inline-flex", marginBottom: 14 }}><Icon name="briefcase" size={24} /></span>
              <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 20, fontWeight: 600 }}>Equipe</div>
              <p style={{ color: "var(--mut)", fontSize: 13, marginTop: 6 }}>O sistema operacional da Expand: seu dia, a carteira e a entrega.</p>
              <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, marginTop: 12, display: "inline-block" }}>Entrar →</span>
            </Link>
          </div>
          <div style={{ marginTop: 28 }}><Link href="/produtos" className="hx-btn hx-btn-ghost">Ver o catálogo de produtos</Link></div>
        </section>
        <footer style={{ padding: "20px 26px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--dim)", textAlign: "center", fontFamily: "var(--font-cinzel), serif", letterSpacing: 2 }}>EXPAND</footer>
      </main>
    </div>
  );
}
