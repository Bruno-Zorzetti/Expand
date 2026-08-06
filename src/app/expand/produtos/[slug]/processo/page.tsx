import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import Ajuda from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

type Fase = { id: string; produto_slug: string; ordem: number; nome: string; janela: string | null; obj: string | null };
type Etapa = {
  id: string; produto_slug: string; fase_ordem: number; ordem: number; titulo: string;
  area: string | null; responsavel: string | null; agente: string | null; sla: string | null;
  gatilho: string | null; criterio: string | null; visivel_cliente: boolean; qtd_esperada: number; aprovacao: string | null;
};

async function salvarFase(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  const row = {
    produto_slug: slug,
    ordem: Number(formData.get("ordem") ?? 0),
    nome: String(formData.get("nome") ?? "").trim(),
    janela: String(formData.get("janela") ?? "").trim() || null,
    obj: String(formData.get("obj") ?? "").trim() || null,
  };
  if (!slug || !row.nome || !row.ordem) return;
  if (id) await supabase.from("expand_prod_fases").update(row).eq("id", id);
  else await supabase.from("expand_prod_fases").insert(row);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}
async function removerFase(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;
  await supabase.from("expand_prod_fases").delete().eq("id", id);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}

async function salvarEtapa(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  const row = {
    produto_slug: slug,
    fase_ordem: Number(formData.get("fase_ordem") ?? 0),
    ordem: Number(formData.get("ordem") ?? 0),
    titulo: String(formData.get("titulo") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim() || null,
    responsavel: String(formData.get("responsavel") ?? "").trim() || null,
    agente: String(formData.get("agente") ?? "").trim() || null,
    sla: String(formData.get("sla") ?? "").trim() || null,
    gatilho: String(formData.get("gatilho") ?? "").trim() || null,
    criterio: String(formData.get("criterio") ?? "").trim() || null,
    qtd_esperada: Number(formData.get("qtd_esperada") ?? 1) || 1,
    aprovacao: String(formData.get("aprovacao") ?? "qualquer").trim() || "qualquer",
    visivel_cliente: formData.get("visivel_cliente") === "on",
  };
  if (!slug || !row.titulo || !row.fase_ordem || !row.ordem) return;
  if (id) await supabase.from("expand_prod_etapas").update(row).eq("id", id);
  else await supabase.from("expand_prod_etapas").insert(row);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}
async function removerEtapa(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return;
  await supabase.from("expand_prod_etapas").delete().eq("id", id);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}

const lab: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none" };

function CampoEtapa({ e, slug, faseOrdem, proxOrdem }: { e?: Etapa; slug: string; faseOrdem: number; proxOrdem: number }) {
  return (
    <form action={salvarEtapa} className="hx-glass" style={{ padding: 12, borderRadius: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, border: "1px solid var(--accent)", marginBottom: 8 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" defaultValue={e?.id ?? ""} />
      <input type="hidden" name="fase_ordem" value={faseOrdem} />
      <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Título da etapa</span><input name="titulo" defaultValue={e?.titulo ?? ""} required style={inp} /></label>
      <label><span style={lab}>Ordem global</span><input name="ordem" type="number" defaultValue={e?.ordem ?? proxOrdem} required style={inp} /></label>
      <label><span style={lab}>Área</span>
        <select name="area" defaultValue={e?.area ?? ""} style={inp}>
          <option value="">—</option>
          {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
        </select>
      </label>
      <label><span style={lab}>Responsável</span><input name="responsavel" defaultValue={e?.responsavel ?? ""} style={inp} /></label>
      <label><span style={lab}>Agente de IA</span>
        <select name="agente" defaultValue={e?.agente ?? ""} style={inp}>
          <option value="">— nenhum</option>
          {Object.entries(AG_NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label><span style={lab}>SLA</span><input name="sla" defaultValue={e?.sla ?? ""} placeholder="ex.: 2 dias" style={inp} /></label>
      <label><span style={lab}>Qtd. esperada</span><input name="qtd_esperada" type="number" min={1} defaultValue={e?.qtd_esperada ?? 1} style={inp} /></label>
      <label><span style={lab}>Gatilho</span><input name="gatilho" defaultValue={e?.gatilho ?? ""} style={inp} /></label>
      <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Critério de conclusão</span><input name="criterio" defaultValue={e?.criterio ?? ""} style={inp} /></label>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--mut)", alignSelf: "end" }}><input type="checkbox" name="visivel_cliente" defaultChecked={e ? e.visivel_cliente : false} /> Visível ao cliente</label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <button className="hx-btn hx-btn-primary" type="submit">{e ? "Salvar etapa" : "Adicionar etapa"}</button>
        {e ? <Link href={`/expand/produtos/${slug}/processo`} className="hx-btn" style={{ marginLeft: "auto" }}>Cancelar</Link> : null}
      </div>
    </form>
  );
}

export default async function ProcessoProduto({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string; addfase?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: prod } = await supabase.from("products").select("name, tagline, category").eq("slug", slug).single();
  if (!prod) notFound();

  const { data: fData } = await supabase.from("expand_prod_fases").select("*").eq("produto_slug", slug).order("ordem");
  const { data: eData } = await supabase.from("expand_prod_etapas").select("*").eq("produto_slug", slug).order("ordem");
  const fases = (fData ?? []) as Fase[];
  const etapas = (eData ?? []) as Etapa[];
  const editId = sp.edit ?? null;
  const maxOrdem = etapas.reduce((m, e) => Math.max(m, e.ordem), 0);

  const porFase = new Map<number, Etapa[]>();
  etapas.forEach((e) => { const a = porFase.get(e.fase_ordem) ?? []; a.push(e); porFase.set(e.fase_ordem, a); });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Link href="/expand/produtos" className="ex-back">← Produtos</Link>
      </div>
      <p className="hx-eyebrow">Processo do produto · {prod.category ?? ""}</p>
      <h1 className="ex-h1">{prod.name} — <span className="hx-accent-text">processo</span></h1>
      <p className="ex-sub">
        As fases e etapas que a operação instancia para cada conta deste produto. Editar aqui muda o que vira tarefa nas próximas contas iniciadas.
        {slug === "pide" ? <>Este é o processo-base do <b>PIDE</b> — mesma esteira nas modalidades <b>Anual</b> e <b>Semestral</b>. </> : null}<Ajuda t="Quando uma conta desse produto entra na operação, a esteira dela é criada a partir daqui: título, área, responsável, agente, SLA, quantidade e visibilidade ao cliente." />
      </p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Fases</div><div className="val hx-accent-text">{fases.length}</div><div className="foot">Blocos do processo</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Etapas</div><div className="val hx-accent-text">{etapas.length}</div><div className="foot">Tarefas instanciáveis</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Visíveis ao cliente</div><div className="val">{etapas.filter((e) => e.visivel_cliente).length}</div><div className="foot">Aparecem no portal</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Com agente de IA</div><div className="val">{etapas.filter((e) => e.agente).length}</div><div className="foot">Executadas por IA</div></div>
      </div>

      {fases.map((f) => {
        const list = (porFase.get(f.ordem) ?? []).sort((a, b) => a.ordem - b.ordem);
        return (
          <details key={f.id} className="ex-panel hx-glass" style={{ marginBottom: 12 }} open>
            <summary className="ph" style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>Fase {f.ordem}</span>
              <span className="pt">{f.nome}</span>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>{f.janela}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>{list.length} etapas</span>
            </summary>
            <div className="pb">
              {f.obj ? <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>{f.obj}</p> : null}

              {list.map((e) => editId === e.id ? (
                <CampoEtapa key={e.id} e={e} slug={slug} faseOrdem={f.ordem} proxOrdem={e.ordem} />
              ) : (
                <div key={e.id} className="ex-arq hx-glass" style={{ marginBottom: 6, borderLeft: `3px solid ${e.area && AREAS[e.area] ? AREAS[e.area].cor : "var(--line-2)"}` }}>
                  <div className="an" style={{ minWidth: 0 }}>
                    <span style={{ color: "var(--dim)", fontVariantNumeric: "tabular-nums", marginRight: 6 }}>{e.ordem}</span>
                    {e.titulo}{e.qtd_esperada > 1 ? <span className="ex-pill" style={{ marginLeft: 6 }}>×{e.qtd_esperada}</span> : null}
                    <div className="am">
                      {e.area && AREAS[e.area] ? AREAS[e.area].n : "—"}
                      {e.responsavel ? ` · ${e.responsavel}` : ""}
                      {e.agente ? ` · IA: ${AG_NOME[e.agente] ?? e.agente}` : ""}
                      {e.sla ? ` · SLA ${e.sla}` : ""}
                      {e.visivel_cliente ? " · 👁 cliente" : ""}
                    </div>
                  </div>
                  <Link href={`/expand/produtos/${slug}/processo?edit=${e.id}`} className="ex-arqbtn">Editar</Link>
                  <form action={removerEtapa}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="slug" value={slug} /><button className="ex-arqbtn no" type="submit">Excluir</button></form>
                </div>
              ))}

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)" }}>+ Adicionar etapa nesta fase</summary>
                <div style={{ marginTop: 8 }}><CampoEtapa slug={slug} faseOrdem={f.ordem} proxOrdem={maxOrdem + 1} /></div>
              </details>

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--dim)" }}>Editar dados da fase</summary>
                <form action={salvarFase} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 10, marginTop: 8 }}>
                  <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={f.id} />
                  <label><span style={lab}>Ordem</span><input name="ordem" type="number" defaultValue={f.ordem} style={inp} /></label>
                  <label><span style={lab}>Nome</span><input name="nome" defaultValue={f.nome} style={inp} /></label>
                  <label><span style={lab}>Janela</span><input name="janela" defaultValue={f.janela ?? ""} style={inp} /></label>
                  <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Objetivo</span><input name="obj" defaultValue={f.obj ?? ""} style={inp} /></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="hx-btn hx-btn-primary" type="submit">Salvar fase</button>
                    <button className="ex-arqbtn no" type="submit" formAction={removerFase}>Excluir fase</button>
                  </div>
                </form>
              </details>
            </div>
          </details>
        );
      })}

      <details className="ex-panel hx-glass" style={{ marginTop: 14 }}>
        <summary className="ph" style={{ cursor: "pointer" }}><span className="pt">+ Nova fase</span></summary>
        <form action={salvarFase} className="pb" style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 10 }}>
          <input type="hidden" name="slug" value={slug} />
          <label><span style={lab}>Ordem</span><input name="ordem" type="number" defaultValue={fases.length + 1} required style={inp} /></label>
          <label><span style={lab}>Nome</span><input name="nome" required style={inp} /></label>
          <label><span style={lab}>Janela</span><input name="janela" style={inp} /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Objetivo</span><input name="obj" style={inp} /></label>
          <div><button className="hx-btn hx-btn-primary" type="submit">Criar fase</button></div>
        </form>
      </details>
    </>
  );
}
