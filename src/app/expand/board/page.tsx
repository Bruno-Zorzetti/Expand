import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES, AREAS, AG_COR, AG_NOME } from "@/lib/expand-esteira";
import { MAT_COR, type ClienteRow } from "@/lib/expand";
import { ETAPA_STATUS, type EtapaRow } from "@/lib/expand-tarefas";
import { garantirEtapas, adicionarEtapaCliente } from "@/app/expand/actions";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

const FASE_STAT: Record<string, { l: string; bg: string; c: string }> = {
  done: { l: "Concluída", bg: "color-mix(in srgb, var(--green) 15%, transparent)", c: "var(--green)" },
  run: { l: "Em execução", bg: "color-mix(in srgb, var(--accent) 15%, transparent)", c: "var(--accent)" },
  idle: { l: "Não iniciada", bg: "var(--panel-2)", c: "var(--dim)" },
};

export default async function Board({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true).order("nome");
  const clientes = (data ?? []) as ClienteRow[];
  const sel = clientes.find((c) => c.id === sp.c) ?? clientes[0];

  if (!sel) {
    return (<><p className="hx-eyebrow">Estado da conta</p><h1 className="ex-h1">Board de Entrega</h1><p className="ex-sub">Nenhuma conta ativa.</p></>);
  }

  const { data: etData } = await supabase.from("expand_etapas").select("*").eq("cliente_id", sel.id).order("ordem");
  const etapas = (etData ?? []) as EtapaRow[];

  // produtos com processo cadastrado (para escolher a esteira ao preparar)
  const { data: prodData } = await supabase.from("expand_prod_etapas").select("produto_slug");
  const prodSlugs = Array.from(new Set((prodData ?? []).map((p: { produto_slug: string }) => p.produto_slug)));
  const { data: prodNomes } = await supabase.from("products").select("slug, name").in("slug", prodSlugs.length ? prodSlugs : ["_"]);
  const nomeProduto = new Map((prodNomes ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name]));
  const produtos = prodSlugs.map((s) => ({ slug: s, nome: nomeProduto.get(s) ?? s })).sort((a, b) => a.nome.localeCompare(b.nome));

  const counts = new Map<string, { total: number; aprovados: number }>();
  if (etapas.length) {
    const ids = etapas.map((e) => e.id);
    const { data: arqs } = await supabase.from("expand_arquivos").select("etapa_id,status").in("etapa_id", ids);
    (arqs ?? []).forEach((a: { etapa_id: string; status: string }) => {
      const g = counts.get(a.etapa_id) ?? { total: 0, aprovados: 0 };
      g.total++; if (a.status === "aprovado") g.aprovados++;
      counts.set(a.etapa_id, g);
    });
  }
  const porFase = new Map<number, EtapaRow[]>();
  etapas.forEach((e) => { const arr = porFase.get(e.fase) ?? []; arr.push(e); porFase.set(e.fase, arr); });

  const concluidas = etapas.filter((e) => e.status === "done").length;

  return (
    <>
      <p className="hx-eyebrow">Estado da conta</p>
      <h1 className="ex-h1">Board de <span className="hx-accent-text">Entrega</span></h1>
      <p className="ex-sub">Onde cada conta está no PIDE. Cada tarefa tem dono, prazo, contador de arquivos e datas — clique para ver os entregáveis e aprovar.</p>

      <div className="ex-chips">
        {clientes.map((c) => (<Link key={c.id} href={`/expand/board?c=${c.id}`} className={`ex-chip2${c.id === sel.id ? " on" : ""}`}>{c.nome}</Link>))}
      </div>
      <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/portal/${sel.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>Abrir portal de {sel.nome} ↗</Link>
        {etapas.length ? <Link href={`/expand/board/squad?c=${sel.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>🧩 PMO: montar squad</Link> : null}
      </div>

      {/* Adicionar nova tarefa/atividade à conta (qualquer um da equipe / PMO) */}
      <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 12 }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "11px 16px", fontWeight: 700, fontSize: 13 }}>＋ Nova tarefa para {sel.nome} <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)" }}>· demanda avulsa, entra na esteira desta conta</span></summary>
        <form action={adicionarEtapaCliente} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, padding: "0 16px 16px", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <input type="hidden" name="clienteId" value={sel.id} />
          <label style={{ gridColumn: "1 / -1" }}><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>O que precisa ser feito</span><input name="titulo" required placeholder="ex.: Gravar 2 reels extras" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>Detalhe / critério de conclusão</span><input name="criterio" placeholder="o que caracteriza pronto" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} /></label>
          <label><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>Responsável</span><input name="responsavel" placeholder="A definir" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} /></label>
          <label><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>SLA</span><input name="sla" placeholder="ex.: 2 dias" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" }} /></label>
          <div style={{ gridColumn: "1 / -1" }}><button className="hx-btn hx-btn-primary" type="submit">Adicionar à esteira</button></div>
        </form>
      </details>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Conta</div><div className="val" style={{ fontSize: 19 }}>{sel.nome}</div><div className="foot">{sel.segmento}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Maturidade<Ajuda t={AJUDA.maturidade} /></div><div className="val" style={{ fontSize: 17, color: MAT_COR[sel.maturidade ?? ""] ?? "var(--accent)" }}>{sel.maturidade}</div><div className="foot">Relação {sel.rel ?? "—"} · Execução {sel.exec ?? "—"} <Ajuda t={AJUDA.execucao} /></div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Etapas concluídas</div><div className="val">{etapas.length ? `${concluidas}/${etapas.length}` : "—"}</div><div className="foot">{etapas.length ? "Na esteira desta conta" : "Esteira não preparada"}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Pendência hoje</div><div className="val" style={{ fontSize: 15 }}>{sel.pendencia}</div><div className="foot">Depende de: {sel.depende_de}</div></div>
      </div>

      {etapas.length === 0 ? (
        <div className="hx-glass" style={{ padding: "22px 24px" }}>
          <p style={{ marginBottom: 6, fontWeight: 700 }}>A esteira desta conta ainda não foi preparada.</p>
          <p style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>Escolha o <b>produto</b> que {sel.nome} contratou — a sequência de trabalho é criada a partir do processo desse produto, já com o status pela maturidade. Depois é só subir e aprovar os arquivos de cada tarefa.</p>
          <form action={garantirEtapas} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="clienteId" value={sel.id} />
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Produto</span>
              <select name="produtoSlug" defaultValue={(sel as { produto_slug?: string | null }).produto_slug ?? "pide"} style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, minWidth: 200, fontFamily: "inherit" }}>
                {produtos.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
              </select>
            </label>
            <button className="hx-btn hx-btn-primary" type="submit" style={{ alignSelf: "end" }}>Criar sequência de trabalho</button>
          </form>
          <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12, lineHeight: 1.5, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <b style={{ color: "var(--accent)" }}>Próximo passo (em construção):</b> depois de criar a sequência, o <a href="/expand/equipe/gerente-projetos" style={{ color: "var(--accent)", textDecoration: "none" }}>Gerente de Projetos (PMO)</a> vai sugerir o squad de entrega e distribuir as tarefas conforme a agenda de cada um — sem sufocar quem já está cheio nem deixar ninguém ocioso — para você aprovar.
          </p>
        </div>
      ) : (
        FASES.map((f) => {
          const es = porFase.get(f.id) ?? [];
          if (!es.length) return null;
          const st = es.every((e) => e.status === "done") ? "done" : es.some((e) => e.status === "run") ? "run" : "idle";
          return (
            <div key={f.id} className={`ex-fase hx-glass ${st}`}>
              <div className="ex-faseh">
                <div className="ex-fasen">{f.id}</div>
                <div className="ex-fasetit"><div className="nm">{f.nome}</div><div className="mt">{f.janela} · {f.obj}</div></div>
                <span className="ex-stat" style={{ background: FASE_STAT[st].bg, color: FASE_STAT[st].c }}>{FASE_STAT[st].l}</span>
              </div>
              {es.map((e) => {
                const cnt = counts.get(e.id) ?? { total: 0, aprovados: 0 };
                const ar = e.area ? AREAS[e.area] : null;
                const s = ETAPA_STATUS[e.status] ?? ETAPA_STATUS.idle;
                return (
                  <Link key={e.id} href={`/expand/etapa/${e.id}`} className="ex-taskrow" style={{ textDecoration: "none", color: "inherit" }}>
                    <span className={`ex-tchk ${e.status === "done" ? "done" : e.status === "run" ? "run" : ""}`}>{e.status === "done" ? "✓" : ""}</span>
                    <div className="tt">
                      {e.titulo}
                      {e.agente ? <span className="ex-agtag" style={{ color: AG_COR[e.agente], marginLeft: 8 }}>⚡ {AG_NOME[e.agente]}</span> : null}
                      <div className="ow">{ar ? <span style={{ color: ar.cor, fontWeight: 700 }}>{ar.n}</span> : null} · {e.responsavel_atual ?? e.responsavel} · SLA {e.sla}</div>
                    </div>
                    <span className="ex-cont"><b>{cnt.aprovados}</b>/{e.qtd_esperada} {e.qtd_esperada > 1 ? "arquivos" : "arquivo"}</span>
                    <span className="ex-stat" style={{ background: "transparent", color: s.c }}>{s.l}</span>
                  </Link>
                );
              })}
            </div>
          );
        })
      )}
    </>
  );
}
