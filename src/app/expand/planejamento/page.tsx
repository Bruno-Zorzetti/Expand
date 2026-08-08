import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { AREAS } from "@/lib/expand-esteira";
import { agendarEtapa } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Et = { id: string; titulo: string; area: string | null; responsavel: string | null; responsavel_atual: string | null; sla: string | null; status: string; marco: boolean; data_prevista: string | null; cliente_id: string };
type Vista = "dia" | "semana" | "mes";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s?: string) => { const d = s ? new Date(s + "T00:00:00") : new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default async function Planejamento({ searchParams }: { searchParams: Promise<{ v?: string; d?: string; c?: string }> }) {
  const sp = await searchParams;
  const vista: Vista = sp.v === "dia" || sp.v === "mes" ? sp.v : "semana";
  const anchor = parse(sp.d);
  const { pessoa } = await getPessoa();
  const supabase = await createClient();

  const { data: cData } = await supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome");
  const clientes = (cData ?? []) as { id: string; nome: string }[];
  const nomeCli = new Map(clientes.map((c) => [c.id, c.nome]));
  const filtroCli = sp.c && clientes.some((c) => c.id === sp.c) ? sp.c : "";

  // tarefas ativas da PESSOA (escopo pelo seletor/login), opcionalmente de um cliente
  let q = supabase.from("expand_etapas")
    .select("id, titulo, area, responsavel, responsavel_atual, sla, status, marco, data_prevista, cliente_id")
    .in("status", ["run", "idle"])
    .or(`responsavel_atual.ilike.%${pessoa.nome}%,responsavel.ilike.%${pessoa.nome}%`);
  if (filtroCli) q = q.eq("cliente_id", filtroCli);
  const { data: etData } = await q.order("data_prevista", { nullsFirst: false });
  const etapas = (etData ?? []) as Et[];

  // período [ini, fim)
  let ini: Date, fim: Date, gridDias: Date[] = [];
  if (vista === "dia") { ini = anchor; fim = addDays(anchor, 1); gridDias = [anchor]; }
  else if (vista === "semana") { ini = monday(anchor); fim = addDays(ini, 7); gridDias = Array.from({ length: 7 }, (_, i) => addDays(ini, i)); }
  else { ini = new Date(anchor.getFullYear(), anchor.getMonth(), 1); fim = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1); const g0 = monday(ini); gridDias = Array.from({ length: 42 }, (_, i) => addDays(g0, i)); }
  const iniS = ymd(ini), fimS = ymd(fim);

  const noPeriodo = etapas.filter((e) => e.data_prevista && e.data_prevista >= iniS && e.data_prevista < fimS);
  const semData = etapas.filter((e) => !e.data_prevista);
  const doDia = (d: Date) => etapas.filter((e) => e.data_prevista === ymd(d));

  const hojeS = ymd(new Date());
  const label = vista === "dia" ? anchor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "long" })
    : vista === "semana" ? `${ini.getDate()}–${addDays(ini, 6).getDate()} de ${MESES[addDays(ini, 6).getMonth()]}`
      : `${MESES[anchor.getMonth()]} de ${anchor.getFullYear()}`;
  const passo = (dir: number) => vista === "dia" ? ymd(addDays(anchor, dir)) : vista === "semana" ? ymd(addDays(anchor, dir * 7)) : ymd(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  const q0 = (o: { v?: string; d?: string; c?: string }) => { const p = new URLSearchParams(); if (o.v ?? vista) p.set("v", o.v ?? vista); if (o.d) p.set("d", o.d); const cc = o.c ?? filtroCli; if (cc) p.set("c", cc); return `/expand/planejamento?${p.toString()}`; };

  const tab = (v: Vista, l: string) => (
    <Link href={q0({ v, d: sp.d })} className="ex-chip2" style={{ background: vista === v ? "color-mix(in srgb,var(--accent) 16%,transparent)" : undefined, borderColor: vista === v ? "var(--accent)" : undefined, color: vista === v ? "var(--accent)" : undefined }}>{l}</Link>
  );
  const inp: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "5px 7px", fontSize: 12, outline: "none" };

  const Card = (e: Et, compact = false) => {
    const ar = e.area ? AREAS[e.area] : null;
    return (
      <div key={e.id} className={compact ? "" : "ex-arq hx-glass"} style={compact ? { fontSize: 11, color: "var(--mut)", borderLeft: `2px solid ${e.marco ? "var(--accent)" : ar ? ar.cor : "var(--line-2)"}`, paddingLeft: 6, marginBottom: 4, lineHeight: 1.3 } : { marginBottom: 6, borderLeft: `3px solid ${e.marco ? "var(--accent)" : ar ? ar.cor : "var(--line-2)"}`, flexWrap: "wrap" }}>
        {compact ? (
          <Link href={`/expand/etapa/${e.id}`} style={{ color: "inherit", textDecoration: "none" }}>{e.marco ? "◆ " : ""}{e.titulo}</Link>
        ) : (<>
          <div className="an" style={{ minWidth: 180 }}>
            <Link href={`/expand/etapa/${e.id}`} style={{ color: "inherit", textDecoration: "none" }}>{e.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{e.titulo}</Link>
            <div className="am">{nomeCli.get(e.cliente_id) ?? "—"} · {ar ? ar.n : "—"} · SLA {e.sla} · {e.status === "run" ? "em execução" : "na fila"}{e.data_prevista ? ` · 📅 ${e.data_prevista.slice(8)}/${e.data_prevista.slice(5, 7)}` : ""}</div>
          </div>
          <form action={agendarEtapa} style={{ display: "flex", gap: 4 }}><input type="hidden" name="etapaId" value={e.id} /><input type="date" name="data" defaultValue={e.data_prevista ?? ""} style={inp} /><button className="ex-arqbtn" type="submit">Agendar</button></form>
          {e.data_prevista ? <form action={agendarEtapa}><input type="hidden" name="etapaId" value={e.id} /><input type="hidden" name="data" value="" /><button className="ex-arqbtn no" type="submit">Limpar</button></form> : null}
        </>)}
      </div>
    );
  };

  return (
    <>
      <p className="hx-eyebrow">Planejamento · {pessoa.nome}</p>
      <h1 className="ex-h1">Sua <span className="hx-accent-text">agenda</span></h1>
      <p className="ex-sub">As tarefas de <b style={{ color: "var(--txt)" }}>{pessoa.nome}</b> por dia, semana ou mês — filtre por cliente e navegue pela data. O que você agendar vira a agenda da pessoa e o calendário (ICS). Troque a pessoa no seletor do topo (ou é o seu login).</p>

      {/* controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>{tab("dia", "Dia")}{tab("semana", "Semana")}{tab("mes", "Mês")}</div>
        <span style={{ width: 1, height: 20, background: "var(--line)" }} />
        <Link href={q0({ d: passo(-1) })} className="ex-arqbtn">‹</Link>
        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
        <Link href={q0({ d: passo(1) })} className="ex-arqbtn">›</Link>
        <Link href={q0({ d: hojeS })} className="ex-arqbtn" style={{ fontSize: 11.5 }}>Hoje</Link>
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--dim)" }}>{noPeriodo.length} no período · {semData.length} sem data</span>
      </div>

      {/* filtro de cliente */}
      <div className="ex-chips" style={{ marginBottom: 14 }}>
        <Link href={q0({ c: "" })} className={`ex-chip2${!filtroCli ? " on" : ""}`}>Todos os clientes</Link>
        {clientes.map((c) => <Link key={c.id} href={q0({ c: c.id })} className={`ex-chip2${filtroCli === c.id ? " on" : ""}`}>{c.nome}</Link>)}
      </div>

      {/* corpo */}
      {vista === "mes" ? (
        <div className="hx-glass" style={{ borderRadius: 12, padding: 10, overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(120px,1fr))", gap: 4, minWidth: 840 }}>
            {DIAS.map((d) => <div key={d} style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, textAlign: "center", padding: "2px 0" }}>{d}</div>)}
            {gridDias.map((d) => {
              const outMes = d.getMonth() !== anchor.getMonth();
              const its = doDia(d); const hoje = ymd(d) === hojeS;
              return (
                <div key={ymd(d)} style={{ minHeight: 92, borderRadius: 8, border: `1px solid ${hoje ? "var(--accent)" : "var(--line)"}`, background: outMes ? "transparent" : "var(--panel-2)", padding: 6, opacity: outMes ? 0.4 : 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: hoje ? "var(--accent)" : "var(--dim)", marginBottom: 4 }}>{d.getDate()}</div>
                  {its.slice(0, 4).map((e) => Card(e, true))}
                  {its.length > 4 ? <div style={{ fontSize: 10, color: "var(--dim)" }}>+{its.length - 4}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : vista === "semana" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(150px,1fr))", gap: 8, overflowX: "auto" }}>
          {gridDias.map((d, i) => {
            const its = doDia(d); const hoje = ymd(d) === hojeS;
            return (
              <div key={ymd(d)} className="hx-glass" style={{ borderRadius: 10, padding: 10, border: hoje ? "1px solid var(--accent)" : undefined }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: hoje ? "var(--accent)" : "var(--mut)", marginBottom: 8 }}>{DIAS[i]} {d.getDate()}</div>
                {its.length ? its.map((e) => Card(e, true)) : <div style={{ fontSize: 11, color: "var(--dim)" }}>—</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div>{noPeriodo.length ? noPeriodo.map((e) => Card(e)) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhuma tarefa agendada para {label}.</p>}</div>
      )}

      {/* a agendar */}
      {semData.length ? (
        <>
          <div className="ex-grph" style={{ marginTop: 22 }}><span className="gt" style={{ color: "var(--warn)" }}>A agendar (sem data)</span><span className="gc">{semData.length}</span><span className="gl" /></div>
          {semData.map((e) => Card(e))}
        </>
      ) : null}
    </>
  );
}
