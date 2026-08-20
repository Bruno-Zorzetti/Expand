import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import type { Perfil } from "@/lib/expand-perfis";
import MenteMapa from "@/components/expand/MenteMapa";
import GrafoConhecimento from "@/components/expand/GrafoConhecimento";

export const dynamic = "force-dynamic";

type CRow = { id: string; tipo: string; titulo: string; conteudo: string | null; fonte: string | null; criado_por: string | null; criado_em: string; arquivo_path: string | null; arquivo_nome: string | null };
const TEXTO_EXT = /\.(txt|md|markdown|csv|json|srt|vtt)$/i;

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
async function addArquivoConhecimento(formData: FormData) {
  "use server";
  const agente_id = String(formData.get("agente_id") ?? "");
  if (!agente_id) return;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return;
  const tipo = String(formData.get("tipo") ?? "biblioteca") || "biblioteca";
  const fonte = String(formData.get("fonte") ?? "").trim() || "Material enviado";
  const descricao = String(formData.get("descricao") ?? "").trim();
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  for (const file of files) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `conhecimento/${agente_id}/${Date.now()}-${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("expand-entregaveis").upload(path, buf, { contentType: file.type || undefined, upsert: false });
    if (error) continue;
    // texto puro: extrai o conteúdo para o RAG (barato). PDF/imagem: usa a descrição fornecida.
    let conteudo = descricao || null;
    if (TEXTO_EXT.test(file.name)) { try { conteudo = buf.toString("utf8").slice(0, 40000); } catch { /* noop */ } }
    await supabase.from("expand_conhecimento").insert({
      agente_id, tipo, titulo: file.name, conteudo, fonte, criado_por: pessoa.nome, arquivo_path: path, arquivo_nome: file.name,
    });
  }
  revalidatePath(`/expand/equipe/${agente_id}/conhecimento`);
}

async function removeConhecimento(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const agente_id = String(formData.get("agente_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { data: n } = await supabase.from("expand_conhecimento").select("arquivo_path").eq("id", id).single();
  if (n?.arquivo_path) await supabase.storage.from("expand-entregaveis").remove([n.arquivo_path as string]);
  await supabase.from("expand_conhecimento").delete().eq("id", id);
  revalidatePath(`/expand/equipe/${agente_id}/conhecimento`);
}

function nomeToSlug(nome: string): string {
  const clean = nome.toLowerCase()
    .replace(/[áàãâä]/g, "a").replace(/[éèê]/g, "e").replace(/[íìî]/g, "i")
    .replace(/[óòõô]/g, "o").replace(/[úùû]/g, "u").replace(/ç/g, "c");
  return clean.split(/[\s(]/)[0];
}

export default async function Conhecimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: perf } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!perf) notFound();
  const p = perf as Perfil;
  const { data: cData } = await supabase.from("expand_conhecimento").select("*").eq("agente_id", id).order("criado_em", { ascending: false });
  const entradas = (cData ?? []) as CRow[];
  const assinado = new Map<string, string>();
  for (const e of entradas) {
    if (e.arquivo_path) { const { data: sg } = await supabase.storage.from("expand-entregaveis").createSignedUrl(e.arquivo_path, 300); if (sg?.signedUrl) assinado.set(e.id, sg.signedUrl); }
  }

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>
      <p className="hx-eyebrow">{p.nome} · Conhecimento & RAG</p>
      <h1 className="ex-h1">O que o <span className="hx-accent-text">{p.nome}</span> sabe</h1>
      <p className="ex-sub">Grafo interativo do conhecimento estruturado (181 nós, grafo completo), memória operacional e todos os materiais que alimentam o RAG deste agente.</p>

      {/* ── Grafo de Conhecimento ── */}
      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph">
          <span className="pt">Grafo de conhecimento — {p.nome}</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>knowledge graph · force-directed</span>
        </div>
        <div className="pb">
          <GrafoConhecimento agente={nomeToSlug(p.nome)} />
          <p style={{ fontSize: 11, color: "var(--mut)", lineHeight: 1.55, marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            Cada nó é um conceito extraído dos materiais do agente. Tamanho = centralidade (conexões). Cor = comunidade temática. Clique para explorar o conceito e navegar pelos nós vizinhos.
          </p>
        </div>
      </div>

      {/* ── Memória operacional (Supabase) ── */}
      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">Memória operacional — aprendizado contínuo</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>acertos · erros · feedbacks · modelos</span></div>
        <div className="pb">
          {entradas.length ? <MenteMapa nome={p.nome} tipos={TIPOS} nodes={entradas.map((e) => ({ id: e.id, tipo: e.tipo, titulo: e.titulo, conteudo: e.conteudo, fonte: e.fonte, href: assinado.get(e.id) ?? null }))} /> : <p style={{ fontSize: 12.5, color: "var(--dim)", textAlign: "center", padding: "20px 0" }}>A memória operacional ainda está vazia. Registre acertos, erros e feedbacks abaixo para alimentar o aprendizado contínuo.</p>}
        </div>
      </div>

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

      <div className="ex-panel hx-glass" style={{ marginBottom: 18 }}>
        <div className="ph"><span className="pt">Enviar material (upload)</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>livros · funis · copys · PDFs · planilhas</span></div>
        <form action={addArquivoConhecimento} className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          <input type="hidden" name="agente_id" value={id} />
          <label className="ex-fld"><span>Tipo</span><select name="tipo" defaultValue="biblioteca">{TIPOS.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
          <label className="ex-fld"><span>Fonte / autor</span><input name="fonte" placeholder="ex.: Método Henrique Toledo" /></label>
          <label className="ex-fld" style={{ gridColumn: "1 / -1" }}><span>Arquivos (pode selecionar vários)</span><input type="file" name="files" multiple /></label>
          <label className="ex-fld" style={{ gridColumn: "1 / -1" }}><span>Descrição / resumo — o que o agente deve aprender</span><textarea name="descricao" placeholder="Arquivos de texto (.txt, .md, .csv) entram no RAG automaticamente. Para PDF e imagem, cole aqui os pontos-chave/o resumo que o agente deve aprender." /></label>
          <div style={{ gridColumn: "1 / -1" }}><button className="hx-btn hx-btn-primary" type="submit">Enviar para a memória</button></div>
        </form>
        <p style={{ fontSize: 11, color: "var(--dim)", padding: "0 17px 14px", lineHeight: 1.5 }}>Nada é inventado: o agente aprende só do que você enviar. Texto puro é lido automaticamente; PDF e imagem ficam anexados para consulta e o resumo que você escrever é o que alimenta o RAG.</p>
      </div>

      {TIPOS.map((t) => {
        const es = entradas.filter((e) => e.tipo === t.k);
        return (
          <div key={t.k} style={{ marginBottom: 14 }}>
            <div className="ex-grph"><span className="gt" style={{ color: t.c }}>{t.l}</span><span className="gc">{es.length}</span><span className="gl" /></div>
            {es.length === 0 ? <p style={{ fontSize: 12, color: "var(--dim)" }}>Nada registrado ainda.</p> : es.map((e) => (
              <div key={e.id} className="ex-arq hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${t.c}` }}>
                <div className="an">{e.arquivo_nome ? "📎 " : ""}{e.titulo}{assinado.get(e.id) ? <a href={assinado.get(e.id)} target="_blank" rel="noreferrer" className="ex-file" style={{ marginLeft: 8, fontSize: 11 }}>abrir</a> : null}{e.conteudo ? <div className="am">{e.conteudo.length > 320 ? e.conteudo.slice(0, 320) + "…" : e.conteudo}</div> : null}<div className="am" style={{ marginTop: 3 }}>{e.fonte ? `${e.fonte} · ` : ""}{new Date(e.criado_em).toLocaleDateString("pt-BR")}{e.criado_por ? ` · ${e.criado_por}` : ""}</div></div>
                <form action={removeConhecimento}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="agente_id" value={id} /><button className="ex-arqbtn no" type="submit">Remover</button></form>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
