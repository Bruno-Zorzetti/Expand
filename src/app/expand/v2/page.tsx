import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import { getPessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { iniciarEtapa, concluirEtapa } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Et = {
  id: string; titulo: string; cliente_id: string;
  area: string | null; responsavel: string | null; responsavel_atual: string | null;
  agente: string | null; sla: string | null; status: string;
  iniciada_em: string | null; concluida_em: string | null;
  data_prevista: string | null; marco: boolean; bloqueado: boolean | null;
  fase: number; ordem: number;
};

type EffSt = "late" | "run" | "wait" | "idle" | "done";
const ST: Record<EffSt, { l: string; c: string; bg: string; bdr: string }> = {
  late: { l: "Atrasada",     c: "var(--red)",    bg: "color-mix(in srgb,var(--red) 10%,transparent)",    bdr: "var(--red)"    },
  run:  { l: "Em andamento", c: "var(--accent)",  bg: "color-mix(in srgb,var(--accent) 10%,transparent)", bdr: "var(--accent)" },
  wait: { l: "Em revisão",   c: "var(--warn)",   bg: "color-mix(in srgb,var(--warn) 10%,transparent)",   bdr: "var(--warn)"   },
  idle: { l: "A fazer",      c: "var(--dim)",    bg: "var(--panel-2)",                                    bdr: "var(--line-2)" },
  done: { l: "Concluída",    c: "var(--green)",  bg: "color-mix(in srgb,var(--green) 10%,transparent)",  bdr: "var(--green)"  },
};
const COLS: EffSt[] = ["late", "run", "wait", "idle", "done"];

function slaDias(sla: string | null) {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}

function diasDesde(iso: string | null) {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 864e5;
}

export default async function V2({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const view   = (sp.v   as string) || "lista";
  const scope  = (sp.s   as string) || "mine";
  const grupo  = (sp.g   as string) || "cliente";
  const filtroCli  = (sp.c  as string) || "";
  const filtroSt   = (sp.st as string) || "";
  const filtroArea = (sp.a  as string) || "";
  const filtroResp = (sp.r  as string) || "";

  const { pessoa }  = await getPessoa();
  const { isAdmin } = await getAcesso();
  const supabase    = await createClient();

  // Build query
  let q = supabase.from("expand_etapas")
    .select("id,titulo,cliente_id,area,responsavel,responsavel_atual,agente,sla,status,iniciada_em,concluida_em,data_prevista,marco,bloqueado,fase,ordem")
    .order("fase").order("ordem");

  if (scope === "mine") {
    q = q.or(`responsavel_atual.eq.${pessoa.nome},responsavel.ilike.%${pessoa.nome}%`);
  }
  if (filtroCli)  q = q.eq("cliente_id", filtroCli);
  if (filtroArea) q = q.eq("area", filtroArea);

  const { data: etData } = await q.limit(600);
  let etapas = (etData ?? []) as Et[];

  // Pending approvals map
  const pendMap = new Map<string, number>();
  if (etapas.length) {
    const ids = etapas.map(e => e.id);
    const { data: arqs } = await supabase.from("expand_arquivos")
      .select("etapa_id").eq("status", "pendente").in("etapa_id", ids);
    (arqs ?? []).forEach((a: { etapa_id: string }) =>
      pendMap.set(a.etapa_id, (pendMap.get(a.etapa_id) ?? 0) + 1));
  }

  const { data: cliData } = await supabase.from("expand_clientes").select("id,nome").order("nome");
  const clientes = (cliData ?? []) as { id: string; nome: string }[];
  const cliMap   = new Map(clientes.map(c => [c.id, c.nome]));

  const hojeISO = new Intl.DateTimeFormat("sv", { timeZone: "America/Sao_Paulo" }).format(new Date());

  function eff(e: Et): EffSt {
    if (e.status === "done") return "done";
    if (e.bloqueado) return "late";
    if (pendMap.get(e.id)) return "wait";
    if (e.status === "run") {
      const d = slaDias(e.sla), el = diasDesde(e.iniciada_em);
      if (d != null && el != null && el > d) return "late";
      return "run";
    }
    if (e.status === "idle" && e.data_prevista && e.data_prevista < hojeISO) return "late";
    return "idle";
  }

  if (filtroSt)   etapas = etapas.filter(e => eff(e) === filtroSt);
  if (filtroResp) etapas = etapas.filter(e => (e.responsavel_atual ?? e.responsavel) === filtroResp);

  const stats = { total: etapas.length, late: 0, run: 0, done: 0, idle: 0, wait: 0 };
  etapas.forEach(e => { const s = eff(e); stats[s]++; });

  // QS builder
  const qs = (patch: Partial<Record<string, string>>) => {
    const base: Record<string, string> = { v: view, s: scope, g: grupo };
    if (filtroCli)  base.c  = filtroCli;
    if (filtroSt)   base.st = filtroSt;
    if (filtroArea) base.a  = filtroArea;
    if (filtroResp) base.r  = filtroResp;
    const merged = { ...base, ...patch };
    const parts = Object.entries(merged).filter((p): p is [string, string] => !!p[1]).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
    return `/expand/v2${parts.length ? "?" + parts.join("&") : ""}`;
  };

  const resps = [...new Set(etapas.map(e => e.responsavel_atual ?? e.responsavel).filter(Boolean))].sort() as string[];
  const areas = [...new Set(etapas.map(e => e.area).filter(Boolean))].sort() as string[];

  const selCss: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "6px 10px", fontSize: 12, outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  };

  const pct = stats.total ? Math.round(stats.done / stats.total * 100) : 0;

  // Board card renderer
  function BoardCard(e: Et) {
    const s  = eff(e);
    const st = ST[s];
    const ar = e.area ? AREAS[e.area] : null;
    const resp = e.responsavel_atual ?? e.responsavel;
    const isPast = e.data_prevista && e.data_prevista < hojeISO;
    const dateStr = e.data_prevista
      ? new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      : null;

    return (
      <div key={e.id} className="hx-glass" style={{
        borderRadius: 10, padding: "12px 14px", marginBottom: 8,
        borderLeft: `3px solid ${st.bdr}`,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", marginBottom: 7, lineHeight: 1.35 }}>
          {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
          {e.titulo}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 9 }}>
          {cliMap.get(e.cliente_id) && (
            <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "color-mix(in srgb,var(--accent) 13%,transparent)", color: "var(--accent)", fontWeight: 600 }}>
              {cliMap.get(e.cliente_id)}
            </span>
          )}
          {ar && (
            <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: ar.cor, fontWeight: 600 }}>{ar.n}</span>
          )}
          {e.agente && (
            <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: "var(--dim)" }}>
              ⚡ {AG_NOME[e.agente] ?? e.agente}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {resp && <span style={{ fontSize: 11, color: "var(--dim)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resp}</span>}
          {e.sla && <span style={{ fontSize: 10.5, color: "var(--mut)" }}>SLA {e.sla}</span>}
          {dateStr && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: isPast ? "var(--red)" : "var(--mut)" }}>
              {isPast ? "⚠ " : "📅 "}{dateStr}
            </span>
          )}
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line-2)", color: "var(--dim)", textDecoration: "none", lineHeight: "normal" }}>→</Link>
            {e.status === "idle" && (
              <form action={iniciarEtapa} style={{ display: "contents" }}>
                <input type="hidden" name="etapaId" value={e.id} />
                <button type="submit" style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 6, border: "none", background: "color-mix(in srgb,var(--accent) 15%,transparent)", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", lineHeight: "normal" }}>▶</button>
              </form>
            )}
            {e.status === "run" && (
              <form action={concluirEtapa} style={{ display: "contents" }}>
                <input type="hidden" name="etapaId" value={e.id} />
                <button type="submit" style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 6, border: "none", background: "color-mix(in srgb,var(--green) 15%,transparent)", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", lineHeight: "normal" }}>✓</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- List view helpers ----
  type Grupo = { label: string; items: Et[]; cor: string };

  function buildGrupos(): Map<string, Grupo> {
    const m = new Map<string, Grupo>();
    if (grupo === "area") {
      etapas.forEach(e => {
        const k = e.area ?? "_none";
        if (!m.has(k)) m.set(k, { label: AREAS[k]?.n ?? "Sem área", items: [], cor: AREAS[k]?.cor ?? "var(--dim)" });
        m.get(k)!.items.push(e);
      });
    } else if (grupo === "responsavel") {
      etapas.forEach(e => {
        const k = e.responsavel_atual ?? e.responsavel ?? "_none";
        if (!m.has(k)) m.set(k, { label: k === "_none" ? "Sem responsável" : k, items: [], cor: "var(--accent)" });
        m.get(k)!.items.push(e);
      });
    } else {
      etapas.forEach(e => {
        const k = e.cliente_id;
        if (!m.has(k)) m.set(k, { label: cliMap.get(k) ?? "—", items: [], cor: "var(--accent)" });
        m.get(k)!.items.push(e);
      });
    }
    return m;
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
        <p className="hx-eyebrow">Gestão de tarefas · {pessoa.nome}</p>
        <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--accent) 18%,transparent)", color: "var(--accent)", fontWeight: 700, letterSpacing: ".04em" }}>v2.0 BETA</span>
      </div>
      <h1 className="ex-h1">Sistema de <span className="hx-accent-text">Gestão</span></h1>

      {/* View switcher + scope */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", background: "var(--panel-2)", borderRadius: 10, padding: 3, gap: 2 }}>
          {([["lista", "📋 Lista"], ["board", "🗂 Board"], ["timeline", "📅 Agenda"]] as [string, string][]).map(([v, l]) => (
            <Link key={v} href={qs({ v })} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: view === v ? 700 : 500,
              borderRadius: 8, textDecoration: "none",
              background: view === v ? "var(--bg)" : "transparent",
              color: view === v ? "var(--accent)" : "var(--dim)",
              boxShadow: view === v ? "0 1px 4px rgba(0,0,0,.15)" : "none",
              transition: "all .15s",
            }}>{l}</Link>
          ))}
        </div>

        <span style={{ width: 1, height: 20, background: "var(--line)", flexShrink: 0 }} />

        <div style={{ display: "flex", gap: 4 }}>
          <Link href={qs({ s: "mine" })} className={`ex-chip2${scope === "mine" ? " on" : ""}`}>Minha agenda</Link>
          <Link href={qs({ s: "all" })}  className={`ex-chip2${scope === "all"  ? " on" : ""}`}>Toda a equipe</Link>
        </div>

        {isAdmin && view === "lista" && (
          <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>Agrupar:</span>
            {([["cliente", "Cliente"], ["area", "Área"], ["responsavel", "Responsável"]] as [string, string][]).map(([g, l]) => (
              <Link key={g} href={qs({ g })} className={`ex-chip2${grupo === g ? " on" : ""}`} style={{ fontSize: 11, padding: "4px 8px" }}>{l}</Link>
            ))}
          </div>
        )}
      </div>

      {/* KPI bar */}
      <div className="ex-kpis" style={{ marginBottom: 14 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Total</div>
          <div className="val">{stats.total}</div>
          <div className="foot">tarefas no filtro</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Atrasadas</div>
          <div className="val" style={{ color: stats.late ? "var(--red)" : "inherit" }}>{stats.late}</div>
          <div className="foot">SLA estourado</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Em andamento</div>
          <div className="val" style={{ color: "var(--accent)" }}>{stats.run}</div>
          <div className="foot">sendo executadas</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Concluídas</div>
          <div className="val" style={{ color: "var(--green)" }}>{stats.done}</div>
          <div className="foot">no conjunto atual</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Progresso</div>
          <div className="val hx-accent-text">{stats.total ? `${pct}%` : "—"}</div>
          <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <form className="hx-glass" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", marginBottom: 18, borderRadius: 12, alignItems: "center" }}>
        <input type="hidden" name="v"  value={view}  />
        <input type="hidden" name="s"  value={scope} />
        <input type="hidden" name="g"  value={grupo} />

        <select name="c"  defaultValue={filtroCli}  style={selCss}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select name="st" defaultValue={filtroSt}   style={selCss}>
          <option value="">Todos os status</option>
          {COLS.map(s => <option key={s} value={s}>{ST[s].l}</option>)}
        </select>

        <select name="a"  defaultValue={filtroArea} style={selCss}>
          <option value="">Todas as áreas</option>
          {areas.map(a => <option key={a} value={a}>{AREAS[a]?.n ?? a}</option>)}
        </select>

        <select name="r"  defaultValue={filtroResp} style={selCss}>
          <option value="">Todos os responsáveis</option>
          {resps.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>
          Filtrar
        </button>

        {(filtroCli || filtroSt || filtroArea || filtroResp) && (
          <Link href={qs({ c: "", st: "", a: "", r: "" })} style={{ fontSize: 12, color: "var(--dim)" }}>
            limpar
          </Link>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>
          {etapas.length} tarefa{etapas.length !== 1 ? "s" : ""}
        </span>
      </form>

      {/* ═══════════════════════════════════════════════════
          BOARD VIEW — Kanban Monday-style
      ════════════════════════════════════════════════════ */}
      {view === "board" && (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", alignItems: "flex-start", paddingBottom: 8 }}>
          {COLS.map(col => {
            const cards = etapas.filter(e => eff(e) === col);
            const st    = ST[col];
            return (
              <div key={col} style={{ minWidth: 260, flex: "1 1 260px" }}>
                {/* Column header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", marginBottom: 8,
                  borderRadius: "10px 10px 0 0",
                  background: st.bg,
                  borderBottom: `2px solid ${st.bdr}`,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: st.c, flex: 1 }}>{st.l}</span>
                  <span style={{
                    fontSize: 11, padding: "1px 7px", borderRadius: 20,
                    background: "rgba(0,0,0,.18)", color: st.c, fontWeight: 700,
                  }}>{cards.length}</span>
                </div>
                {/* Cards */}
                {cards.slice(0, 40).map(e => BoardCard(e))}
                {cards.length > 40 && (
                  <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--dim)", textAlign: "center" }}>
                    +{cards.length - 40} tarefas — use filtros
                  </div>
                )}
                {cards.length === 0 && (
                  <div style={{
                    padding: "18px 12px", fontSize: 12, color: "var(--dim)",
                    textAlign: "center", border: "1px dashed var(--line-2)",
                    borderRadius: 10,
                  }}>— vazia —</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          LIST VIEW — Monday-style grouped table
      ════════════════════════════════════════════════════ */}
      {view === "lista" && (() => {
        const grupos = buildGrupos();
        if (grupos.size === 0) {
          return <p style={{ color: "var(--dim)", fontSize: 13, padding: "24px 0" }}>Nenhuma tarefa para o filtro atual.</p>;
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[...grupos.entries()].map(([key, grp]) => {
              const lates = grp.items.filter(e => eff(e) === "late").length;
              const runs  = grp.items.filter(e => eff(e) === "run").length;
              const dones = grp.items.filter(e => eff(e) === "done").length;
              const gPct  = grp.items.length ? Math.round(dones / grp.items.length * 100) : 0;

              return (
                <div key={key} className="hx-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
                  {/* Group header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: `color-mix(in srgb, ${grp.cor} 7%, transparent)`,
                  }}>
                    <div style={{ width: 4, height: 30, borderRadius: 2, background: grp.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)" }}>{grp.label}</div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                        {grp.items.length} tarefa{grp.items.length !== 1 ? "s" : ""}
                        {lates > 0 && <span style={{ color: "var(--red)", marginLeft: 8 }}>· {lates} atrasada{lates !== 1 ? "s" : ""}</span>}
                        {runs  > 0 && <span style={{ color: "var(--accent)", marginLeft: 8 }}>· {runs} em andamento</span>}
                      </div>
                    </div>
                    <div style={{ minWidth: 120, textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>{gPct}% concluído</div>
                      <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${gPct}%`, background: "var(--green)", borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>

                  {/* Table head */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "14px 1fr 110px 80px 120px 70px 80px",
                    gap: 0, padding: "6px 16px",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 10, textTransform: "uppercase",
                    letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700,
                  }}>
                    <span />
                    <span>Tarefa</span>
                    <span>Status</span>
                    <span>Área</span>
                    <span>Responsável</span>
                    <span>SLA</span>
                    <span>Data</span>
                  </div>

                  {/* Rows */}
                  {grp.items.map((e, i) => {
                    const s   = eff(e);
                    const st  = ST[s];
                    const ar  = e.area ? AREAS[e.area] : null;
                    const resp = e.responsavel_atual ?? e.responsavel;
                    const isPast = e.data_prevista && e.data_prevista < hojeISO;
                    const dateStr = e.data_prevista
                      ? new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                      : null;

                    return (
                      <div key={e.id} style={{
                        display: "grid",
                        gridTemplateColumns: "14px 1fr 110px 80px 120px 70px 80px",
                        gap: 0, padding: "9px 16px",
                        borderBottom: i < grp.items.length - 1 ? "1px solid var(--line)" : "none",
                        alignItems: "center",
                      }}>
                        {/* Status dot */}
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: st.c }} />

                        {/* Title + actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <Link href={`/expand/etapa/${e.id}`} style={{
                            fontSize: 12.5, fontWeight: 600, color: "var(--txt)",
                            textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
                            {e.titulo}
                          </Link>
                          {e.agente && (
                            <span style={{ fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>
                              ⚡ {AG_NOME[e.agente] ?? e.agente}
                            </span>
                          )}
                          {e.status === "idle" && (
                            <form action={iniciarEtapa} style={{ display: "contents" }}>
                              <input type="hidden" name="etapaId" value={e.id} />
                              <button type="submit" title="Iniciar" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, border: "none", background: "color-mix(in srgb,var(--accent) 15%,transparent)", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>▶</button>
                            </form>
                          )}
                          {e.status === "run" && (
                            <form action={concluirEtapa} style={{ display: "contents" }}>
                              <input type="hidden" name="etapaId" value={e.id} />
                              <button type="submit" title="Concluir" style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, border: "none", background: "color-mix(in srgb,var(--green) 15%,transparent)", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>✓</button>
                            </form>
                          )}
                        </div>

                        {/* Status badge */}
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 6,
                          background: st.bg, color: st.c, fontWeight: 600,
                          display: "inline-block", whiteSpace: "nowrap",
                        }}>{st.l}</span>

                        {/* Area */}
                        <span style={{ fontSize: 11, color: ar?.cor ?? "var(--dim)", fontWeight: ar ? 600 : 400 }}>
                          {ar?.n ?? "—"}
                        </span>

                        {/* Responsible */}
                        <span style={{ fontSize: 11.5, color: "var(--mut)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {resp ?? "—"}
                        </span>

                        {/* SLA */}
                        <span style={{ fontSize: 11, color: "var(--dim)" }}>{e.sla ?? "—"}</span>

                        {/* Date */}
                        <span style={{ fontSize: 11, fontWeight: 600, color: isPast ? "var(--red)" : "var(--dim)" }}>
                          {dateStr ?? "—"}
                        </span>
                      </div>
                    );
                  })}

                  {/* Add hint */}
                  <div style={{ padding: "8px 16px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--dim)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>＋</span>
                    <Link href={`/expand/board`} style={{ color: "var(--dim)", textDecoration: "none" }}>
                      Ir para o board de {grp.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════
          TIMELINE / AGENDA VIEW — tasks with dates grouped by day
      ════════════════════════════════════════════════════ */}
      {view === "timeline" && (() => {
        const comData = etapas
          .filter(e => e.data_prevista && e.status !== "done")
          .sort((a, b) => (a.data_prevista ?? "").localeCompare(b.data_prevista ?? ""));
        const semData = etapas.filter(e => !e.data_prevista && e.status !== "done");

        const byDate = new Map<string, Et[]>();
        comData.forEach(e => {
          const d = e.data_prevista!;
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(e);
        });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Quick access to full calendar */}
            <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Agenda completa</div>
                <div style={{ fontSize: 11.5, color: "var(--mut)" }}>Navegação por dia/semana/mês com edição de datas disponível no Planejamento.</div>
              </div>
              <Link href={`/expand/planejamento${filtroCli ? `?c=${filtroCli}` : ""}`} className="hx-btn hx-btn-primary" style={{ padding: "8px 16px", textDecoration: "none", fontSize: 12, flexShrink: 0 }}>
                Abrir Planejamento ↗
              </Link>
            </div>

            {comData.length === 0 && (
              <p style={{ color: "var(--dim)", fontSize: 13 }}>Nenhuma tarefa com data agendada no filtro atual.</p>
            )}

            {[...byDate.entries()].slice(0, 20).map(([d, items]) => {
              const isPast  = d < hojeISO;
              const isToday = d === hojeISO;
              const label   = new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
              const bdrClr  = isToday ? "var(--accent)" : isPast ? "var(--red)" : "var(--line-2)";

              return (
                <div key={d} className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", borderLeft: `3px solid ${bdrClr}` }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "capitalize",
                    color: isToday ? "var(--accent)" : isPast ? "var(--red)" : "var(--txt)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {label}
                    {isToday && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--accent)", color: "#fff", fontWeight: 700 }}>HOJE</span>}
                    {isPast && !isToday && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--red) 15%,transparent)", color: "var(--red)", fontWeight: 700 }}>VENCIDO</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map(e => {
                      const s  = eff(e);
                      const ar = e.area ? AREAS[e.area] : null;
                      return (
                        <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ST[s].c, flexShrink: 0 }} />
                          <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.titulo}
                          </Link>
                          <span style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>
                            {cliMap.get(e.cliente_id) ?? "—"}
                          </span>
                          {ar && <span style={{ fontSize: 10.5, color: ar.cor, flexShrink: 0 }}>{ar.n}</span>}
                          <span style={{ fontSize: 11, color: ST[s].c, flexShrink: 0 }}>{ST[s].l}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {semData.length > 0 && (
              <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", borderLeft: "3px solid var(--dim)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", marginBottom: 8 }}>
                  Sem data agendada — {semData.length} tarefa{semData.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {semData.slice(0, 10).map(e => {
                    const s = eff(e);
                    return (
                      <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: ST[s].c, flexShrink: 0 }} />
                        <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 12, color: "var(--mut)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.titulo}
                        </Link>
                        <span style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>{cliMap.get(e.cliente_id) ?? "—"}</span>
                      </div>
                    );
                  })}
                  {semData.length > 10 && <Link href="/expand/planejamento" style={{ fontSize: 11, color: "var(--dim)" }}>+{semData.length - 10} no planejamento</Link>}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
