import Link from "next/link";
import { redirect } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

type Doc = { slug: string; categoria: string; titulo: string; autor: string | null; resumo: string | null; tags: string[] | null; ordem: number };

export default async function ClienteBiblioteca() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cliente/biblioteca");

  // RLS entrega só os itens publicos para o cliente; filtramos por garantia.
  const { data } = await supabase.from("expand_biblioteca")
    .select("slug, categoria, titulo, autor, resumo, tags, ordem")
    .eq("publico", true).order("categoria").order("ordem");
  const docs = (data ?? []) as Doc[];
  const cats = Array.from(new Set(docs.map((d) => d.categoria)));

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <div className="ex-cwrap hx-ambient">
        <div className="ex-cmain">
          <Link href="/cliente" className="ex-back">← Voltar à minha área</Link>
          <p className="hx-eyebrow">Conhecimento aberto</p>
          <h1 className="ex-h1">A <span className="hx-accent-text">Biblioteca</span></h1>
          <p className="ex-sub">Materiais e guias práticos da Expand para você aplicar — posicionamento, bio, método. Sem enrolação, direto ao ponto. Vamos incrementando com o tempo.</p>

          {docs.length === 0 ? (
            <div className="hx-glass" style={{ padding: 24, borderRadius: 12, textAlign: "center", color: "var(--dim)", fontSize: 13 }}>Em breve novos materiais por aqui.</div>
          ) : cats.map((cat) => (
            <div key={cat} style={{ marginBottom: 22 }}>
              <div className="ex-grph"><span className="gt">{cat}</span><span className="gc">{docs.filter((d) => d.categoria === cat).length}</span><span className="gl" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {docs.filter((d) => d.categoria === cat).map((d) => (
                  <Link key={d.slug} href={`/cliente/biblioteca/${d.slug}`} className="hx-glass hx-glass-hover" style={{ display: "flex", flexDirection: "column", gap: 7, padding: "15px 16px", borderRadius: 12, textDecoration: "none", color: "inherit", borderTop: "3px solid var(--accent)" }}>
                    <span style={{ fontSize: 18 }}>📘</span>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{d.titulo}</div>
                    {d.autor ? <div style={{ fontSize: 11.5, color: "var(--accent)" }}>{d.autor}</div> : null}
                    {d.resumo ? <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.resumo}…</div> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <footer className="ex-foot"><span className="fb">EXPAND</span><span>Biblioteca · conhecimento aberto para você aplicar</span></footer>
      </div>
    </div>
  );
}
