import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown } from "@/lib/md";

export const dynamic = "force-dynamic";

type Doc = { slug: string; categoria: string; titulo: string; autor: string | null; conteudo: string | null; publico: boolean; tags: string[] | null };

export default async function DocReader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_biblioteca").select("*").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const d = data as Doc;
  const html = renderMarkdown(d.conteudo ?? "");

  return (
    <>
      <Link href="/expand/biblioteca" className="ex-back">← Voltar à Biblioteca</Link>

      <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: 8, background: "linear-gradient(90deg, var(--accent), var(--dourado))" }} />
        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}>{d.categoria}</span>
            {d.publico ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)", color: "var(--green)" }}>Público · cliente vê</span> : <span className="ex-pill" style={{ background: "var(--panel-2)", color: "var(--dim)" }}>Interno · equipe</span>}
          </div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>{d.titulo}</h1>
          {d.autor ? <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{d.autor}</p> : null}
        </div>
      </div>

      <div className="ex-panel hx-glass biblio-doc" style={{ padding: "22px 26px" }}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
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
    </>
  );
}
