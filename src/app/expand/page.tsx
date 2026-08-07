import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { derive, contasDe, type ClienteRow } from "@/lib/expand";
import { getPessoa } from "@/lib/expand-user";
import { type EtapaRow } from "@/lib/expand-tarefas";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import { iniciarEtapa, concluirEtapa, salvarNota, justificarAtraso } from "@/app/expand/actions";
import BlocoNotas from "@/components/expand/BlocoNotas";
import Timer from "@/components/expand/Timer";

export const dynamic = "force-dynamic";

function slaDias(sla: string | null): number | null {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}
const diasDesde = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : null);
function isoMonday(offsetSemanas = 0): string {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day) + offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}
function addISO(iso: string, n: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
const PMO = ["ana", "pedro", "gerente-projetos"];

function Cal({ marcados }: { marcados: { dia: number; marco: boolean }[] }) {
  const hoje = new Date(); const y = hoje.getFullYear(), m = hoje.getMonth();
  const inicio = new Date(y, m, 1).getDay(); const dias = new Date(y, m + 1, 0).getDate();
  const map = new Map<number, boolean>(); marcados.forEach((x) => map.set(x.dia, map.get(x.dia) || x.marco));
  const cont = new Map<number, number>(); marcados.forEach((x) => cont.set(x.dia, (cont.get(x.dia) ?? 0) + 1));
  const cells: (number | null)[] = []; for (let i = 0; i < inicio; i++) cells.push(null); for (let d = 1; d <= dias; d++) cells.push(d);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, fontSize: 9, color: "var(--dim)", textAlign: "center", marginBottom: 3 }}>{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((d, i) => {
          if (d == null) return <span key={i} />;
          const ehHoje = d === hoje.getDate(); const n = cont.get(d) ?? 0; const marco = map.get(d);
          return (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, position: "relative", border: ehHoje ? "1px solid var(--accent)" : "1px solid transparent", background: n ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel-2)", color: ehHoje ? "var(--accent)" : "var(--mut)", fontWeight: ehHoje ? 800 : 400 }}>
              {d}{marco ? <span style={{ position: "absolute", top: 1, right: 3, color: "var(--accent)", fontSize: 7 }}>◆</span> : n ? <span style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tarefa({ e, cliNome, atrasada }: { e: EtapaRow; cliNome: string; atrasada?: boolean }) {
  const ar = e.area ? AREAS[e.area] : null;
  const cor = e.bloqueado || atrasada ? "var(--red)" : e.status === "run" ? "var(--accent)" : "var(--dim)";
  const ajuda = `${e.gatilho ? `Começa: ${e.gatilho}. ` : ""}Conclui quando: ${e.criterio ?? "—"}. Responsável: ${e.responsavel_atual ?? e.responsavel}.`;
  return (
    <div className="ex-arq hx-glass" style={{ marginBottom: 6, borderLeft: `3px solid ${cor}`, flexWrap: "wrap" }}>
      <div className="an" style={{ minWidth: 0 }}>
        {e.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{e.titulo}
        <span className="ex-help" title={ajuda}>?</span>
        {e.bloqueado ? <span className="ex-pill" style={{ marginLeft: 6, background: "color-mix(in srgb,var(--red) 15%,transparent)", color: "var(--red)" }}>bloqueada</span> : null}
        {e.chamado ? <span className="ex-pill" style={{ marginLeft: 6, background: "color-mix(in srgb,var(--warn) 15%,transparent)", color: "var(--warn)" }}>chamado</span> : null}
        <div className="am"><b style={{ color: "var(--accent)" }}>{cliNome}</b>{ar ? ` · ${ar.n}` : ""}{e.agente ? ` · ⚡${AG_NOME[e.agente]}` : ""} · SLA {e.sla}{atrasada ? " · atrasada" : ""}</div>
        {atrasada ? (
          <form action={justificarAtraso} style={{ display: "flex", gap: 5, marginTop: 5 }}>
            <input type="hidden" name="etapaId" value={e.id} />
            <input name="justificativa" defaultValue={e.justificativa ?? ""} placeholder="justificativa rápida do atraso…" style={{ flex: 1, minWidth: 120, background: "var(--bg)", border: "1px solid color-mix(in srgb,var(--red) 30%,var(--line-2))", borderRadius: 7, color: "var(--txt)", padding: "5px 8px", fontSize: 11.5, outline: "none", fontFamily: "inherit" }} />
            <button className="ex-arqbtn" type="submit">ok</button>
          </form>
        ) : null}
      </div>
      {e.status === "run" && e.iniciada_em ? <Timer start={e.iniciada_em} /> : null}
      <Link href={`/expand/etapa/${e.id}`} className="ex-arqbtn">Abrir</Link>
      {e.status === "idle" ? <form action={iniciarEtapa}><input type="hidden" name="etapaId" value={e.id} /><button className="ex-arqbtn ok" type="submit">▶ Executar</button></form> : null}
      {e.status === "run" ? <form action={concluirEtapa}><input type="hidden" name="etapaId" value={e.id} /><button className="ex-arqbtn ok" type="submit">✓ Concluir</button></form> : null}
    </div>
  );
}

export default async function MeuDia({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = sp.range ?? "dia";
  const { pessoa } = await getPessoa();
  const supabase = await createClient();

  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true);
  const clientesRaw = (data ?? []) as ClienteRow[];
  const clientes = clientesRaw.map(derive);
  const cliMap = new Map(clientesRaw.map((c) => [c.id, c.nome]));
  const { minhas, esperando } = contasDe(pessoa.id, clientes);

  const nomeSafe = pessoa.nome.replace(/[,()·]/g, " ").trim();
  const { data: etData } = await supabase.from("expand_etapas").select("*")
    .or(`responsavel_atual.eq.${pessoa.nome},responsavel.ilike.%${nomeSafe}%`).order("ordem").limit(300);
  let myEtapas = (etData ?? []) as EtapaRow[];
  // visibilidade: PMO vê tudo; equipe vê só até a próxima semana
  const veTudo = PMO.includes(pessoa.id);
  if (!veTudo) myEtapas = myEtapas.filter((e) => !e.data_prevista || (e.data_prevista as string) < isoMonday(2));

  // filtro do painel por horizonte (Hoje / Semana / Mês)
  const hoje = new Date(); const y = hoje.getFullYear(), m = hoje.getMonth();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const inicio = range === "mes" ? `${y}-${String(m + 1).padStart(2, "0")}-01` : range === "semana" ? isoMonday(0) : hojeISO;
  const fim = range === "mes" ? new Date(y, m + 1, 0).toISOString().slice(0, 10) : range === "semana" ? addISO(isoMonday(1), -1) : hojeISO;
  const noHoriz = (e: EtapaRow) => e.status === "run" || e.bloqueado || !e.data_prevista || (e.data_prevista <= hojeISO) || (e.data_prevista >= inicio && e.data_prevista <= fim);

  const atrasadaDe = (e: EtapaRow) => e.status === "run" && !e.bloqueado && slaDias(e.sla) != null && (diasDesde(e.iniciada_em) ?? 0) > slaDias(e.sla)!;
  const ativas = myEtapas.filter((e) => (e.status === "run" || e.status === "idle") && noHoriz(e));
  const atrasadas = ativas.filter((e) => atrasadaDe(e) || e.bloqueado);
  const emExec = ativas.filter((e) => e.status === "run" && !atrasadaDe(e) && !e.bloqueado);
  const fila = ativas.filter((e) => e.status === "idle" && !e.bloqueado);
  const concluidas = myEtapas.filter((e) => e.status === "done" && e.concluida_em && e.concluida_em.slice(0, 10) >= inicio && e.concluida_em.slice(0, 10) <= fim);

  const ids = myEtapas.map((e) => e.id);
  let pendentes = 0;
  if (ids.length) { const { count } = await supabase.from("expand_arquivos").select("id", { count: "exact", head: true }).in("etapa_id", ids).eq("status", "pendente"); pendentes = count ?? 0; }
  const durs = myEtapas.filter((e) => e.duracao_min != null).map((e) => e.duracao_min as number);
  const tempoMedio = durs.length ? Math.round(durs.reduce((s, n) => s + n, 0) / durs.length) : null;

  const { data: logData } = await supabase.from("expand_log").select("autor, criado_em").gte("criado_em", new Date(Date.now() - 12 * 3600e3).toISOString()).order("criado_em", { ascending: false }).limit(60);
  const ativos = [...new Set((logData ?? []).map((l) => l.autor as string).filter(Boolean))].slice(0, 8);
  const { data: notaData } = await supabase.from("expand_notas").select("conteudo, cor").eq("membro_id", pessoa.id).maybeSingle();
  const { data: perfMe } = await supabase.from("expand_perfis").select("ics_token").eq("id", pessoa.id).maybeSingle();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const icsUrl = perfMe?.ics_token ? `${site}/api/calendario/${perfMe.ics_token}.ics` : null;

  const marcados = myEtapas.map((e) => { const iso = e.data_prevista ? e.data_prevista + "T00:00:00" : (e.concluida_em ?? e.iniciada_em); return iso ? { dia: new Date(iso).getDate(), marco: e.marco, mes: new Date(iso).getMonth() } : null; })
    .filter((x): x is { dia: number; marco: boolean; mes: number } => !!x && x.mes === m);

  const totalAtivas = atrasadas.length + emExec.length + fila.length;

  return (
    <>
      <p className="hx-eyebrow">{hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {pessoa.papel}</p>
      <h1 className="ex-h1">Bom dia, <span className="hx-accent-text">{pessoa.nome}</span></h1>
      <p className="ex-sub">Suas tarefas — atrasadas e bloqueadas primeiro. Filtre por Hoje / Semana / Mês, abra pra executar, e acompanhe o time e o calendário ao lado.</p>

      <div className="ex-chips" style={{ marginBottom: 14 }}>
        {[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"]].map(([k, l]) => (
          <Link key={k} href={`/expand?range=${k}`} className={`ex-chip2${range === k ? " on" : ""}`}>{l}</Link>
        ))}
      </div>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Tarefas ({range === "mes" ? "mês" : range === "semana" ? "semana" : "hoje"})</div><div className="val hx-accent-text">{totalAtivas}</div><div className="foot">Ativas na sua mão</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Atrasadas / bloqueadas</div><div className="val" style={{ color: atrasadas.length ? "var(--red)" : "var(--green)" }}>{atrasadas.length}</div><div className="foot">Resolver primeiro</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Aprovações pendentes</div><div className="val" style={{ color: pendentes ? "var(--warn)" : "var(--dim)" }}>{pendentes}</div><div className="foot">Entregáveis aguardando</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Tempo médio</div><div className="val" style={{ fontSize: 17 }}>{tempoMedio != null ? (tempoMedio < 60 ? `${tempoMedio}min` : `${Math.round(tempoMedio / 60)}h`) : "—"}</div><div className="foot">Execução por tarefa</div></div>
      </div>

      <div className="ex-dash">
        <div>
          {[["Atrasadas e bloqueadas", atrasadas, "var(--red)"], ["Em execução", emExec, "var(--accent)"], ["Na fila", fila, "var(--dim)"]].map(([t, arr, c]) => {
            const a = arr as EtapaRow[]; if (!a.length) return null;
            return (
              <div key={t as string}>
                <div className="ex-grph"><span className="gt" style={{ color: c as string }}>{t as string}</span><span className="gc">{a.length}</span><span className="gl" /></div>
                {a.map((e) => <Tarefa key={e.id} e={e} cliNome={cliMap.get(e.cliente_id) ?? "—"} atrasada={atrasadaDe(e) || e.bloqueado} />)}
              </div>
            );
          })}
          {totalAtivas === 0 ? <div className="hx-glass" style={{ padding: "20px 22px", color: "var(--mut)" }}>Nada de tarefa ativa neste período. 👌</div> : null}

          {concluidas.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="ex-grph"><span className="gt" style={{ color: "var(--green)" }}>Concluídas no período</span><span className="gc">{concluidas.length}</span><span className="gl" /></div>
              {concluidas.slice(0, 20).map((e) => (
                <div key={e.id} className="ex-arq hx-glass" style={{ marginBottom: 6, borderLeft: "3px solid var(--green)" }}>
                  <div className="an">{e.titulo}<div className="am"><b style={{ color: "var(--accent)" }}>{cliMap.get(e.cliente_id) ?? "—"}</b>{e.duracao_min != null ? ` · ${e.duracao_min < 60 ? `${e.duracao_min}min` : `${Math.round(e.duracao_min / 60)}h`}` : ""} · {e.concluida_em ? new Date(e.concluida_em).toLocaleDateString("pt-BR") : ""}</div></div>
                  <Link href={`/expand/etapa/${e.id}`} className="ex-arqbtn">Abrir</Link>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside>
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Calendário</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>◆ marcos · • tarefas</span></div>
            <div className="pb"><Cal marcados={marcados} /></div>
          </div>

          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Equipe ativa</span><span className="pc">{ativos.length}</span></div>
            <div className="pb">
              {ativos.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ativos.map((n) => <span key={n} className="ex-chip" style={{ ["--ac" as string]: "var(--green)" }}>{n}</span>)}</div> : <span style={{ fontSize: 12, color: "var(--dim)" }}>Ninguém ativo nas últimas horas.</span>}
              <Link href="/expand/sala" className="hx-btn hx-btn-ghost" style={{ marginTop: 10, padding: "7px 13px", fontSize: 12, display: "inline-block" }}>Abrir sala do time ↗</Link>
            </div>
          </div>

          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Meu calendário (Google)</span></div>
            <div className="pb">
              <p style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 8, lineHeight: 1.5 }}>Assine no Google/Apple Calendar (Adicionar por URL). Também dá pra conectar no seu perfil.</p>
              {icsUrl ? (<><code style={{ display: "block", fontSize: 10.5, color: "var(--accent)", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "7px 9px", wordBreak: "break-all" }}>{icsUrl}</code>{!site ? <p style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 6 }}>URL completa após o deploy.</p> : null}</>) : <span style={{ fontSize: 12, color: "var(--dim)" }}>Link indisponível.</span>}
            </div>
          </div>

          <BlocoNotas inicial={(notaData?.conteudo as string) ?? ""} corInicial={(notaData?.cor as string) ?? "amarelo"} salvar={salvarNota} />
        </aside>
      </div>
    </>
  );
}
