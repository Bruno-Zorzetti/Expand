import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

type CRow = { id: string; tipo: string; titulo: string; conteudo: string | null; fonte: string | null; criado_por: string | null; criado_em: string };

const TIPOS: { k: string; l: string; c: string }[] = [
  { k: "trabalho", l: "Trabalhos (log e histórico)", c: "var(--accent)" },
  { k: "aprendizado", l: "Aprendizados", c: "var(--green)" },
  { k: "acerto", l: "Acertos", c: "var(--green)" },
  { k: "erro", l: "Erros", c: "var(--red)" },
  { k: "modelo", l: "Modelos", c: "var(--accent)" },
  { k: "biblioteca", l: "Biblioteca de estudo", c: "var(--accent-2)" },
  { k: "avaliacao", l: "Avaliações do cliente", c: "var(--warn)" },
  { k: "conversa", l: "Conversas", c: "var(--dim)" },
];

async function addConhecimento(formData: FormData) {
  "use server";
  const agente_id = String(formData.get("agente_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!agente_id || !tipo || !titulo) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_conhecimento").insert({
    agente_id, tipo, titulo,
    conteudo: String(formData.get("conteudo") ?? "").trim() || null,
    fonte: String(formData.get("fonte") ?? "").trim() || null,
    criado_por: pessoa.nome,
  });
  revalidatePath(`/expand/equipe/${agente_id}/conhecimento`);
}
async function removeConhecimento(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const agente_id = String(formData.get("agente_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_conhecimento").delete().eq("id", id);
  revalidatePath(`/expand/equipe/${agente_id}/conhecimento`);
}

export default async function Conhecimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: perf } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!perf) notFound();
  const p = perf as Perfil;
  const { data: cData } = await supabase.from("expand_conhecimento").select("*").eq("agente_id", id).order("criado_em", { ascending: false });
  const entradas = (cData ?? []) as CRow[];

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>
      <p className="hx-eyebrow">{p.nome} · Conhecimento & RAG</p>
      <h1 className="ex-h1">O que o <span className="hx-accent-text">{p.nome}</span> sabe</h1>
      <p className="ex-sub">O prompt real do agente e a base que alimenta o RAG: aprendizados, erros, acertos, modelos, biblioteca de estudo, avaliações do cliente, conversas e o log de trabalhos. Cada registro melhora os próximos trabalhos e os processos.</p>

      {p.prompt ? (
        <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
          <div className="ph"><span className="pt">Prompt do agente (.md real)</span></div>
          <div className="pb">
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--sans)", fontSize: 13, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>{p.prompt}</pre>
            {p.memoria ? <div style={{ fontSize: 11.5, color: "var(--dim)", fontFamily: "monospace", marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>{p.memoria}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="ex-panel hx-glass" style={{ marginBottom: 18 }}>
        <div className="ph"><span className="pt">Registrar no conhecimento</span></div>
        <form action={addConhecimento} className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          <input type="hidden" name="agente_id" value={id} />
          <label className="ex-fld"><span>Tipo</span><select name="tipo">{TIPOS.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
          <label className="ex-fld"><span>Título</span><input name="titulo" required /></label>
          <label className="ex-fld"><span>Fonte (cliente / job / link)</span><input name="fonte" /></label>
          <label className="ex-fld" style={{ gridColumn: "1 / -1" }}><span>Conteúdo</span><textarea name="conteudo" /></label>
          <div style={{ gridColumn: "1 / -1" }}><button className="hx-btn hx-btn-primary" type="submit">Registrar</button></div>
        </form>
      </div>

      {TIPOS.map((t) => {
        const es = entradas.filter((e) => e.tipo === t.k);
        return (
          <div key={t.k} style={{ marginBottom: 14 }}>
            <div className="ex-grph"><span className="gt" style={{ color: t.c }}>{t.l}</span><span className="gc">{es.length}</span><span className="gl" /></div>
            {es.length === 0 ? <p style={{ fontSize: 12, color: "var(--dim)" }}>Nada registrado ainda.</p> : es.map((e) => (
              <div key={e.id} className="ex-arq hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${t.c}` }}>
                <div className="an">{e.titulo}{e.conteudo ? <div className="am">{e.conteudo}</div> : null}<div className="am" style={{ marginTop: 3 }}>{e.fonte ? `${e.fonte} · ` : ""}{new Date(e.criado_em).toLocaleDateString("pt-BR")}{e.criado_por ? ` · ${e.criado_por}` : ""}</div></div>
                <form action={removeConhecimento}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="agente_id" value={id} /><button className="ex-arqbtn no" type="submit">Remover</button></form>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
