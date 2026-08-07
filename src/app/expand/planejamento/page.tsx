import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/expand-esteira";
import { agendarEtapa } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Et = { id: string; titulo: string; area: string | null; responsavel: string | null; responsavel_atual: string | null; sla: string | null; status: string; marco: boolean; data_prevista: string | null };

function isoMonday(offsetSemanas = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offsetSemanas * 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");

export default async function Planejamento({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: cData } = await supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome");
  const clientes = (cData ?? []) as { id: string; nome: string }[];
  const sel = clientes.find((c) => c.id === sp.c) ?? clientes[0];
  if (!sel) return (<><p className="hx-eyebrow">Planejamento</p><h1 className="ex-h1">Planejamento da semana</h1><p className="ex-sub">Nenhuma conta ativa.</p></>);

  const { data: etData } = await supabase.from("expand_etapas").select("id, titulo, area, responsavel, responsavel_atual, sla, status, marco, data_prevista")
    .eq("cliente_id", sel.id).in("status", ["run", "idle"]).order("ordem");
  const etapas = (etData ?? []) as Et[];

  const segThis = isoMonday(0), segNext = isoMonday(1), fimNext = isoMonday(2);
  const naSemana = etapas.filter((e) => e.data_prevista && e.data_prevista >= segThis && e.data_prevista < segNext).length;
  const naProxima = etapas.filter((e) => e.data_prevista && e.data_prevista >= segNext && e.data_prevista < fimNext).length;
  const semData = etapas.filter((e) => !e.data_prevista).length;

  return (
    <>
      <p className="hx-eyebrow">Ritual de segunda · após a weekly</p>
      <h1 className="ex-h1">Planejamento da <span className="hx-accent-text">semana</span></h1>
      <p className="ex-sub">Agende as tarefas de cada conta na semana certa. A equipe vê só a semana atual e a próxima; o que você agendar aqui vira a agenda dela e o calendário (Google/ICS). Ajuste depois da daily se precisar.</p>

      <div className="ex-chips">
        {clientes.map((c) => <Link key={c.id} href={`/expand/planejamento?c=${c.id}`} className={`ex-chip2${c.id === sel.id ? " on" : ""}`}>{c.nome}</Link>)}
      </div>

      <div className="ex-kpis" style={{ margin: "14px 0" }}>
        <div className="ex-kpi hx-glass"><div className="lab">Sem data</div><div className="val" style={{ color: semData ? "var(--warn)" : "var(--green)" }}>{semData}</div><div className="foot">A planejar</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Esta semana</div><div className="val hx-accent-text">{naSemana}</div><div className="foot">Desde {fmt(segThis)}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Próxima semana</div><div className="val">{naProxima}</div><div className="foot">Desde {fmt(segNext)}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Ativas na conta</div><div className="val">{etapas.length}</div><div className="foot">{sel.nome}</div></div>
      </div>

      {etapas.map((e) => {
        const ar = e.area ? AREAS[e.area] : null;
        return (
          <div key={e.id} className="ex-arq hx-glass" style={{ marginBottom: 6, borderLeft: `3px solid ${e.marco ? "var(--accent)" : ar ? ar.cor : "var(--line-2)"}`, flexWrap: "wrap" }}>
            <div className="an" style={{ minWidth: 180 }}>
              {e.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{e.titulo}
              <div className="am">{ar ? ar.n : "—"} · {e.responsavel_atual ?? e.responsavel} · SLA {e.sla} · {e.status === "run" ? "em execução" : "na fila"}{e.data_prevista ? ` · 📅 ${fmt(e.data_prevista)}` : ""}</div>
            </div>
            <form action={agendarEtapa}><input type="hidden" name="etapaId" value={e.id} /><input type="hidden" name="data" value={segThis} /><button className="ex-arqbtn ok" type="submit">Esta semana</button></form>
            <form action={agendarEtapa}><input type="hidden" name="etapaId" value={e.id} /><input type="hidden" name="data" value={segNext} /><button className="ex-arqbtn" type="submit">Próxima</button></form>
            <form action={agendarEtapa} style={{ display: "flex", gap: 4 }}><input type="hidden" name="etapaId" value={e.id} /><input type="date" name="data" defaultValue={e.data_prevista ?? ""} style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "5px 7px", fontSize: 12, outline: "none" }} /><button className="ex-arqbtn" type="submit">Data</button></form>
            {e.data_prevista ? <form action={agendarEtapa}><input type="hidden" name="etapaId" value={e.id} /><input type="hidden" name="data" value="" /><button className="ex-arqbtn no" type="submit">Limpar</button></form> : null}
          </div>
        );
      })}
      {etapas.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Sem tarefas ativas nesta conta.</p> : null}
    </>
  );
}
