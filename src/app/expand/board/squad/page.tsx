import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AREAS } from "@/lib/expand-esteira";
import { metricasPessoa, ehDaPessoa, type EtapaProd } from "@/lib/expand-produtividade";
import { sugerirSquad, type Candidato } from "@/lib/expand-squad";
import { aplicarSquad } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

const selStyle: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", minWidth: 150 };

export default async function Squad({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const supabase = await createClient();
  const { data: cli } = c ? await supabase.from("expand_clientes").select("id, nome").eq("id", c).maybeSingle() : { data: null };
  if (!cli) {
    return (<><Link href="/expand/board" className="ex-back">← Board</Link><h1 className="ex-h1">Montar squad</h1><p className="ex-sub">Escolha uma conta no board primeiro.</p></>);
  }

  // tarefas abertas desta conta, agrupadas por área
  const { data: etCli } = await supabase.from("expand_etapas").select("area, status").eq("cliente_id", cli.id).neq("status", "done");
  const contaArea = new Map<string, number>();
  (etCli ?? []).forEach((e: { area: string | null }) => { const a = e.area ?? "—"; contaArea.set(a, (contaArea.get(a) ?? 0) + 1); });
  const areasComPeso = [...contaArea.entries()].map(([area, tarefas]) => ({ area, tarefas }));

  // candidatos: humanos + métricas (carga, eficiência por área) + folgas
  const { data: humanos } = await supabase.from("expand_perfis").select("id, nome, cargo").eq("tipo", "humano").order("nome");
  const { data: todasEt } = await supabase.from("expand_etapas").select("responsavel, responsavel_atual, status, area, sla, duracao_min, data_prevista, concluida_em, bloqueado");
  const rows = (todasEt ?? []) as EtapaProd[];
  const hojeISO = new Date().toISOString().slice(0, 10);
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const { data: folgasAll } = await supabase.from("expand_perfil_folga").select("perfil_id, data").gte("data", hojeISO).lte("data", em30);
  const folgaCont = new Map<string, number>();
  (folgasAll ?? []).forEach((f: { perfil_id: string }) => folgaCont.set(f.perfil_id, (folgaCont.get(f.perfil_id) ?? 0) + 1));

  const candidatos: Candidato[] = (humanos ?? []).map((h: { id: string; nome: string; cargo: string | null }) => {
    const m = metricasPessoa(h.nome, rows);
    const load = rows.filter((e) => e.status !== "done" && ehDaPessoa(e, h.nome)).length;
    const eficArea: Record<string, { concluidas: number; taxa: number | null }> = {};
    m.porArea.forEach((a) => { eficArea[a.area] = { concluidas: a.concluidas, taxa: a.taxa }; });
    return { id: h.id, nome: h.nome, cargo: h.cargo, load, folgasProximas: folgaCont.get(h.id) ?? 0, eficArea };
  });

  const aloc = sugerirSquad(areasComPeso, candidatos);
  const totalTarefas = areasComPeso.reduce((n, a) => n + a.tarefas, 0);

  return (
    <>
      <Link href={`/expand/board?c=${cli.id}`} className="ex-back">← Board de {cli.nome}</Link>
      <p className="hx-eyebrow">PMO · formação de squad</p>
      <h1 className="ex-h1">Squad de <span className="hx-accent-text">{cli.nome}</span></h1>
      <p className="ex-sub">O Gerente de Projetos sugere quem assume cada área, casando <b>eficiência na área</b> com <b>carga atual</b> e <b>folgas</b> — para ninguém estourar prazo, nem sobrecarregar, nem ficar ocioso. Revise e aprove; você pode trocar qualquer alocação.</p>

      {areasComPeso.length === 0 ? (
        <div className="hx-glass" style={{ padding: 22, borderRadius: 12, color: "var(--dim)", fontSize: 13 }}>Não há tarefas abertas nesta conta para distribuir. Prepare a esteira no board primeiro.</div>
      ) : (
        <>
          <div className="ex-kpis" style={{ marginBottom: 8 }}>
            <div className="ex-kpi hx-glass"><div className="lab">Áreas a cobrir</div><div className="val hx-accent-text">{areasComPeso.length}</div><div className="foot">nesta conta</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Tarefas abertas</div><div className="val">{totalTarefas}</div><div className="foot">a distribuir</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Candidatos</div><div className="val">{candidatos.length}</div><div className="foot">time humano</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Carga do time</div><div className="val" style={{ fontSize: 15 }}>{Math.round(candidatos.reduce((s, c) => s + c.load, 0) / Math.max(1, candidatos.length))}/pessoa</div><div className="foot">tarefas abertas hoje</div></div>
          </div>

          <form action={aplicarSquad}>
            <input type="hidden" name="clienteId" value={cli.id} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {aloc.map((a) => {
                const ar = AREAS[a.area];
                return (
                  <div key={a.area} className="hx-glass" style={{ padding: "13px 16px", borderRadius: 12, borderLeft: `3px solid ${ar?.cor ?? "var(--accent)"}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 150, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: ar?.cor ?? "var(--txt)" }}>{ar?.n ?? a.area}</div>
                      <div style={{ fontSize: 11, color: "var(--dim)" }}>{a.tarefas} tarefa(s) aberta(s)</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Sugestão: <b style={{ color: "var(--accent)" }}>{a.escolhido?.nome ?? "—"}</b> — {a.motivo}</div>
                      {a.alternativas.length ? <div style={{ fontSize: 10.5, color: "var(--dim)" }}>alternativas: {a.alternativas.map((x) => `${x.nome} (${x.score})`).join(" · ")}</div> : null}
                    </div>
                    <input type="hidden" name="alocArea" value={a.area} />
                    <select name="alocPessoa" defaultValue={a.escolhido?.nome ?? ""} style={selStyle}>
                      {candidatos.map((c) => <option key={c.id} value={c.nome}>{c.nome} · carga {c.load}{c.folgasProximas ? ` · ${c.folgasProximas} folga(s)` : ""}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="hx-btn hx-btn-primary" type="submit">✓ Aprovar e aplicar squad</button>
              <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Define o responsável das tarefas abertas de cada área desta conta.</span>
            </div>
          </form>
        </>
      )}
    </>
  );
}
