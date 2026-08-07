import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Doc = { slug: string; categoria: string; titulo: string; autor: string | null; resumo: string | null; publico: boolean; tags: string[] | null; ordem: number };

export default async function Biblioteca() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_biblioteca")
    .select("slug, categoria, titulo, autor, resumo, publico, tags, ordem")
    .order("categoria").order("ordem");
  const docs = (data ?? []) as Doc[];

  const cats = Array.from(new Set(docs.map((d) => d.categoria)));
  const publicos = docs.filter((d) => d.publico).length;

  return (
    <>
      <p className="hx-eyebrow">Conhecimento · equipe & clientes</p>
      <h1 className="ex-h1">A <span className="hx-accent-text">Biblioteca</span></h1>
      <p className="ex-sub">O acervo da Expand para a equipe aprender e para os clientes acessarem. Cada material é fonte de treino — dos agentes e das pessoas. Itens marcados como <b style={{ color: "var(--green)" }}>Público</b> aparecem também no painel do cliente; os demais são internos (IP da operação).</p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Materiais</div><div className="val hx-accent-text">{docs.length}</div><div className="foot">No acervo</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Categorias</div><div className="val">{cats.length}</div><div className="foot">Trilhas de conhecimento</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Visíveis ao cliente</div><div className="val">{publicos}</div><div className="foot">Marcados como público</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Base dos agentes</div><div className="val" style={{ fontSize: 15 }}>RAG vivo</div><div className="foot">Treina humanos e IA</div></div>
      </div>

      {docs.length === 0 ? (
        <div className="hx-glass" style={{ padding: 24, borderRadius: 12, textAlign: "center", color: "var(--dim)", fontSize: 13 }}>Acervo vazio ainda.</div>
      ) : cats.map((cat) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <div className="ex-grph"><span className="gt">{cat}</span><span className="gc">{docs.filter((d) => d.categoria === cat).length}</span><span className="gl" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {docs.filter((d) => d.categoria === cat).map((d) => (
              <Link key={d.slug} href={`/expand/biblioteca/${d.slug}`} className="hx-glass" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "15px 16px", borderRadius: 12, textDecoration: "none", borderTop: "3px solid var(--accent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📘</span>
                  {d.publico ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)", color: "var(--green)", marginLeft: "auto" }}>Público</span> : <span className="ex-pill" style={{ background: "var(--panel-2)", color: "var(--dim)", marginLeft: "auto" }}>Interno</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", lineHeight: 1.3 }}>{d.titulo}</div>
                {d.autor ? <div style={{ fontSize: 11.5, color: "var(--accent)" }}>{d.autor}</div> : null}
                {d.resumo ? <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.resumo}…</div> : null}
                {d.tags?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>{d.tags.slice(0, 4).map((t) => <span key={t} style={{ fontSize: 10, color: "var(--dim)", background: "var(--panel-2)", borderRadius: 6, padding: "2px 7px" }}>{t}</span>)}</div> : null}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
