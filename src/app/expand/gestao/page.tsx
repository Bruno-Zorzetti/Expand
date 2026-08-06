import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_COR, AG_NOME } from "@/lib/expand-esteira";
import Ajuda from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

type Et = {
  id: string; cliente_id: string; fase: number; ordem: number; titulo: string;
  area: string | null; responsavel: string | null; agente: string | null; sla: string | null;
  status: string; responsavel_atual: string | null; iniciada_em: string | null; qtd_esperada: number; visivel_cliente: boolean;
};
type Cli = { id: string; nome: string; segmento: string | null; maturidade: string | null; produto_slug: string | null };

// SLA textual → dias (best-effort). "2 dias (+2)"→2, "24h"→1, "Diário/Mensal/Contínuo/Na reunião"→null (sem prazo fixo)
function slaDias(sla: string | null): number | null {
  if (!sla) return null;
  const s = sla.toLowerCase();
  const md = s.match(/(\d+)\s*dia/);
  if (md) return Number(md[1]);
  const mh = s.match(/(\d+)\s*h/);
  if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}
function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 864e5;
}

// status efetivo para o board gerencial
function efetivo(e: Et, pend: number): "idle" | "run" | "wait" | "late" | "done" {
  if (e.status === "done") return "done";
  if (pend > 0) return "wait";
  if (e.status === "run") {
    const d = slaDias(e.sla);
    const dd = diasDesde(e.iniciada_em);
    if (d != null && dd != null && dd > d) return "late";
    return "run";
  }
  return "idle";
}

const COL: Record<string, { l: string; c: string; bg: string }> = {
  idle: { l: "Não iniciada", c: "var(--dim)", bg: "var(--panel-2)" },
  run: { l: "Em execução", c: "var(--accent)", bg: "color-mix(in srgb, var(--accent) 14%, transparent)" },
  wait: { l: "Aguardando aprovação", c: "var(--warn)", bg: "color-mix(in srgb, var(--warn) 15%, transparent)" },
  late: { l: "Atrasada", c: "var(--red)", bg: "color-mix(in srgb, var(--red) 15%, transparent)" },
  done: { l: "Concluída", c: "var(--green)", bg: "color-mix(in srgb, var(--green) 14%, transparent)" },
};
const ORDEM_COL = ["late", "wait", "run", "idle", "done"] as const;

function Card({ e, cliNome }: { e: Et; cliNome: string }) {
  const ar = e.area ? AREAS[e.area] : null;
  return (
    <Link href={`/expand/etapa/${e.id}`} className="ex-gcard hx-glass" style={{ ["--gc" as string]: ar?.cor ?? "var(--line-2)" }}>
      <div className="gt">{e.titulo}{e.qtd_esperada > 1 ? <span className="ex-pill" style={{ marginLeft: 5 }}>×{e.qtd_esperada}</span> : null}</div>
      <div className="gm">
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>{cliNome}</span>
        {ar ? <span style={{ color: ar.cor }}> · {ar.n}</span> : null}
      </div>
      <div className="gm2">
        {e.responsavel_atual ?? e.responsavel ?? "—"}
        {e.agente ? <span className="ex-agtag" style={{ color: AG_COR[e.agente], marginLeft: 6 }}>⚡ {AG_NOME[e.agente]}</span> : null}
        {e.sla ? <span style={{ color: "var(--dim)" }}> · SLA {e.sla}</span> : null}
      </div>
    </Link>
  );
}

export default async function Gestao({ searchParams }: { searchParams: Promise<{ v?: string; c?: string; st?: string; r?: string; p?: string }> }) {
  const sp = await searchParams;
  const view = sp.v ?? "conta";
  const supabase = await createClient();

  const { data: cData } = await supabase.from("expand_clientes").select("id, nome, segmento, maturidade, produto_slug").order("nome");
  const clientes = (cData ?? []) as Cli[];
  const cliMap = new Map(clientes.map((c) => [c.id, c]));

  const { data: etData } = await supabase.from("expand_etapas")
    .select("id, cliente_id, fase, ordem, titulo, area, responsavel, agente, sla, status, responsavel_atual, iniciada_em, qtd_esperada, visivel_cliente")
    .order("ordem");
  let etapas = (etData ?? []) as Et[];

  // arquivos pendentes por etapa (para status "aguardando aprovação")
  const pend = new Map<string, number>();
  const { data: arqs } = await supabase.from("expand_arquivos").select("etapa_id, status").eq("status", "pendente");
  (arqs ?? []).forEach((a: { etapa_id: string; status: string }) => pend.set(a.etapa_id, (pend.get(a.etapa_id) ?? 0) + 1));

  // squads por conta
  const { data: sqData } = await supabase.from("expand_squad_membros")
    .select("cliente_id, funcao, lider, expand_perfis(nome, tipo)")
    .order("lider", { ascending: false });
  type SqRow = { cliente_id: string; funcao: string | null; lider: boolean; expand_perfis: { nome: string; tipo: string } | { nome: string; tipo: string }[] | null };
  const squadPorConta = new Map<string, { nome: string; tipo: string; funcao: string | null; lider: boolean }[]>();
  (sqData as SqRow[] | null ?? []).forEach((r) => {
    const pf = Array.isArray(r.expand_perfis) ? r.expand_perfis[0] : r.expand_perfis;
    if (!pf) return;
    const a = squadPorConta.get(r.cliente_id) ?? [];
    a.push({ nome: pf.nome, tipo: pf.tipo, funcao: r.funcao, lider: r.lider });
    squadPorConta.set(r.cliente_id, a);
  });

  // filtros
  if (sp.c) etapas = etapas.filter((e) => e.cliente_id === sp.c);
  if (sp.p) etapas = etapas.filter((e) => (cliMap.get(e.cliente_id)?.produto_slug ?? "pide") === sp.p);
  if (sp.r) etapas = etapas.filter((e) => (e.responsavel_atual ?? e.responsavel) === sp.r);
  const eff = (e: Et) => efetivo(e, pend.get(e.id) ?? 0);
  if (sp.st) etapas = etapas.filter((e) => eff(e) === sp.st);

  // KPIs (sempre sobre o conjunto filtrado)
  const kRun = etapas.filter((e) => eff(e) === "run").length;
  const kLate = etapas.filter((e) => eff(e) === "late").length;
  const kWait = etapas.filter((e) => eff(e) === "wait").length;
  const kDone = etapas.filter((e) => eff(e) === "done").length;
  const contasAtivas = new Set(etapas.map((e) => e.cliente_id)).size;

  // opções de filtro
  const responsaveis = [...new Set(etapas.map((e) => e.responsavel_atual ?? e.responsavel).filter(Boolean))].sort() as string[];
  const produtos = [...new Set(clientes.map((c) => c.produto_slug ?? "pide"))];

  const qs = (patch: Record<string, string | undefined>) => {
    const base: Record<string, string | undefined> = { v: view, c: sp.c, st: sp.st, r: sp.r, p: sp.p, ...patch };
    const parts = Object.entries(base).filter(([, val]) => val).map(([k, val]) => `${k}=${encodeURIComponent(val as string)}`);
    return `/expand/gestao${parts.length ? "?" + parts.join("&") : ""}`;
  };

  // conjunto "ativo" (o que precisa de atenção) para as vistas por conta / por pessoa
  const ativos = etapas.filter((e) => ["late", "wait", "run"].includes(eff(e)));

  return (
    <>
      <p className="hx-eyebrow">Painel gerencial · toda a operação</p>
      <h1 className="ex-h1">Gestão <span className="hx-accent-text">— visão Monday</span></h1>
      <p className="ex-sub">O estado de toda a operação num lugar só — o que está em execução, o que atrasou pelo SLA, o que aguarda aprovação e a carga de cada pessoa e agente. Gestores e equipe operam por aqui; o cliente acompanha pelo portal. <Ajuda t="Atraso é estimado a partir do SLA textual da etapa (quando tem prazo em dias/horas) contado desde que ela iniciou. SLAs como Diário, Mensal ou Contínuo não têm prazo fixo." /></p>

      <div className="ex-kpis" style={{ marginBottom: 14 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Em execução</div><div className="val hx-accent-text">{kRun}</div><div className="foot">Etapas ativas agora</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Atrasadas</div><div className="val" style={{ color: "var(--red)" }}>{kLate}</div><div className="foot">Passaram do SLA</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando aprovação</div><div className="val" style={{ color: "var(--warn)" }}>{kWait}</div><div className="foot">Arquivos pendentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Concluídas</div><div className="val" style={{ color: "var(--green)" }}>{kDone}</div><div className="foot">No conjunto atual</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Contas na operação</div><div className="val">{contasAtivas}</div><div className="foot">Com esteira ativa</div></div>
      </div>

      {/* toggle de vistas */}
      <div className="ex-chips" style={{ marginBottom: 8 }}>
        {[["conta", "Por conta"], ["kanban", "Kanban por status"], ["pessoa", "Por pessoa / agente"]].map(([v, l]) => (
          <Link key={v} href={qs({ v })} className={`ex-chip2${view === v ? " on" : ""}`}>{l}</Link>
        ))}
      </div>

      {/* filtros */}
      <form className="hx-glass" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 12px", marginBottom: 16, fontSize: 12.5 }}>
        <input type="hidden" name="v" value={view} />
        <select name="c" defaultValue={sp.c ?? ""} style={selCss}><option value="">Todas as contas</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <select name="p" defaultValue={sp.p ?? ""} style={selCss}><option value="">Todos os produtos</option>{produtos.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <select name="r" defaultValue={sp.r ?? ""} style={selCss}><option value="">Todos os responsáveis</option>{responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <select name="st" defaultValue={sp.st ?? ""} style={selCss}><option value="">Todos os status</option>{ORDEM_COL.map((s) => <option key={s} value={s}>{COL[s].l}</option>)}</select>
        <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "6px 12px" }}>Filtrar</button>
        {(sp.c || sp.p || sp.r || sp.st) ? <Link href={qs({ c: undefined, p: undefined, r: undefined, st: undefined })} style={{ color: "var(--dim)" }}>limpar</Link> : null}
      </form>

      {view === "kanban" ? (
        <div className="ex-kanban">
          {ORDEM_COL.map((col) => {
            const cards = etapas.filter((e) => eff(e) === col);
            const cap = col === "done" || col === "idle" ? 30 : 200;
            return (
              <div key={col} className="ex-kcol">
                <div className="ex-kh" style={{ color: COL[col].c }}><span className="ex-kdot" style={{ background: COL[col].c }} />{COL[col].l}<span className="ex-kn">{cards.length}</span></div>
                <div className="ex-kbody">
                  {cards.slice(0, cap).map((e) => <Card key={e.id} e={e} cliNome={cliMap.get(e.cliente_id)?.nome ?? "—"} />)}
                  {cards.length > cap ? <div style={{ fontSize: 11, color: "var(--dim)", padding: "6px 2px" }}>+{cards.length - cap} mais</div> : null}
                  {cards.length === 0 ? <div style={{ fontSize: 11, color: "var(--dim)", padding: "6px 2px" }}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === "pessoa" ? (
        (() => {
          const porPessoa = new Map<string, Et[]>();
          ativos.forEach((e) => { const k = e.responsavel_atual ?? e.responsavel ?? "Sem responsável"; const a = porPessoa.get(k) ?? []; a.push(e); porPessoa.set(k, a); });
          const linhas = [...porPessoa.entries()].sort((a, b) => b[1].length - a[1].length);
          if (!linhas.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Nenhuma etapa ativa no filtro atual.</p>;
          return linhas.map(([pessoa, es]) => {
            const late = es.filter((e) => eff(e) === "late").length;
            return (
              <div key={pessoa} className="ex-panel hx-glass" style={{ marginBottom: 12 }}>
                <div className="ph">
                  <span className="pt">{pessoa}</span>
                  <span style={{ marginLeft: 10, fontSize: 11.5, color: "var(--dim)" }}>{es.length} ativas{late ? <span style={{ color: "var(--red)" }}> · {late} atrasadas</span> : null}</span>
                </div>
                <div className="pb ex-gwrap">
                  {es.slice(0, 60).map((e) => <Card key={e.id} e={e} cliNome={cliMap.get(e.cliente_id)?.nome ?? "—"} />)}
                </div>
              </div>
            );
          });
        })()
      ) : (
        (() => {
          const contas = clientes.filter((c) => !sp.c || c.id === sp.c);
          const comAtivo = contas.map((c) => ({ c, es: ativos.filter((e) => e.cliente_id === c.id) })).filter((x) => x.es.length);
          if (!comAtivo.length) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Nenhuma etapa ativa no filtro atual.</p>;
          return comAtivo.map(({ c, es }) => {
            const squad = squadPorConta.get(c.id) ?? [];
            const late = es.filter((e) => eff(e) === "late").length;
            return (
              <div key={c.id} className="ex-panel hx-glass" style={{ marginBottom: 12 }}>
                <div className="ph" style={{ flexWrap: "wrap", gap: 6 }}>
                  <span className="pt">{c.nome}</span>
                  <span style={{ fontSize: 11, color: "var(--dim)" }}>{c.maturidade} · {c.produto_slug ?? "pide"}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--dim)" }}>{es.length} ativas{late ? <span style={{ color: "var(--red)" }}> · {late} atrasadas</span> : null}</span>
                </div>
                {squad.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "0 16px 8px" }}>
                    {squad.map((m, i) => <span key={i} className="ex-chip" title={m.funcao ?? undefined} style={{ ["--ac" as string]: m.tipo === "agente" ? "var(--accent-2)" : "var(--accent)" }}>{m.lider ? "★ " : ""}{m.nome}{m.funcao ? ` · ${m.funcao}` : ""}</span>)}
                  </div>
                ) : null}
                <div className="pb ex-gwrap">
                  {es.slice(0, 40).map((e) => <Card key={e.id} e={e} cliNome={c.nome} />)}
                </div>
              </div>
            );
          });
        })()
      )}
    </>
  );
}

const selCss: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "6px 9px", fontSize: 12.5, outline: "none" };
