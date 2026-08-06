import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="ex-panel hx-glass" style={{ padding: 0 }}>
      <div style={{ padding: "14px 17px 0" }}><p className="ex-sl">{titulo}</p></div>
      <div style={{ padding: "0 17px 16px" }}>{children}</div>
    </div>
  );
}
function Chips({ arr }: { arr: string[] | null }) {
  if (!arr || !arr.length) return null;
  return <div className="ex-skills">{arr.map((s, i) => <span key={i} className="ex-skill">{s}</span>)}</div>;
}

export default async function PerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Perfil;

  const { data: { user } } = await supabase.auth.getUser();
  let podeEditar = false;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
    podeEditar = me?.role === "admin" || (me?.expand_membro as string | null) === id;
  }

  const contato = [p.idade && `${p.idade} anos`, p.email, p.telefone, p.pais].filter(Boolean) as string[];

  return (
    <>
      <Link href="/expand/equipe" className="ex-back">← Voltar ao time</Link>

      <div className="ex-pfhead">
        <PerfilAvatar p={p} size={150} radius={16} />
        <div className="ex-panel hx-glass" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600 }}>{p.nome}</h1>
            <span className="ex-pill" style={{ background: `color-mix(in srgb, ${p.cor} 16%, transparent)`, color: p.cor ?? "var(--accent)" }}><i className="ex-dot" />{p.tipo === "agente" ? "Agente de IA" : "Humano"}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/expand/equipe/${id}/conhecimento`} className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Conhecimento & RAG</Link>
              {podeEditar ? <Link href={`/expand/equipe/${id}/editar`} className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Editar</Link> : null}
            </div>
          </div>
          <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600, marginTop: 2 }}>{p.cargo}{p.area ? ` · ${p.area}` : ""}</p>
          {p.bio ? <p style={{ color: "var(--mut)", fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>{p.bio}</p> : null}
        </div>
      </div>

      {/* Métricas — medimos humanos e agentes igual */}
      <div className="ex-kpis" style={{ marginBottom: 16 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Nota geral</div><div className="val hx-accent-text">{p.nota ?? "—"}</div><div className="foot">Avaliação da equipe</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Selo</div><div className="val" style={{ fontSize: 15 }}>{p.ranking ?? "—"}</div><div className="foot">Reconhecimento</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Trabalhos</div><div className="val">{p.trabalhos ?? 0}</div><div className="foot">Entregas realizadas</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Tipo</div><div className="val" style={{ fontSize: 17, color: p.cor ?? "var(--accent)" }}>{p.tipo === "agente" ? "IA" : "Humano"}</div><div className="foot">Mesmo padrão de medida</div></div>
      </div>

      {p.tipo === "agente" && (p.prompt || p.memoria) ? (
        <div className="ex-two" style={{ marginBottom: 16 }}>
          {p.prompt ? <Sec titulo="Prompt do agente"><div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.prompt}</div></Sec> : null}
          {p.memoria ? <Sec titulo="Memória / base de conhecimento"><div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, fontFamily: "monospace" }}>{p.memoria}</div></Sec> : null}
        </div>
      ) : null}

      <div className="ex-two">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {p.chapeus?.length ? <Sec titulo="Chapéus (papéis)"><Chips arr={p.chapeus} /></Sec> : null}
          {p.hard?.length ? <Sec titulo="Hard skills — habilidades"><Chips arr={p.hard} /></Sec> : null}
          {p.soft?.length ? <Sec titulo="Soft skills"><Chips arr={p.soft} /></Sec> : null}
          {p.ferramentas?.length ? <Sec titulo="Ferramentas"><Chips arr={p.ferramentas} /></Sec> : null}
          {p.linguagens?.length ? <Sec titulo="Linguagens"><Chips arr={p.linguagens} /></Sec> : null}
          {p.interesses?.length ? <Sec titulo="Interesses"><Chips arr={p.interesses} /></Sec> : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {p.experiencia?.length ? (
            <Sec titulo="Experiência">
              {p.experiencia.map((e, i) => (
                <div key={i} className="ex-exp">
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><span className="eo">{e.org}</span>{e.periodo ? <span className="ep">{e.periodo}</span> : null}</div>
                  {e.cargo ? <div style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{e.cargo}</div> : null}
                  {e.desc ? <div className="ec">{e.desc}</div> : null}
                </div>
              ))}
            </Sec>
          ) : null}
          {p.formacao?.length ? (
            <Sec titulo="Formação">
              {p.formacao.map((f, i) => (
                <div key={i} className="ex-exp">
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><span className="eo">{f.inst}</span>{f.ano ? <span className="ep">{f.ano}</span> : null}</div>
                  {f.curso ? <div className="ec">{f.curso}</div> : null}
                </div>
              ))}
            </Sec>
          ) : null}
          {p.portfolio_url ? (
            <Sec titulo="Portfólio">
              <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="ex-skill" style={{ color: "var(--accent)" }}>{p.portfolio_label ?? p.portfolio_url}</a>
            </Sec>
          ) : null}
          {contato.length ? (
            <Sec titulo="Perfil"><div className="ex-skills">{contato.map((c, i) => <span key={i} className="ex-skill">{c}</span>)}</div></Sec>
          ) : null}
        </div>
      </div>
    </>
  );
}
