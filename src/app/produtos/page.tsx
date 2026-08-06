import Link from "next/link";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/expand/PublicHeader";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });
export const dynamic = "force-dynamic";

type Product = {
  id: string; slug: string; name: string; tagline: string | null; category: string | null;
  price: number | null; preco_setup: number | null; preco_mensal: number | null;
  recorrente: boolean; delivery: string | null; popular: boolean;
};
function preco(p: Product): string {
  const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
  if (p.recorrente && p.preco_mensal) return `${brl(p.preco_mensal)}/mês`;
  if (p.price) return brl(Number(p.price));
  return p.delivery ?? "—";
}

export default async function Catalogo() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("active", true).order("sort_order");
  const produtos = (data ?? []) as Product[];

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <main className="hx-ambient" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", color: "var(--txt)" }}>
        <PublicHeader />
        <section style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 26px", width: "100%", flex: 1 }}>
          <p className="hx-eyebrow">Catálogo · {produtos.length} produtos</p>
          <h1 style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 40, fontWeight: 600, margin: "10px 0 8px" }}>Escolha seu próximo <span className="hx-accent-text">resultado</span></h1>
          <p style={{ color: "var(--mut)", maxWidth: 600, marginBottom: 26, fontSize: 14 }}>Serviços de IA prontos para uso, entregues em horas. Abra um produto para começar o briefing.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {produtos.map((p) => (
              <article key={p.id} className="hx-glass hx-glass-hover" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                  <span style={{ borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--panel-2)", padding: "3px 8px", fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", color: "var(--mut)" }}>{p.category}</span>
                  {p.popular ? <span style={{ borderRadius: 6, background: "color-mix(in srgb, var(--accent) 15%, transparent)", padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>Popular</span> : null}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</h3>
                <p style={{ marginTop: 4, flex: 1, fontSize: 13, color: "var(--mut)" }}>{p.tagline}</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div><p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", color: "var(--dim)" }}>Investimento</p><p style={{ fontSize: 19, fontWeight: 800, color: "var(--accent)" }}>{preco(p)}</p></div>
                  <Link href={`/produtos/${p.slug}`} className="hx-btn hx-btn-primary" style={{ fontSize: 13 }}>Começar</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <footer style={{ padding: "20px 26px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--dim)", textAlign: "center", fontFamily: "var(--font-cinzel), serif", letterSpacing: 2 }}>EXPAND</footer>
      </main>
    </div>
  );
}
