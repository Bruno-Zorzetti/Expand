import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { derive, contasDe, type ClienteRow } from "@/lib/expand";
import { getPessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { type EtapaRow } from "@/lib/expand-tarefas";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import { iniciarEtapa, concluirEtapa, salvarNota, excluirNota, justificarAtraso } from "@/app/expand/actions";
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
const TZ = "America/Sao_Paulo";
function brISO(): string { return new Intl.DateTimeFormat("sv", { timeZone: TZ }).format(new Date()); }
function isoMonday(offsetSemanas = 0): string {
  const base = brISO(); const d = new Date(base + "T12:00:00Z"); const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow) + offsetSemanas * 7);
  return d.toISOString().slice(0, 10);
}
function addISO(iso: string, n: number) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const PMO = ["ana", "pedro", "gerente-projetos"];
const saudacao = () => { const h = parseInt(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date())); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };

function Cal({ marcados, hojeISO, pinDate, cli }: { marcados: { dia: number; marco: boolean }[]; hojeISO: string; pinDate?: string; cli?: string }) {
  const [sy, sm1, sd] = hojeISO.split("-").map(Number); const m = sm1 - 1;
  const inicio = new Date(sy, m, 1).getDay(); const dias = new Date(sy, m + 1, 0).getDate();
  const map = new Map<number, boolean>(); marcados.forEach((x) => map.set(x.dia, map.get(x.dia) || x.marco));
  const cont = new Map<number, number>(); marcados.forEach((x) => cont.set(x.dia, (cont.get(x.dia) ?? 0) + 1));
  const cells: (number | null)[] = []; for (let i = 0; i < inicio; i++) cells.push(null); for (let d = 1; d <= dias; d++) cells.push(d);
  const toISO = (d: number) => `${sy}-${String(sm1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, fontSize: 9, color: "var(--dim)", textAlign: "center", marginBottom: 3 }}>{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((d, i) => {
          if (d == null) return <span key={i} />;
          const ehHoje = d === sd; const n = cont.get(d) ?? 0; const marco = map.get(d);
          const dateStr = toISO(d); const sel = pinDate === dateStr;
          const href = `?d=${dateStr}${cli ? `&c=${cli}` : ""}`;
          const inner = <>{d}{marco ? <span style={{ position: "absolute", top: 1, right: 3, color: "var(--accent)", fontSize: 7 }}>◆</span> : n ? <span style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: sel ? "#fff" : "var(--accent)" }} /> : null}</>;
          const cellStyle: React.CSSProperties = { aspectRatio: "1", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, position: "relative", border: sel ? "2px solid var(--accent)" : ehHoje ? "1px solid var(--accent)" : "1px solid transparent", background: sel ? "var(--accent)" : n ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel-2)", color: sel ? "#fff" : ehHoje ? "var(--accent)" : "var(--mut)", fontWeight: ehHoje || sel ? 800 : 400, textDecoration: "none" };
          return n > 0 ? <a key={i} href={href} style={cellStyle}>{inner}</a> : <div key={i} style={cellStyle}>{inner}</div>;
        })}
      </div>
      {pinDate && <a href={cli ? `?c=${cli}` : "?"} style={{ display: "block", marginTop: 6, fontSize: 10, color: "var(--accent)", textAlign: "center", textDecoration: "none" }}>← Ver todas as datas</a>}
    </div>
  );
}

function StatusChip({ status, atrasada, bloqueado }: { status: string; atrasada?: boolean; bloqueado?: boolean }) {
  if (bloqueado) return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "color-mix(in srgb,var(--red) 12%,transparent)", color: "var(--red)", letterSpacing: ".02em" }}>● Bloqueada</span>;
  if (atrasada) return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "color-mix(in srgb,var(--red) 12%,transparent)", color: "var(--red)", letterSpacing: ".02em" }}>⚠ Atrasada</span>;
  if (status === "run") return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "color-mix(in srgb,var(--accent) 14%,transparent)", color: "var(--accent)", letterSpacing: ".02em" }}>▶ Em execução</span>;
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "var(--panel-2)", color: "var(--dim)", letterSpacing: ".02em" }}>○ Na fila</span>;
}

function Tarefa({ e, cliNome, atrasada }: { e: EtapaRow; cliNome: string; atrasada?: boolean }) {
  const ar = e.area ? AREAS[e.area] : null;
  const corBorda = e.bloqueado || atrasada ? "var(--red)" : e.status === "run" ? "var(--accent)" : "var(--line-2)";
  const ajuda = `${e.gatilho ? `Começa: ${e.gatilho}. ` : ""}Conclui quando: ${e.criterio ?? "—"}. Responsável: ${e.responsavel_atual ?? e.responsavel}.`;
  return (
    <div className="hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${corBorda}`, borderRadius: 12, padding: "12px 14px" }}>
      {/* Linha 1: título + chips */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--txt)", minWidth: 0, lineHeight: 1.3 }}>
          {e.marco ? <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span> : null}
          {e.titulo}
          <span className="ex-help" title={ajuda} style={{ marginLeft: 5, fontSize: 11, color: "var(--dim)", cursor: "help" }}>?</span>
        </span>
        <StatusChip status={e.status} atrasada={atrasada} bloqueado={e.bloqueado ?? false} />
      </div>

      {/* Linha 2: meta info */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", fontWeight: 600 }}>
          {cliNome}
        </span>
        {ar && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: "var(--mut)" }}>{ar.n}</span>}
        {e.agente && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: "var(--mut)" }}>⚡ {AG_NOME[e.agente]}</span>}
        {e.sla && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: atrasada ? "var(--red)" : "var(--mut)" }}>⏱ {e.sla}</span>}
        {e.chamado && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "color-mix(in srgb,var(--warn) 15%,transparent)", color: "var(--warn)" }}>chamado aberto</span>}
      </div>

      {/* Campo de justificativa se atrasada */}
      {atrasada && (
        <form action={justificarAtraso} style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          <input type="hidden" name="etapaId" value={e.id} />
          <input name="justificativa" defaultValue={e.justificativa ?? ""} placeholder="Justificativa do atraso…" style={{ flex: 1, minWidth: 120, background: "var(--bg)", border: "1px solid color-mix(in srgb,var(--red) 30%,var(--line-2))", borderRadius: 7, color: "var(--txt)", padding: "5px 8px", fontSize: 11.5, outline: "none", fontFamily: "inherit" }} />
          <button className="ex-arqbtn" type="submit">salvar</button>
        </form>
      )}

      {/* Linha de ações */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {e.status === "run" && e.iniciada_em ? <Timer start={e.iniciada_em} /> : null}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <Link href={`/expand/etapa/${e.id}`} className="ex-arqbtn">Detalhes</Link>
          {e.status === "idle" && (
            <form action={iniciarEtapa}><input type="hidden" name="etapaId" value={e.id} /><button className="ex-arqbtn ok" type="submit">▶ Iniciar</button></form>
          )}
          {e.status === "run" && (
            <form action={concluirEtapa}><input type="hidden" name="etapaId" value={e.id} /><button className="ex-arqbtn ok" type="submit">✓ Concluir</button></form>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function MeuDia({ searchParams }: { searchParams: Promise<{ range?: string; c?: string; d?: string }> }) {
  const sp = await searchParams;
  const range = sp.range ?? "dia";
  const filtroCli = sp.c ?? "";
  const pinDate = sp.d ?? "";
  const { pessoa } = await getPessoa();
  const acesso = await getAcesso();
  redirect("/expand/v2");
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
  // visibilidade: PMO e admin vêem 2 semanas; equipe vê só esta semana
  const veTudo = PMO.includes(pessoa.id) || acesso.isAdmin || acesso.acessos.includes("pmo");
  if (!veTudo) myEtapas = myEtapas.filter((e) => !e.data_prevista || (e.data_prevista as string) < isoMonday(2));

  // filtro do painel por horizonte (Hoje / Semana / Mês) — datas em fuso de Brasília
  const hojeISO = brISO();
  const [yy, mm] = hojeISO.split("-").map(Number); // mm é 1-indexed
  const inicio = pinDate || (range === "mes" ? `${yy}-${String(mm).padStart(2, "0")}-01` : range === "semana" ? isoMonday(0) : hojeISO);
  const fim = pinDate || (range === "mes" ? `${yy}-${String(mm).padStart(2, "0")}-${String(new Date(yy, mm, 0).getDate()).padStart(2, "0")}` : range === "semana" ? addISO(isoMonday(1), -1) : hojeISO);
  const atrasadaDe = (e: EtapaRow) =>
    e.bloqueado ||
    (e.status === "run" && slaDias(e.sla) != null && (diasDesde(e.iniciada_em) ?? 0) > slaDias(e.sla)!) ||
    (e.status === "idle" && !!e.data_prevista && e.data_prevista < hojeISO);
  const noHoriz = (e: EtapaRow) => {
    if (e.status === "run" || atrasadaDe(e)) return true;
    if (pinDate) return e.data_prevista === pinDate;
    if (!e.data_prevista) return true;
    return e.data_prevista >= inicio && e.data_prevista <= fim;
  };
  const ativas = myEtapas.filter((e) => (e.status === "run" || e.status === "idle") && noHoriz(e));
  const ativasVis = filtroCli ? ativas.filter((e) => e.cliente_id === filtroCli) : ativas;
  const atrasadas = ativasVis.filter((e) => atrasadaDe(e));
  const emExec = ativasVis.filter((e) => e.status === "run" && !atrasadaDe(e));
  const fila = ativasVis.filter((e) => e.status === "idle" && !atrasadaDe(e));
  const conclBase = filtroCli ? myEtapas.filter((e) => e.cliente_id === filtroCli) : myEtapas;
  const concluidas = conclBase.filter((e) => e.status === "done" && e.concluida_em && e.concluida_em.slice(0, 10) >= inicio && e.concluida_em.slice(0, 10) <= fim);

  const ids = myEtapas.map((e) => e.id);
  let pendentes = 0;
  if (ids.length) { const { count } = await supabase.from("expand_arquivos").select("id", { count: "exact", head: true }).in("etapa_id", ids).eq("status", "pendente"); pendentes = count ?? 0; }
  const durs = myEtapas.filter((e) => e.duracao_min != null).map((e) => e.duracao_min as number);
  const tempoMedio = durs.length ? Math.round(durs.reduce((s, n) => s + n, 0) / durs.length) : null;

  const { data: logData } = await supabase.from("expand_log").select("autor, criado_em").gte("criado_em", new Date(Date.now() - 12 * 3600e3).toISOString()).order("criado_em", { ascending: false }).limit(60);
  const ativos = [...new Set((logData ?? []).map((l) => l.autor as string).filter(Boolean))].slice(0, 8);
  const { data: notasData } = await supabase.from("expand_notas").select("id, conteudo, cor").eq("membro_id", pessoa.id).order("atualizado_em", { ascending: true });
  const { data: perfMe } = await supabase.from("expand_perfis").select("ics_token").eq("id", pessoa.id).maybeSingle();
  const { data: cliAll } = await supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome");
  const clientesList = (cliAll ?? []) as { id: string; nome: string }[];
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const icsUrl = perfMe?.ics_token ? `${site}/api/calendario/${(perfMe as { ics_token: string }).ics_token}.ics` : null;

  const marcados = myEtapas.map((e) => { const iso = e.data_prevista ? e.data_prevista + "T00:00:00" : (e.concluida_em ?? e.iniciada_em); return iso ? { dia: new Date(iso).getDate(), marco: e.marco, mes: new Date(iso).getMonth() } : null; })
    .filter((x): x is { dia: number; marco: boolean; mes: number } => !!x && x.mes === mm - 1);

  const totalAtivas = atrasadas.length + emExec.length + fila.length;
  const pinDateLabel = pinDate ? new Date(pinDate + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "";

  return (
    <>
      <p className="hx-eyebrow">{new Date(hojeISO + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {pessoa.papel}</p>
      <h1 className="ex-h1">{saudacao()}, <span className="hx-accent-text">{pessoa.nome}</span></h1>
      <p className="ex-sub">Suas tarefas — atrasadas e bloqueadas primeiro. Filtre por Hoje / Semana / Mês, abra pra executar, e acompanhe o time e o calendário ao lado.</p>

      <div className="ex-chips" style={{ marginBottom: 8 }}>
        {[["dia", "Hoje"], ["semana", "Semana"], ["mes", "Mês"]].map(([k, l]) => (
          <Link key={k} href={`/expand?range=${k}${filtroCli ? `&c=${filtroCli}` : ""}`} className={`ex-chip2${!pinDate && range === k ? " on" : ""}`}>{l}</Link>
        ))}
        {pinDate && <span className="ex-chip2 on">{pinDateLabel}</span>}
      </div>

      {/* Filtro de cliente */}
      {clientesList.length > 1 && (
        <div className="ex-chips" style={{ marginBottom: 14 }}>
          <Link href={`/expand?range=${range}${pinDate ? `&d=${pinDate}` : ""}`} className={`ex-chip2${!filtroCli ? " on" : ""}`}>Todos os clientes</Link>
          {clientesList.map((c) => (
            <Link key={c.id} href={`/expand?range=${range}&c=${c.id}${pinDate ? `&d=${pinDate}` : ""}`} className={`ex-chip2${filtroCli === c.id ? " on" : ""}`}>{c.nome}</Link>
          ))}
        </div>
      )}

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Tarefas ({range === "mes" ? "mês" : range === "semana" ? "semana" : "hoje"})</div><div className="val hx-accent-text">{totalAtivas}</div><div className="foot">Ativas na sua mão</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Atrasadas / bloqueadas</div><div className="val" style={{ color: atrasadas.length ? "var(--red)" : "var(--green)" }}>{atrasadas.length}</div><div className="foot">Resolver primeiro</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Aprovações pendentes</div><div className="val" style={{ color: pendentes ? "var(--warn)" : "var(--dim)" }}>{pendentes}</div><div className="foot">Entregáveis aguardando</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Tempo médio</div><div className="val" style={{ fontSize: 17 }}>{tempoMedio != null ? (tempoMedio! < 60 ? `${tempoMedio!}min` : `${Math.round(tempoMedio! / 60)}h`) : "—"}</div><div className="foot">Execução por tarefa</div></div>
      </div>

      <div className="ex-dash">
        <div>
          {[["Atrasadas e bloqueadas", atrasadas, "var(--red)"], ["Em execução", emExec, "var(--accent)"], ["Na fila", fila, "var(--dim)"]].map(([t, arr, c]) => {
            const a = arr as EtapaRow[]; if (!a.length) return null;
            return (
              <div key={t as string}>
                <div className="ex-grph"><span className="gt" style={{ color: c as string }}>{t as string}</span><span className="gc">{a.length}</span><span className="gl" /></div>
                {a.map((e) => <Tarefa key={e.id} e={e} cliNome={cliMap.get(e.cliente_id) ?? "—"} atrasada={atrasadaDe(e)} />)}
              </div>
            );
          })}
          {totalAtivas === 0 ? <div className="hx-glass" style={{ padding: "20px 22px", color: "var(--mut)" }}>{pinDate ? `Nenhuma tarefa para ${pinDateLabel}.` : "Nada de tarefa ativa neste período."}</div> : null}

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
            <div className="pb">
              <Cal marcados={marcados} hojeISO={hojeISO} pinDate={pinDate || undefined} cli={filtroCli || undefined} />
              <Link href="/expand/planejamento" className="hx-btn hx-btn-ghost" style={{ marginTop: 10, padding: "6px 12px", fontSize: 11.5, display: "inline-block" }}>Abrir calendário completo ↗</Link>
            </div>
          </div>

          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Equipe ativa</span><span className="pc">{ativos.length}</span></div>
            <div className="pb">
              {ativos.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{ativos.map((n) => <span key={n} className="ex-chip" style={{ ["--ac" as string]: "var(--green)" }}>{n}</span>)}</div> : <span style={{ fontSize: 12, color: "var(--dim)" }}>Ninguém ativo nas últimas horas.</span>}
              <Link href="/expand/sala" className="hx-btn hx-btn-ghost" style={{ marginTop: 10, padding: "7px 13px", fontSize: 12, display: "inline-block" }}>Abrir sala do time ↗</Link>
            </div>
          </div>

          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Operações</span></div>
            <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { href: "/expand/gestao", icon: "📊", label: "Board gerencial", sub: "visão por conta / kanban / pessoa" },
                { href: `/expand/board${filtroCli ? `?c=${filtroCli}` : ""}`, icon: "📋", label: "Board de entrega", sub: "esteira do cliente por fase" },
                { href: `/expand/planejamento${filtroCli ? `?c=${filtroCli}` : ""}`, icon: "🗓", label: "Planejamento", sub: "agenda dia / semana / mês" },
                { href: "/expand/carteira", icon: "👥", label: "Carteira de clientes", sub: "status de todas as contas" },
              ].map((s) => (
                <Link key={s.href} href={s.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>{s.sub}</div>
                  </div>
                  <span style={{ marginLeft: "auto", color: "var(--dim)", fontSize: 14 }}>›</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Meu calendário (Google)</span></div>
            <div className="pb">
              <p style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 8, lineHeight: 1.5 }}>Assine no Google/Apple Calendar (Adicionar por URL). Também dá pra conectar no seu perfil.</p>
              {icsUrl ? (<><code style={{ display: "block", fontSize: 10.5, color: "var(--accent)", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "7px 9px", wordBreak: "break-all" }}>{icsUrl}</code>{!site ? <p style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 6 }}>URL completa após o deploy.</p> : null}</>) : <span style={{ fontSize: 12, color: "var(--dim)" }}>Link indisponível.</span>}
            </div>
          </div>

          <BlocoNotas notas={(notasData ?? []) as { id: string; conteudo: string; cor: string }[]} salvar={salvarNota} excluir={excluirNota} />
        </aside>
      </div>
    </>
  );
}
