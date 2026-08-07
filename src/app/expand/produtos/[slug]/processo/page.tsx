import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import Ajuda from "@/components/expand/Ajuda";
import AgenteChat from "@/components/expand/AgenteChat";
import EtapasDnD, { type EtapaLite } from "@/components/expand/EtapasDnD";

export const dynamic = "force-dynamic";

type Fase = { id: string; produto_slug: string; ordem: number; nome: string; janela: string | null; obj: string | null };
type Etapa = {
  id: string; produto_slug: string; fase_ordem: number; ordem: number; titulo: string;
  area: string | null; responsavel: string | null; agente: string | null; sla: string | null;
  gatilho: string | null; criterio: string | null; visivel_cliente: boolean; qtd_esperada: number; aprovacao: string | null;
  marco: boolean; depende_de: number | null;
};

async function salvarFase(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  const row = { produto_slug: slug, ordem: Number(formData.get("ordem") ?? 0), nome: String(formData.get("nome") ?? "").trim(), janela: String(formData.get("janela") ?? "").trim() || null, obj: String(formData.get("obj") ?? "").trim() || null };
  if (!slug || !row.nome || !row.ordem) return;
  if (id) await supabase.from("expand_prod_fases").update(row).eq("id", id);
  else await supabase.from("expand_prod_fases").insert(row);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}
async function removerFase(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const id = String(formData.get("id") ?? ""), slug = String(formData.get("slug") ?? "");
  if (!id) return;
  await supabase.from("expand_prod_fases").delete().eq("id", id);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}
async function salvarEtapa(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const slug = String(formData.get("slug") ?? ""), id = String(formData.get("id") ?? "").trim();
  const row = {
    produto_slug: slug, fase_ordem: Number(formData.get("fase_ordem") ?? 0), ordem: Number(formData.get("ordem") ?? 0),
    titulo: String(formData.get("titulo") ?? "").trim(), area: String(formData.get("area") ?? "").trim() || null,
    responsavel: String(formData.get("responsavel") ?? "").trim() || null, agente: String(formData.get("agente") ?? "").trim() || null,
    sla: String(formData.get("sla") ?? "").trim() || null, gatilho: String(formData.get("gatilho") ?? "").trim() || null,
    criterio: String(formData.get("criterio") ?? "").trim() || null, qtd_esperada: Number(formData.get("qtd_esperada") ?? 1) || 1,
    aprovacao: String(formData.get("aprovacao") ?? "qualquer").trim() || "qualquer", visivel_cliente: formData.get("visivel_cliente") === "on",
    marco: formData.get("marco") === "on", depende_de: formData.get("depende_de") ? Number(formData.get("depende_de")) : null,
  };
  if (!slug || !row.titulo || !row.fase_ordem || !row.ordem) return;
  if (id) await supabase.from("expand_prod_etapas").update(row).eq("id", id);
  else await supabase.from("expand_prod_etapas").insert(row);
  revalidatePath(`/expand/produtos/${slug}/processo`);
}

const lab: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none" };

// "D5–D25", "D0", "Paralelo · D5–D25", "D30+" → faixa de dias; sem D → null (recorrente/sem data fixa)
function janelaDias(j: string | null): { a: number; b: number } | null {
  if (!j) return null;
  const nums = [...j.matchAll(/D(\d+)/g)].map((m) => Number(m[1]));
  if (!nums.length) return null;
  let a = Math.min(...nums), b = Math.max(...nums);
  if (/\+/.test(j)) b += 10;
  if (a === b) b = a + 1;
  return { a, b };
}

function CampoEtapa({ e, slug, faseOrdem, proxOrdem, opcoes }: { e?: Etapa; slug: string; faseOrdem: number; proxOrdem: number; opcoes: { ordem: number; titulo: string }[] }) {
  return (
    <form action={salvarEtapa} className="hx-glass" style={{ padding: 12, borderRadius: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, border: "1px solid var(--accent)", marginBottom: 8 }}>
      <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" defaultValue={e?.id ?? ""} /><input type="hidden" name="fase_ordem" value={faseOrdem} />
      <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Título da etapa</span><input name="titulo" defaultValue={e?.titulo ?? ""} required style={inp} /></label>
      <label><span style={lab}>Ordem global</span><input name="ordem" type="number" defaultValue={e?.ordem ?? proxOrdem} required style={inp} /></label>
      <label><span style={lab}>Área</span><select name="area" defaultValue={e?.area ?? ""} style={inp}><option value="">—</option>{Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}</select></label>
      <label><span style={lab}>Responsável</span><input name="responsavel" defaultValue={e?.responsavel ?? ""} style={inp} /></label>
      <label><span style={lab}>Agente de IA</span><select name="agente" defaultValue={e?.agente ?? ""} style={inp}><option value="">— nenhum</option>{Object.entries(AG_NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label><span style={lab}>SLA</span><input name="sla" defaultValue={e?.sla ?? ""} placeholder="ex.: 2 dias" style={inp} /></label>
      <label><span style={lab}>Qtd. esperada</span><input name="qtd_esperada" type="number" min={1} defaultValue={e?.qtd_esperada ?? 1} style={inp} /></label>
      <label><span style={lab}>Gatilho</span><input name="gatilho" defaultValue={e?.gatilho ?? ""} style={inp} /></label>
      <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Critério de conclusão</span><input name="criterio" defaultValue={e?.criterio ?? ""} style={inp} /></label>
      <label><span style={lab}>Depende de (pré-requisito)</span>
        <select name="depende_de" defaultValue={e?.depende_de ?? ""} style={inp}>
          <option value="">— nenhuma</option>
          {opcoes.filter((o) => o.ordem !== e?.ordem).map((o) => <option key={o.ordem} value={o.ordem}>#{o.ordem} · {o.titulo}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--mut)", alignSelf: "end" }}><input type="checkbox" name="marco" defaultChecked={e ? e.marco : false} /> ◆ É um marco (data crítica)</label>
      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--mut)", alignSelf: "end" }}><input type="checkbox" name="visivel_cliente" defaultChecked={e ? e.visivel_cliente : false} /> Visível ao cliente</label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <button className="hx-btn hx-btn-primary" type="submit">{e ? "Salvar etapa" : "Adicionar etapa"}</button>
        {e ? <Link href={`/expand/produtos/${slug}/processo`} className="hx-btn" style={{ marginLeft: "auto" }}>Cancelar</Link> : null}
      </div>
    </form>
  );
}

export default async function ProcessoProduto({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string; v?: string; analise?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const view = sp.v ?? "lista";
  const abrirAnalise = sp.analise === "1";
  const supabase = await createClient();

  const { data: prod } = await supabase.from("products").select("name, category").eq("slug", slug).single();
  if (!prod) notFound();

  const { data: fData } = await supabase.from("expand_prod_fases").select("*").eq("produto_slug", slug).order("ordem");
  const { data: eData } = await supabase.from("expand_prod_etapas").select("*").eq("produto_slug", slug).order("ordem");
  const fases = (fData ?? []) as Fase[];
  const etapas = (eData ?? []) as Etapa[];
  const editId = sp.edit ?? null;
  const editEtapa = etapas.find((e) => e.id === editId) ?? null;
  const maxOrdem = etapas.reduce((m, e) => Math.max(m, e.ordem), 0);
  const porFase = new Map<number, Etapa[]>();
  etapas.forEach((e) => { const a = porFase.get(e.fase_ordem) ?? []; a.push(e); porFase.set(e.fase_ordem, a); });
  const lite = (e: Etapa): EtapaLite => ({ id: e.id, ordem: e.ordem, titulo: e.titulo, area: e.area, responsavel: e.responsavel, agente: e.agente, sla: e.sla, qtd_esperada: e.qtd_esperada, visivel_cliente: e.visivel_cliente, marco: e.marco, depende_de: e.depende_de });
  const opcoes = etapas.map((e) => ({ ordem: e.ordem, titulo: e.titulo }));
  const tituloPorOrdem: Record<number, string> = Object.fromEntries(etapas.map((e) => [e.ordem, e.titulo]));
  const marcos = etapas.filter((e) => e.marco).sort((a, b) => a.ordem - b.ordem);
  const faseNome = (o: number) => fases.find((f) => f.ordem === o);

  const maxDia = Math.max(30, ...fases.map((f) => janelaDias(f.janela)?.b ?? 0));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}><Link href="/expand/produtos" className="ex-back">← Produtos</Link></div>
      <p className="hx-eyebrow">Processo do produto · {prod.category ?? ""}</p>
      <h1 className="ex-h1">{prod.name} — <span className="hx-accent-text">processo</span></h1>
      <p className="ex-sub">As fases e etapas que a operação instancia para cada conta deste produto. Um projeto de sucesso é o mais previsível possível — acompanhe prazos e SLA nas 3 vistas. <Ajuda t="Editar aqui muda o que vira tarefa nas próximas contas iniciadas: título, área, responsável, agente, SLA, quantidade e visibilidade ao cliente." /></p>

      <div className="ex-kpis" style={{ marginBottom: 14 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Fases</div><div className="val hx-accent-text">{fases.length}</div><div className="foot">Blocos do processo</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Etapas</div><div className="val hx-accent-text">{etapas.length}</div><div className="foot">Tarefas instanciáveis</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Visíveis ao cliente</div><div className="val">{etapas.filter((e) => e.visivel_cliente).length}</div><div className="foot">Aparecem no portal</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Com agente de IA</div><div className="val">{etapas.filter((e) => e.agente).length}</div><div className="foot">Executadas por IA</div></div>
      </div>

      {/* CHAT PMO */}
      <details className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <summary className="ph" style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />
          <span className="pt">Analisar com o Gerente de Projetos (PMO)</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>quadros · prazos · SLA · carga da equipe</span>
        </summary>
        <div className="pb">
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>Peça uma análise deste processo — quem está sobrecarregado ou ocioso na janela, se o SLA está sendo cumprido pelo tempo de execução, e o que melhorar no modelo padrão pras próximas entregas.</p>
          <AgenteChat id="gerente-projetos" nome="Gerente de Projetos" cor="var(--accent)" tipo="agente" contexto={{ produto: slug }} memoriaHref="/expand/equipe/gerente-projetos/conhecimento" />
        </div>
      </details>

      {/* ANÁLISE — AGENTE DE PRODUTOS */}
      <details className="ex-panel hx-glass" style={{ marginBottom: 16 }} open={abrirAnalise}>
        <summary className="ph" style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5FA8D3" }} />
          <span className="pt">Analisar com o Agente de Produtos</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>oferta · prazos · equipe · margem</span>
        </summary>
        <div className="pb">
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>Uma leitura do produto antes de publicar: se os prazos batem com o tempo real, se a equipe dá conta, e o que melhorar. Ele pode propor ações concretas pra você aprovar e executar.</p>
          <AgenteChat id="agente-produtos" nome="Agente de Produtos" cor="#5FA8D3" tipo="agente" contexto={{ produto: slug }} memoriaHref="/expand/equipe/agente-produtos/conhecimento" />
        </div>
      </details>

      {/* VISTAS */}
      <div className="ex-chips" style={{ marginBottom: 16 }}>
        {[["lista", "Lista"], ["kanban", "Kanban"], ["gantt", "Gantt / calendário"]].map(([k, l]) => (
          <Link key={k} href={`/expand/produtos/${slug}/processo?v=${k}`} className={`ex-chip2${view === k ? " on" : ""}`}>{l}</Link>
        ))}
      </div>

      {/* ---------- LISTA (com arrastar) ---------- */}
      {view === "lista" ? (
        <>
          {editEtapa ? <div style={{ marginBottom: 12 }}><CampoEtapa e={editEtapa} slug={slug} faseOrdem={editEtapa.fase_ordem} proxOrdem={editEtapa.ordem} opcoes={opcoes} /></div> : null}
          {fases.map((f) => {
            const list = (porFase.get(f.ordem) ?? []).sort((a, b) => a.ordem - b.ordem);
            return (
              <details key={f.id} className="ex-panel hx-glass" style={{ marginBottom: 12 }} open>
                <summary className="ph" style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>Fase {f.ordem}</span>
                  <span className="pt">{f.nome}</span><span style={{ fontSize: 11, color: "var(--dim)" }}>{f.janela}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>{list.length} etapas · arraste ⠿ para reordenar</span>
                </summary>
                <div className="pb">
                  {f.obj ? <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>{f.obj}</p> : null}
                  <EtapasDnD slug={slug} etapas={list.map(lite)} depNomes={tituloPorOrdem} />
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)" }}>+ Adicionar etapa nesta fase</summary>
                    <div style={{ marginTop: 8 }}><CampoEtapa slug={slug} faseOrdem={f.ordem} proxOrdem={maxOrdem + 1} opcoes={opcoes} /></div>
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
              <label><span style={lab}>Janela</span><input name="janela" placeholder="ex.: D1–D5" style={inp} /></label>
              <label style={{ gridColumn: "1 / -1" }}><span style={lab}>Objetivo</span><input name="obj" style={inp} /></label>
              <div><button className="hx-btn hx-btn-primary" type="submit">Criar fase</button></div>
            </form>
          </details>
        </>
      ) : null}

      {/* ---------- KANBAN (colunas = fases) ---------- */}
      {view === "kanban" ? (
        <div className="ex-kanban" style={{ gridTemplateColumns: `repeat(${fases.length}, minmax(230px, 1fr))` }}>
          {fases.map((f) => {
            const list = (porFase.get(f.ordem) ?? []).sort((a, b) => a.ordem - b.ordem);
            return (
              <div key={f.id} className="ex-kcol">
                <div className="ex-kh" style={{ color: "var(--accent)" }}><span className="ex-kdot" style={{ background: "var(--accent)" }} />Fase {f.ordem}<span className="ex-kn">{list.length}</span></div>
                <div style={{ fontSize: 11.5, fontWeight: 700, padding: "0 4px 8px", color: "var(--txt)" }}>{f.nome}<div style={{ fontSize: 10, color: "var(--dim)", fontWeight: 400 }}>{f.janela}</div></div>
                <div className="ex-kbody">
                  {list.map((e) => {
                    const ar = e.area ? AREAS[e.area] : null;
                    return (
                      <a key={e.id} href={`/expand/produtos/${slug}/processo?edit=${e.id}`} className="ex-gcard hx-glass" style={{ ["--gc" as string]: e.marco ? "var(--accent)" : ar?.cor ?? "var(--line-2)" }}>
                        <div className="gt">{e.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{e.titulo}{e.qtd_esperada > 1 ? <span className="ex-pill" style={{ marginLeft: 5 }}>×{e.qtd_esperada}</span> : null}</div>
                        <div className="gm2">{ar ? ar.n : "—"}{e.responsavel ? ` · ${e.responsavel}` : ""}{e.agente ? ` · ⚡${AG_NOME[e.agente] ?? e.agente}` : ""}</div>
                        <div className="gm2" style={{ color: "var(--dim)" }}>SLA {e.sla ?? "—"}{e.visivel_cliente ? " · 👁" : ""}{e.depende_de ? ` · ↳ #${e.depende_de}` : ""}</div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ---------- GANTT / CALENDÁRIO ---------- */}
      {view === "gantt" ? (
        <div className="ex-panel hx-glass" style={{ padding: 16 }}>
          {marcos.length ? (
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 8 }}>◆ Marcos do projeto — datas críticas</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
                {marcos.map((m, i) => {
                  const f = faseNome(m.fase_ordem);
                  return (
                    <div key={m.id} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{ width: 22, height: 22, flexShrink: 0, display: "grid", placeItems: "center", color: "#0A1512", background: "var(--accent)", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.titulo}</div>
                        <div style={{ fontSize: 10.5, color: "var(--dim)" }}>Fase {m.fase_ordem} · {f?.janela ?? ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12 }}>Linha do tempo das fases (em dias a partir do início — D0). Ciclos recorrentes/mensais aparecem sem data fixa embaixo. Use pra garantir que nada foge do prazo.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {fases.map((f) => {
              const d = janelaDias(f.janela);
              const temMarco = (porFase.get(f.ordem) ?? []).some((e) => e.marco);
              return (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 11.5, minWidth: 0 }}><b style={{ color: "var(--accent)" }}>F{f.ordem}</b> {f.nome}{temMarco ? <span title="Fase com marco" style={{ color: "var(--accent)", marginLeft: 4 }}>◆</span> : null}<div style={{ fontSize: 10, color: "var(--dim)" }}>{f.janela}</div></div>
                  <div style={{ position: "relative", height: 22, background: "var(--panel-2)", borderRadius: 6, overflow: "hidden" }}>
                    {d ? <div title={f.janela ?? ""} style={{ position: "absolute", left: `${(d.a / maxDia) * 100}%`, width: `${Math.max(3, ((d.b - d.a) / maxDia) * 100)}%`, top: 3, bottom: 3, background: "linear-gradient(90deg, var(--accent), var(--accent-2))", borderRadius: 5 }} />
                      : <div style={{ position: "absolute", inset: 3, borderRadius: 5, border: "1px dashed var(--line-2)", display: "grid", placeItems: "center", fontSize: 9.5, color: "var(--dim)" }}>recorrente / sem data fixa</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 10, marginTop: 6 }}>
            <span />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--dim)" }}>
              {[0, 0.25, 0.5, 0.75, 1].map((r) => <span key={r}>D{Math.round(maxDia * r)}</span>)}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
