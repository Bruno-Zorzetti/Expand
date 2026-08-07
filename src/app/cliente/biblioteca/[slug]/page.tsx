import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/md";

export const dynamic = "force-dynamic";
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

type Doc = { slug: string; categoria: string; titulo: string; autor: string | null; conteudo: string | null; publico: boolean };

export default async function ClienteDocReader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/cliente/biblioteca/${slug}`);

  // só documentos públicos são acessíveis ao cliente (RLS + filtro explícito).
  const { data } = await supabase.from("expand_biblioteca").select("*").eq("slug", slug).eq("publico", true).maybeSingle();
  if (!data) notFound();
  const d = data as Doc;
  const html = renderMarkdown(d.conteudo ?? "");

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <div className="ex-cwrap hx-ambient">
        <div className="ex-cmain">
          <Link href="/cliente/biblioteca" className="ex-back">← Voltar à Biblioteca</Link>

          <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: 8, background: "linear-gradient(90deg, var(--accent), var(--dourado))" }} />
            <div style={{ padding: "18px 22px" }}>
              <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>{d.categoria}</span>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginTop: 8 }}>{d.titulo}</h1>
              {d.autor ? <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{d.autor}</p> : null}
            </div>
          </div>

          <div className="ex-panel hx-glass biblio-doc" style={{ padding: "22px 26px" }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
        <footer className="ex-foot"><span className="fb">EXPAND</span><span>Biblioteca · conhecimento aberto para você aplicar</span></footer>
      </div>

      <style>{`
        .biblio-doc h2{font-family:var(--serif);font-size:20px;font-weight:600;margin:22px 0 8px;color:var(--txt);border-bottom:1px solid var(--line);padding-bottom:6px}
        .biblio-doc h3{font-size:15.5px;font-weight:700;margin:18px 0 6px;color:var(--accent)}
        .biblio-doc h4{font-size:13.5px;font-weight:700;margin:14px 0 4px;color:var(--txt)}
        .biblio-doc h5{font-size:12.5px;font-weight:700;margin:12px 0 4px;color:var(--mut)}
        .biblio-doc p{font-size:13.5px;line-height:1.72;color:var(--mut);margin:0 0 10px}
        .biblio-doc ul,.biblio-doc ol{margin:0 0 12px;padding-left:22px;display:flex;flex-direction:column;gap:4px}
        .biblio-doc li{font-size:13.5px;line-height:1.6;color:var(--mut)}
        .biblio-doc strong{color:var(--txt);font-weight:700}
        .biblio-doc em{color:var(--txt)}
        .biblio-doc code{background:var(--panel-2);border:1px solid var(--line);border-radius:5px;padding:1px 6px;font-size:12px;color:var(--accent)}
        .biblio-doc blockquote{border-left:3px solid var(--accent);padding:6px 14px;margin:0 0 12px;color:var(--txt);background:color-mix(in srgb,var(--accent) 6%,transparent);border-radius:0 8px 8px 0;font-size:13.5px;line-height:1.6}
        .biblio-doc hr{border:none;border-top:1px solid var(--line);margin:18px 0}
        .biblio-doc a{color:var(--accent)}
      `}</style>
    </div>
  );
}
