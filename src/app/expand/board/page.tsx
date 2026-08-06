import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES, AREAS, AG_COR, AG_NOME } from "@/lib/expand-esteira";
import { MAT_COR, type ClienteRow } from "@/lib/expand";
import { ETAPA_STATUS, type EtapaRow } from "@/lib/expand-tarefas";
import { garantirEtapas } from "@/app/expand/actions";
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
      <div style={{ marginBottom: 10 }}>
        <Link href={`/portal/${sel.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>Abrir portal de {sel.nome} ↗</Link>
      </div>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Conta</div><div className="val" style={{ fontSize: 19 }}>{sel.nome}</div><div className="foot">{sel.segmento}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Maturidade<Ajuda t={AJUDA.maturidade} /></div><div className="val" style={{ fontSize: 17, color: MAT_COR[sel.maturidade ?? ""] ?? "var(--accent)" }}>{sel.maturidade}</div><div className="foot">Relação {sel.rel ?? "—"} · Execução {sel.exec ?? "—"} <Ajuda t={AJUDA.execucao} /></div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Etapas concluídas</div><div className="val">{etapas.length ? `${concluidas}/${etapas.length}` : "—"}</div><div className="foot">{etapas.length ? "Na esteira desta conta" : "Esteira não preparada"}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Pendência hoje</div><div className="val" style={{ fontSize: 15 }}>{sel.pendencia}</div><div className="foot">Depende de: {sel.depende_de}</div></div>
      </div>

      {etapas.length === 0 ? (
        <div className="hx-glass" style={{ padding: "22px 24px" }}>
          <p style={{ marginBottom: 6, fontWeight: 700 }}>A esteira desta conta ainda não foi preparada.</p>
          <p style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>Instancia as {FASES.reduce((n, f) => n + f.tasks.length, 0)} etapas do PIDE para {sel.nome}, já com o status pela maturidade. Depois é só subir e aprovar os arquivos de cada tarefa.</p>
          <form action={garantirEtapas}>
            <input type="hidden" name="clienteId" value={sel.id} />
            <button className="hx-btn hx-btn-primary" type="submit">Preparar esteira desta conta</button>
          </form>
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
