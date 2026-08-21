import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";
import { getPessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { iniciarEtapa, concluirEtapa } from "@/app/expand/actions";
import { criarEtapav2 } from "./actions";
import { MKpiCard, MTaskCard, MClientHero, MEmptyState, MSidebarRight, MHeatmapHours, MProgressBar } from "@/components/monay";
import MonayFoco from "@/components/monay/MonayFoco";
import { TaskQuickView, type QVEtapa, type QVArquivo, type QVLog } from "@/components/expand/TaskQuickView";
import { QuickCapture } from "@/components/expand/QuickCapture";
import RosterCard from "@/components/expand/RosterCard";

export const dynamic = "force-dynamic";

type Et = {
  id: string; titulo: string; cliente_id: string;
  area: string | null; responsavel: string | null; responsavel_atual: string | null;
  agente: string | null; sla: string | null; status: string;
  iniciada_em: string | null; concluida_em: string | null; duracao_min: number | null;
  data_prevista: string | null; marco: boolean; bloqueado: boolean | null;
  fase: number; ordem: number;
};

// ── Status system ────────────────────────────────────────────────────────────
type EffSt  = "late" | "run" | "wait" | "idle" | "done";
type Urgval = "urgente" | "alta" | "normal" | "baixa";

const ST: Record<EffSt, { l: string; c: string; bg: string; bdr: string }> = {
  late: { l: "Atrasada",     c: "var(--red)",   bg: "color-mix(in srgb,var(--red) 10%,transparent)",    bdr: "var(--red)"    },
  run:  { l: "Em andamento", c: "var(--accent)", bg: "color-mix(in srgb,var(--accent) 10%,transparent)", bdr: "var(--accent)" },
  wait: { l: "Em revisão",   c: "var(--warn)",  bg: "color-mix(in srgb,var(--warn) 10%,transparent)",   bdr: "var(--warn)"   },
  idle: { l: "A fazer",      c: "var(--dim)",   bg: "var(--panel-2)",                                    bdr: "var(--line-2)" },
  done: { l: "Concluída",    c: "var(--green)", bg: "color-mix(in srgb,var(--green) 10%,transparent)",  bdr: "var(--green)"  },
};
const COLS: EffSt[] = ["late", "run", "wait", "idle", "done"];

const URG: Record<Urgval, { l: string; c: string; bg: string; bdr: string; emoji: string }> = {
  urgente: { l: "Urgente", c: "var(--red)",    bg: "color-mix(in srgb,var(--red) 10%,transparent)",    bdr: "var(--red)",    emoji: "🔴" },
  alta:    { l: "Alta",    c: "var(--warn)",   bg: "color-mix(in srgb,var(--warn) 10%,transparent)",   bdr: "var(--warn)",   emoji: "🟠" },
  normal:  { l: "Normal",  c: "var(--accent)", bg: "color-mix(in srgb,var(--accent) 10%,transparent)", bdr: "var(--accent)", emoji: "🔵" },
  baixa:   { l: "Baixa",  c: "var(--dim)",    bg: "var(--panel-2)",                                    bdr: "var(--line-2)", emoji: "⚪" },
};
const URG_ORDER: Urgval[] = ["urgente", "alta", "normal", "baixa"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function slaDias(sla: string | null) {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/);   if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}
function diasDesde(iso: string | null) {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 864e5;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function duracaoTexto(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? `${m}m` : ""}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
function elapsedMin(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function V2({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const view   = (sp.v  as string) || "monay";
  const grupo  = (sp.g  as string) || "cliente";

  const { pessoa, equipe }  = await getPessoa();
  const { isAdmin } = await getAcesso();

  // Default scope: admin → all, equipe → mine
  const defaultScope = isAdmin ? "all" : "mine";
  const scope = (sp.s as string) || defaultScope;

  const filtroCli  = (sp.c  as string) || "";
  const filtroSt   = (sp.st as string) || "";
  const filtroArea = (sp.a  as string) || "";
  const filtroResp = (sp.r  as string) || "";
  const showNova   = sp.novo === "1";
  const qvId       = (sp.qv as string) || "";

  const supabase = await createClient();

  // Main tasks query
  let q = supabase.from("expand_etapas")
    .select("id,titulo,cliente_id,area,responsavel,responsavel_atual,agente,sla,status,iniciada_em,concluida_em,duracao_min,data_prevista,marco,bloqueado,fase,ordem")
    .order("fase").order("ordem");

  if (scope === "mine")
    q = q.or(`responsavel_atual.eq.${pessoa.nome},responsavel.ilike.%${pessoa.nome}%`);
  if (filtroCli)  q = q.eq("cliente_id", filtroCli);
  if (filtroArea) q = q.eq("area", filtroArea);

  const { data: etData } = await q.limit(600);
  let etapas = (etData ?? []) as Et[];

  // Dashboard needs ALL tasks (no scope filter)
  let etapasDash: Et[] = [];
  if (view === "dash") {
    const { data: allData } = await supabase.from("expand_etapas")
      .select("id,titulo,cliente_id,area,responsavel,responsavel_atual,sla,status,iniciada_em,concluida_em,data_prevista,marco,bloqueado,fase,ordem,agente")
      .order("fase").limit(600);
    etapasDash = (allData ?? []) as Et[];
  }

  // Pending approvals
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

  // UUID → name guard (resolves auth UUIDs stored as responsavel)
  const { data: profData } = await supabase.from("profiles").select("id,expand_membro").limit(200);
  const uuidToName = new Map<string, string>();
  (profData ?? []).forEach((p: { id: string; expand_membro: string | null }) => {
    const mem = equipe.find(e => e.id === (p.expand_membro ?? ""));
    if (mem) uuidToName.set(p.id, mem.nome);
  });
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolveResp = (v: string | null | undefined): string | null => {
    if (!v) return null;
    if (UUID_RE.test(v)) return uuidToName.get(v) ?? v.slice(0, 8) + "…";
    return v;
  };

  const hojeISO  = new Intl.DateTimeFormat("sv", { timeZone: "America/Sao_Paulo" }).format(new Date());

  // Focus sessions for heatmap (last 7 days)
  const sessFrom = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: sessData } = await supabase.from("expand_sessoes_foco")
    .select("iniciada_em,duracao_min").gte("iniciada_em", sessFrom).order("iniciada_em").limit(200);
  const focusSessions = (sessData ?? []).map((s: { iniciada_em: string | null; duracao_min: number | null }) => ({
    date: (s.iniciada_em ?? hojeISO).slice(0, 10),
    hour: new Date(s.iniciada_em ?? hojeISO).getHours(),
    minutes: s.duracao_min ?? 45,
  }));
  const hojeDate = new Date(hojeISO + "T00:00:00");

  // ── Computed status ──────────────────────────────────────────────────────
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

  // ── Urgency (derived) ────────────────────────────────────────────────────
  function urgencia(e: Et): Urgval {
    const s = eff(e);
    if (s === "done") return "baixa";
    if (s === "late") return "urgente";
    if (e.marco)      return "alta";
    if (s === "run") {
      const d = slaDias(e.sla), el = diasDesde(e.iniciada_em);
      if (d != null && el != null && el >= d - 1) return "urgente";
    }
    if (e.data_prevista) {
      const daysUntil = (new Date(e.data_prevista + "T12:00").getTime() - Date.now()) / 864e5;
      if (daysUntil <= 1)  return "urgente";
      if (daysUntil <= 3)  return "alta";
    }
    return "normal";
  }

  // Apply status/resp filters after eff computation
  if (filtroSt)   etapas = etapas.filter(e => eff(e) === filtroSt);
  if (filtroResp) etapas = etapas.filter(e => (e.responsavel_atual ?? e.responsavel) === filtroResp);

  const stats = { total: etapas.length, late: 0, run: 0, done: 0, idle: 0, wait: 0 };
  etapas.forEach(e => { const s = eff(e); stats[s]++; });
  const pct = stats.total ? Math.round(stats.done / stats.total * 100) : 0;

  // ── QS builder ───────────────────────────────────────────────────────────
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

  // ── Gantt helpers ────────────────────────────────────────────────────────
  const GANTT_DAYS = 35; // window: T-10 to T+25
  const gStart = addDays(hojeDate, -10);
  const gEnd   = addDays(hojeDate, 25);
  const todayPct = (10 / GANTT_DAYS) * 100; // today is at 10/35 = 28.6%

  function ganttPos(e: Et): { left: number; width: number } | null {
    if (!e.data_prevista) return null;
    const end   = new Date(e.data_prevista + "T00:00");
    const dSla  = slaDias(e.sla) ?? 3;
    const start = e.iniciada_em
      ? new Date(e.iniciada_em.slice(0, 10) + "T00:00")
      : new Date(end.getTime() - dSla * 864e5);

    const leftRaw  = (start.getTime() - gStart.getTime()) / (864e5 * GANTT_DAYS) * 100;
    const widthRaw = (end.getTime() - start.getTime())    / (864e5 * GANTT_DAYS) * 100;
    const left   = Math.max(0, leftRaw);
    const right  = Math.min(100, leftRaw + widthRaw);
    const width  = Math.max(1, right - left);
    return right > 0 && left < 100 ? { left, width } : null;
  }

  // Gantt header: day markers every 5 days
  const ganttHeaders: { pct: number; label: string }[] = [];
  for (let i = 0; i <= GANTT_DAYS; i += 5) {
    const d = addDays(gStart, i);
    ganttHeaders.push({
      pct: (i / GANTT_DAYS) * 100,
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    });
  }

  // ── Grouping helper ──────────────────────────────────────────────────────
  type GrupoItem = { label: string; items: Et[]; cor: string };
  function buildGrupos(): Map<string, GrupoItem> {
    const m = new Map<string, GrupoItem>();
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
    } else if (grupo === "urgencia") {
      URG_ORDER.forEach(u => {
        m.set(u, { label: `${URG[u].emoji} ${URG[u].l}`, items: [], cor: URG[u].c });
      });
      etapas.forEach(e => m.get(urgencia(e))!.items.push(e));
      // remove empty urgency groups
      for (const [k, v] of m) if (!v.items.length) m.delete(k);
    } else { // cliente
      etapas.forEach(e => {
        const k = e.cliente_id;
        if (!m.has(k)) m.set(k, { label: cliMap.get(k) ?? "—", items: [], cor: "var(--accent)" });
        m.get(k)!.items.push(e);
      });
    }
    return m;
  }

  // ── Dashboard data ───────────────────────────────────────────────────────
  const dashSource = view === "dash" ? etapasDash : etapas;
  const dashPendMap = new Map<string, number>(pendMap); // reuse existing for dash

  function effDash(e: Et): EffSt {
    if (e.status === "done") return "done";
    if (e.bloqueado) return "late";
    if (dashPendMap.get(e.id)) return "wait";
    if (e.status === "run") {
      const d = slaDias(e.sla), el = diasDesde(e.iniciada_em);
      if (d != null && el != null && el > d) return "late";
      return "run";
    }
    if (e.status === "idle" && e.data_prevista && e.data_prevista < hojeISO) return "late";
    return "idle";
  }

  const cliDash = new Map<string, { total: number; done: number; late: number; run: number }>();
  dashSource.forEach(e => {
    if (!cliDash.has(e.cliente_id)) cliDash.set(e.cliente_id, { total: 0, done: 0, late: 0, run: 0 });
    const g = cliDash.get(e.cliente_id)!;
    g.total++;
    const s = effDash(e);
    if (s === "done") g.done++;
    if (s === "late") g.late++;
    if (s === "run")  g.run++;
  });

  const teamDash = new Map<string, { total: number; done: number; late: number }>();
  dashSource.forEach(e => {
    const k = e.responsavel_atual ?? e.responsavel ?? "Sem responsável";
    if (!teamDash.has(k)) teamDash.set(k, { total: 0, done: 0, late: 0 });
    const g = teamDash.get(k)!;
    g.total++;
    const s = effDash(e);
    if (s === "done") g.done++;
    if (s === "late") g.late++;
  });

  const recentDone = dashSource
    .filter(e => e.status === "done" && e.concluida_em)
    .sort((a, b) => (b.concluida_em ?? "").localeCompare(a.concluida_em ?? ""))
    .slice(0, 8);

  // ── Inline styles ────────────────────────────────────────────────────────
  const selCss: CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "6px 10px", fontSize: 12, outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  };

  // ── Board card ───────────────────────────────────────────────────────────
  function BoardCard(e: Et) {
    const s   = eff(e);
    const st  = ST[s];
    const ar  = e.area ? AREAS[e.area] : null;
    const resp = e.responsavel_atual ?? e.responsavel;
    const isPast  = e.data_prevista && e.data_prevista < hojeISO;
    const dateStr = e.data_prevista
      ? new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;

    return (
      <div key={e.id} className="hx-glass" style={{ borderRadius: 10, padding: "12px 14px", marginBottom: 8, borderLeft: `3px solid ${st.bdr}` }}>
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
          {ar && <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: ar.cor, fontWeight: 600 }}>{ar.n}</span>}
          {e.agente && <span style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--panel-2)", color: "var(--dim)" }}>⚡ {AG_NOME[e.agente] ?? e.agente}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {resp && <span style={{ fontSize: 11, color: "var(--dim)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resp}</span>}
          {e.sla && <span style={{ fontSize: 10.5, color: "var(--mut)" }}>SLA {e.sla}</span>}
          {dateStr && <span style={{ fontSize: 10.5, fontWeight: 600, color: isPast ? "var(--red)" : "var(--mut)" }}>{isPast ? "⚠ " : "📅 "}{dateStr}</span>}
          {e.status === "run" && e.iniciada_em && (() => { const m = elapsedMin(e.iniciada_em); return m ? <span style={{ fontSize: 10.5, color: "var(--accent)" }}>⏱ {duracaoTexto(m)}</span> : null; })()}
          {e.status === "done" && (e.duracao_min != null) && <span style={{ fontSize: 10.5, color: "var(--green)" }}>✓ {duracaoTexto(e.duracao_min)}</span>}
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

  const modeLabel = isAdmin ? "Gestão" : "Colaborador";
  const modeColor = isAdmin ? "var(--warn)" : "var(--accent)";

  // ── Quick-view modal data ────────────────────────────────────────────────
  let qvEtapa: QVEtapa | null = null;
  let qvArquivos: QVArquivo[] = [];
  let qvLogs: QVLog[] = [];
  let qvCliente: { id: string; nome: string } | null = null;
  const qvSignedUrls = new Map<string, string>();

  if (qvId) {
    const [etRow, arRow, lgRow] = await Promise.all([
      supabase.from("expand_etapas")
        .select("id,titulo,criterio,area,agente,responsavel,responsavel_atual,status,sla,marco,data_prevista,iniciada_em,concluida_em,duracao_min,bloqueado,bloqueio_motivo,chamado,chamado_msg,fase,cliente_id")
        .eq("id", qvId).single(),
      supabase.from("expand_arquivos")
        .select("id,nome,tipo,status,url,path,enviado_por,enviado_em,obs")
        .eq("etapa_id", qvId).order("enviado_em", { ascending: false }),
      supabase.from("expand_log")
        .select("id,tipo,autor,detalhe,criado_em")
        .eq("etapa_id", qvId).order("criado_em", { ascending: false }).limit(30),
    ]);

    if (etRow.data) {
      qvEtapa = etRow.data as QVEtapa;
      const cliId = (etRow.data as { cliente_id: string }).cliente_id;
      const { data: cliRow } = await supabase.from("expand_clientes").select("id,nome").eq("id", cliId).single();
      qvCliente = cliRow as { id: string; nome: string } | null;
    }

    qvArquivos = (arRow.data ?? []) as QVArquivo[];
    qvLogs     = (lgRow.data ?? []) as QVLog[];

    // Generate signed URLs for file-type arquivos
    const filePaths = qvArquivos.filter((a) => a.tipo !== "link" && a.path).map((a) => a.path!);
    if (filePaths.length) {
      const { data: signed } = await supabase.storage.from("expand-entregaveis").createSignedUrls(filePaths, 3600);
      (signed ?? []).forEach((s) => {
        const arq = qvArquivos.find((a) => a.path === s.path);
        if (arq && s.signedUrl) qvSignedUrls.set(arq.id, s.signedUrl);
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
        <p className="hx-eyebrow">Hub do Dia · {pessoa.nome}</p>
        <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: `color-mix(in srgb,${modeColor} 15%,transparent)`, color: modeColor, fontWeight: 600 }}>
          {modeLabel}
        </span>
      </div>
      <h1 className="ex-h1">Hub do <span className="hx-accent-text">Dia</span></h1>

      {/* ── View switcher ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", background: "var(--panel-2)", borderRadius: 10, padding: 3, gap: 2 }}>
          {([
            ["monay",     "✦ Hoje"],
            ["matrix",    "⬛ Eisenhower"],
            ["lista",     "📋 Lista"],
            ["board",     "🗂 Board"],
            ["gantt",     "📊 Gantt"],
            ["timeline",  "📅 Agenda"],
            ["dash",      "⚡ Dashboard"],
          ] as [string, string][]).map(([v, l]) => (
            <Link key={v} href={qs({ v })} style={{
              padding: "6px 13px", fontSize: 12, fontWeight: view === v ? 700 : 500,
              borderRadius: 8, textDecoration: "none",
              background: view === v ? "var(--bg)" : "transparent",
              color: view === v ? "var(--accent)" : "var(--dim)",
              boxShadow: view === v ? "0 1px 4px rgba(0,0,0,.15)" : "none",
              transition: "all .15s",
            }}>{l}</Link>
          ))}
        </div>

        {/* Scope (hidden in dash — always global) */}
        {view !== "dash" && (
          <div style={{ display: "flex", gap: 4 }}>
            <Link href={qs({ s: "mine" })} className={`ex-chip2${scope === "mine" ? " on" : ""}`}>Minha agenda</Link>
            {isAdmin && <Link href={qs({ s: "all"  })} className={`ex-chip2${scope === "all"  ? " on" : ""}`}>Toda a equipe</Link>}
          </div>
        )}

        {/* Grouping (lista only) */}
        {view === "lista" && (
          <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>Agrupar:</span>
            {([
              ["cliente",    "Cliente"],
              ["area",       "Área"],
              ["responsavel","Responsável"],
              ["urgencia",   "Urgência"],
            ] as [string, string][]).map(([g, l]) => (
              <Link key={g} href={qs({ g })} className={`ex-chip2${grupo === g ? " on" : ""}`} style={{ fontSize: 11, padding: "4px 8px" }}>{l}</Link>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI bar (all views except dash) ─────────────────────── */}
      {view !== "dash" && (
        <div className="ex-kpis" style={{ marginBottom: 14 }}>
          <div className="ex-kpi hx-glass"><div className="lab">Total</div><div className="val">{stats.total}</div><div className="foot">tarefas no filtro</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Atrasadas</div><div className="val" style={{ color: stats.late ? "var(--red)" : "inherit" }}>{stats.late}</div><div className="foot">SLA estourado</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Em andamento</div><div className="val" style={{ color: "var(--accent)" }}>{stats.run}</div><div className="foot">sendo executadas</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Concluídas</div><div className="val" style={{ color: "var(--green)" }}>{stats.done}</div><div className="foot">no conjunto atual</div></div>
          <div className="ex-kpi hx-glass">
            <div className="lab">Progresso</div>
            <div className="val hx-accent-text">{stats.total ? `${pct}%` : "—"}</div>
            <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", marginTop: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: 99 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Filter bar (all views except dash) ──────────────────── */}
      {view !== "dash" && (
        <form className="hx-glass" style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 14px", marginBottom: 18, borderRadius: 12, alignItems: "center" }}>
          <input type="hidden" name="v" value={view} />
          <input type="hidden" name="s" value={scope} />
          <input type="hidden" name="g" value={grupo} />
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
          <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Filtrar</button>
          {(filtroCli || filtroSt || filtroArea || filtroResp) && (
            <Link href={qs({ c: "", st: "", a: "", r: "" })} style={{ fontSize: 12, color: "var(--dim)" }}>limpar</Link>
          )}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>{etapas.length} tarefa{etapas.length !== 1 ? "s" : ""}</span>
          <Link href={qs({ novo: "1" })} className="hx-btn hx-btn-primary" style={{ padding: "6px 14px", fontSize: 12, flexShrink: 0 }}>+ Nova tarefa</Link>
        </form>
      )}

      {/* ── Nova tarefa inline form ────────────────────────────────── */}
      {showNova && view !== "dash" && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 18, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>+ Nova tarefa</div>
          <form action={criarEtapav2} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            <input type="hidden" name="back" value={`/expand/v2?v=${view}&s=${scope}&g=${grupo}${filtroCli ? `&c=${filtroCli}` : ""}`} />
            <label style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Título*</div>
              <input name="titulo" required placeholder="O que precisa ser feito?" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" }} autoFocus />
            </label>
            <label>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Cliente*</div>
              <select name="cliente_id" required style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
                <option value="">Selecionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id} selected={c.id === filtroCli}>{c.nome}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Área</div>
              <select name="area" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
                <option value="">Sem área</option>
                {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>SLA</div>
              <input name="sla" placeholder="ex.: 2 dias" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" }} />
            </label>
            <label>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>Data prevista</div>
              <input type="date" name="data_prevista" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" }} />
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 18px", fontSize: 12.5 }}>Criar tarefa</button>
              <Link href={qs({ novo: "" })} style={{ fontSize: 12, color: "var(--dim)", padding: "8px 0" }}>cancelar</Link>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MONAY — Hub prioritário do dia
      ═══════════════════════════════════════════════════════════════ */}
      {view === "monay" && (() => {
        const uOrder: Record<string, number> = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
        const allOpen = etapas.filter(e => eff(e) !== "done");
        const queue   = allOpen
          .sort((a, b) => uOrder[urgencia(a)] - uOrder[urgencia(b)])
          .slice(0, 6);
        const heroTask = queue[0] ?? null;

        const hojeCount = etapas.filter(e => e.data_prevista === hojeISO).length;
        const hojeDone  = etapas.filter(e => e.data_prevista === hojeISO && eff(e) === "done").length;
        const urgentes  = allOpen.filter(e => urgencia(e) === "urgente").length;
        const emExec    = etapas.filter(e => eff(e) === "run").length;

        // Area breakdown
        const areaMap = new Map<string, { total: number; done: number }>();
        etapas.forEach(e => {
          const a = e.area ?? "Geral";
          const cur = areaMap.get(a) ?? { total: 0, done: 0 };
          cur.total++;
          if (eff(e) === "done") cur.done++;
          areaMap.set(a, cur);
        });
        const topAreas = [...areaMap.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 4);

        // Agent roster: group open tasks by agent/responsavel
        const agMap = new Map<string, { open: number; run: number; isAi: boolean }>();
        allOpen.forEach(e => {
          const key = e.agente ?? resolveResp(e.responsavel_atual ?? e.responsavel) ?? "";
          if (!key) return;
          const cur = agMap.get(key) ?? { open: 0, run: 0, isAi: !!e.agente };
          cur.open++;
          if (eff(e) === "run") cur.run++;
          agMap.set(key, cur);
        });
        const roster = [...agMap.entries()]
          .sort((a, b) => b[1].run - a[1].run)
          .slice(0, 5);

        return (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* ── Main column ── */}
            <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* KPI strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
                <MKpiCard label="Hoje" value={`${hojeDone}/${hojeCount}`} sub="do dia concluídas" color="var(--accent)" />
                <MKpiCard label="Urgentes" value={urgentes} sub="precisam atenção" color="var(--red)" trend={urgentes > 0 ? "down" : "flat"} />
                <MKpiCard label="Execução" value={emExec} sub="tarefas ativas" color="var(--warn)" />
                <MKpiCard label="Progresso" value={`${pct}%`} sub="total entregue" color="var(--green)" progress={pct} />
              </div>

              {/* Area breakdown strip */}
              {topAreas.length > 0 && (
                <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", fontWeight: 700, marginBottom: 10 }}>
                    Por área
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {topAreas.map(([area, s]) => (
                      <div key={area}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "var(--txt)", fontWeight: 600 }}>{area}</span>
                          <span style={{ fontSize: 11, color: "var(--dim)" }}>
                            {s.done}/{s.total}
                          </span>
                        </div>
                        <MProgressBar
                          value={s.total ? Math.round(s.done / s.total * 100) : 0}
                          height={4}
                          color="var(--accent)"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Hero — tarefa mais urgente */}
              {heroTask && (
                <Link href={`/expand/etapa/${heroTask.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <MClientHero
                    clienteName={cliMap.get(heroTask.cliente_id) ?? "—"}
                    taskTitle={heroTask.titulo}
                    datePrevista={heroTask.data_prevista}
                  />
                </Link>
              )}

              {/* Priority queue */}
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", fontWeight: 700, marginBottom: 10 }}>
                  Fila de prioridade
                </div>
                {queue.length === 0 ? (
                  <div className="hx-glass" style={{ borderRadius: 12 }}>
                    <MEmptyState icon="✅" title="Nada urgente" description="Todas as tarefas estão em dia!" />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {queue.map(e => (
                      <Link key={e.id} href={qs({ qv: e.id })} style={{ textDecoration: "none" }}>
                        <MTaskCard
                          title={e.titulo}
                          status={eff(e)}
                          priority={urgencia(e)}
                          clienteName={cliMap.get(e.cliente_id) ?? "—"}
                          datePrevista={e.data_prevista}
                          sla={e.sla}
                          responsaveis={resolveResp(e.responsavel) ? [{ name: resolveResp(e.responsavel)!, type: e.agente ? "ai" : "human" }] : []}
                          agent={e.agente}
                        />
                      </Link>
                    ))}
                    <Link href={qs({ v: "lista" })} style={{ fontSize: 12, color: "var(--dim)", padding: "8px 4px", display: "block", textDecoration: "none" }}>
                      Ver todas as tarefas →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar ── */}
            <MSidebarRight width={276}>
              {/* Focus timer + playlist */}
              <MonayFoco />

              {/* Separator */}
              <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />

              {/* Heatmap 7 dias */}
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", fontWeight: 700, marginBottom: 8 }}>
                  Foco — últimos 7 dias
                </div>
                {focusSessions.length > 0 ? (
                  <MHeatmapHours data={focusSessions} />
                ) : (
                  <p style={{ fontSize: 11, color: "var(--dim)", margin: 0, lineHeight: 1.5 }}>Sem sessões registradas ainda. O heatmap aparece quando sessões de foco forem gravadas.</p>
                )}
              </div>

              {/* Agent roster */}
              {roster.length > 0 && (
                <>
                  <div style={{ height: 1, background: "var(--line)", margin: "18px 0" }} />
                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", fontWeight: 700, marginBottom: 10 }}>
                      Agentes ativos
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {roster.map(([name, s]) => (
                        <RosterCard key={name} id={name} nome={name} tipo={s.isAi ? "agente" : "humano"} run={s.run} open={s.open} isAi={s.isAi} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </MSidebarRight>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          LISTA — Monday-style grouped table
      ═══════════════════════════════════════════════════════════════ */}
      {view === "lista" && (() => {
        const grupos = buildGrupos();
        if (!grupos.size) return <p style={{ color: "var(--dim)", fontSize: 13, padding: "24px 0" }}>Nenhuma tarefa para o filtro atual.</p>;
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
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: `color-mix(in srgb, ${grp.cor} 7%, transparent)` }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "14px 1fr 110px 80px 120px 70px 80px", padding: "6px 16px", borderBottom: "1px solid var(--line)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
                    <span /><span>Tarefa</span><span>Status</span><span>Área</span><span>Responsável</span><span>SLA</span><span>Data</span>
                  </div>
                  {/* Rows */}
                  {grp.items.map((e, i) => {
                    const s = eff(e); const st = ST[s];
                    const ar = e.area ? AREAS[e.area] : null;
                    const resp = e.responsavel_atual ?? e.responsavel;
                    const isPast = e.data_prevista && e.data_prevista < hojeISO;
                    const dateStr = e.data_prevista ? new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;
                    return (
                      <div key={e.id} style={{ display: "grid", gridTemplateColumns: "14px 1fr 110px 80px 120px 70px 80px", padding: "9px 16px", borderBottom: i < grp.items.length - 1 ? "1px solid var(--line)" : "none", alignItems: "center" }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: st.c }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <Link href={qs({ qv: e.id })} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}{e.titulo}
                          </Link>
                          {e.agente && <span style={{ fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>⚡ {AG_NOME[e.agente] ?? e.agente}</span>}
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
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: st.bg, color: st.c, fontWeight: 600, display: "inline-block", whiteSpace: "nowrap" }}>{st.l}</span>
                        <span style={{ fontSize: 11, color: ar?.cor ?? "var(--dim)", fontWeight: ar ? 600 : 400 }}>{ar?.n ?? "—"}</span>
                        <span style={{ fontSize: 11.5, color: "var(--mut)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resp ?? "—"}</span>
                        <span style={{ fontSize: 11, color: "var(--dim)" }}>{e.sla ?? "—"}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isPast ? "var(--red)" : "var(--dim)" }}>{dateStr ?? "—"}</span>
                      </div>
                    );
                  })}
                  <div style={{ padding: "8px 16px", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--dim)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>＋</span>
                    <Link href="/expand/board" style={{ color: "var(--dim)", textDecoration: "none" }}>Ir para o board completo</Link>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          BOARD — Kanban Monday-style
      ═══════════════════════════════════════════════════════════════ */}
      {view === "board" && (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", alignItems: "flex-start", paddingBottom: 8 }}>
          {COLS.map(col => {
            const cards = etapas.filter(e => eff(e) === col);
            const st = ST[col];
            return (
              <div key={col} style={{ minWidth: 260, flex: "1 1 260px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", marginBottom: 8, borderRadius: "10px 10px 0 0", background: st.bg, borderBottom: `2px solid ${st.bdr}` }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: st.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: st.c, flex: 1 }}>{st.l}</span>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 20, background: "rgba(0,0,0,.18)", color: st.c, fontWeight: 700 }}>{cards.length}</span>
                </div>
                {cards.slice(0, 40).map(e => BoardCard(e))}
                {cards.length > 40 && <div style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--dim)", textAlign: "center" }}>+{cards.length - 40} — use filtros</div>}
                {!cards.length && <div style={{ padding: "18px 12px", fontSize: 12, color: "var(--dim)", textAlign: "center", border: "1px dashed var(--line-2)", borderRadius: 10 }}>— vazia —</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          GANTT — Horizontal timeline
      ═══════════════════════════════════════════════════════════════ */}
      {view === "gantt" && (() => {
        const comData = etapas.filter(e => e.data_prevista && e.status !== "done");
        // Group by client
        const cliG = new Map<string, Et[]>();
        comData.forEach(e => {
          if (!cliG.has(e.cliente_id)) cliG.set(e.cliente_id, []);
          cliG.get(e.cliente_id)!.push(e);
        });

        if (!comData.length) return (
          <div className="hx-glass" style={{ borderRadius: 14, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <p style={{ fontSize: 13, color: "var(--dim)" }}>Nenhuma tarefa com data agendada no filtro atual.</p>
            <Link href="/expand/planejamento" className="hx-btn hx-btn-primary" style={{ display: "inline-block", marginTop: 12, padding: "8px 16px", textDecoration: "none", fontSize: 12 }}>Agendar tarefas →</Link>
          </div>
        );

        return (
          <div className="hx-glass" style={{ borderRadius: 14, overflow: "hidden" }}>
            {/* Gantt header */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }}>
              <div style={{ width: 220, flexShrink: 0, padding: "8px 16px", fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, borderRight: "1px solid var(--line)" }}>
                Tarefa
              </div>
              <div style={{ flex: 1, position: "relative", height: 36, minWidth: 0 }}>
                {/* Day markers */}
                {ganttHeaders.map((h, i) => (
                  <div key={i} style={{ position: "absolute", left: `${h.pct}%`, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
                    <div style={{ width: 1, height: "100%", background: "var(--line)", position: "absolute" }} />
                    <span style={{ fontSize: 9.5, color: "var(--dim)", paddingLeft: 4, whiteSpace: "nowrap", position: "absolute", top: "50%", transform: "translateY(-50%)" }}>{h.label}</span>
                  </div>
                ))}
                {/* Today marker */}
                <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: "var(--accent)", zIndex: 2 }}>
                  <span style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: "var(--accent)", fontWeight: 700, whiteSpace: "nowrap" }}>HOJE</span>
                </div>
              </div>
            </div>

            {/* Gantt rows grouped by client */}
            {[...cliG.entries()].map(([cid, items]) => (
              <div key={cid}>
                {/* Client sub-header */}
                <div style={{ display: "flex", alignItems: "center", background: "color-mix(in srgb,var(--accent) 6%,transparent)", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ width: 220, flexShrink: 0, padding: "6px 16px", fontSize: 11, fontWeight: 700, color: "var(--accent)", borderRight: "1px solid var(--line)" }}>
                    {cliMap.get(cid) ?? "—"}
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 28 }}>
                    {ganttHeaders.map((h, i) => (
                      <div key={i} style={{ position: "absolute", left: `${h.pct}%`, top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
                    ))}
                    <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: "color-mix(in srgb,var(--accent) 40%,transparent)" }} />
                  </div>
                </div>

                {/* Task rows */}
                {items.map((e, ri) => {
                  const bar = ganttPos(e);
                  const s   = eff(e); const st = ST[s];
                  const ar  = e.area ? AREAS[e.area] : null;
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", borderBottom: ri < items.length - 1 ? "1px solid var(--line)" : "none" }}>
                      {/* Task name */}
                      <div style={{ width: 220, flexShrink: 0, padding: "7px 16px", borderRight: "1px solid var(--line)", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: st.c, flexShrink: 0 }} />
                          <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--txt)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.titulo}
                          </Link>
                        </div>
                        {ar && <div style={{ fontSize: 9.5, color: ar.cor, marginLeft: 13 }}>{ar.n}</div>}
                      </div>
                      {/* Bar area */}
                      <div style={{ flex: 1, position: "relative", height: 42, minWidth: 0, overflow: "hidden" }}>
                        {/* Grid lines */}
                        {ganttHeaders.map((h, i) => (
                          <div key={i} style={{ position: "absolute", left: `${h.pct}%`, top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
                        ))}
                        {/* Today line */}
                        <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: "color-mix(in srgb,var(--accent) 35%,transparent)", zIndex: 1 }} />
                        {/* Task bar */}
                        {bar && (
                          <div style={{
                            position: "absolute",
                            left: `${bar.left}%`, width: `${bar.width}%`,
                            top: "50%", transform: "translateY(-50%)",
                            height: 16, borderRadius: 4,
                            background: st.bdr,
                            opacity: 0.85,
                            zIndex: 2,
                            display: "flex", alignItems: "center", paddingLeft: 5,
                            overflow: "hidden",
                          }}>
                            <span style={{ fontSize: 9.5, color: "#fff", whiteSpace: "nowrap", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {e.titulo}
                            </span>
                          </div>
                        )}
                        {!bar && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 8 }}>
                            <span style={{ fontSize: 10, color: "var(--dim)" }}>fora da janela</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ padding: "8px 16px", fontSize: 11.5, color: "var(--dim)", borderTop: "1px solid var(--line)", display: "flex", gap: 16, alignItems: "center" }}>
              <span>Janela: {addDays(hojeDate, -10).toLocaleDateString("pt-BR")} — {addDays(hojeDate, 25).toLocaleDateString("pt-BR")}</span>
              <Link href="/expand/planejamento" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 11 }}>Agendar / editar datas →</Link>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          AGENDA — Day-by-day timeline
      ═══════════════════════════════════════════════════════════════ */}
      {view === "timeline" && (() => {
        const comData = etapas.filter(e => e.data_prevista && e.status !== "done").sort((a, b) => (a.data_prevista ?? "").localeCompare(b.data_prevista ?? ""));
        const semData = etapas.filter(e => !e.data_prevista && e.status !== "done");
        const byDate  = new Map<string, Et[]>();
        comData.forEach(e => {
          const d = e.data_prevista!;
          if (!byDate.has(d)) byDate.set(d, []);
          byDate.get(d)!.push(e);
        });
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Agenda detalhada</div>
                <div style={{ fontSize: 11.5, color: "var(--mut)" }}>Navegação por dia/semana/mês e edição de datas estão no Planejamento.</div>
              </div>
              <Link href={`/expand/planejamento${filtroCli ? `?c=${filtroCli}` : ""}`} className="hx-btn hx-btn-primary" style={{ padding: "8px 16px", textDecoration: "none", fontSize: 12, flexShrink: 0 }}>Planejamento ↗</Link>
            </div>
            {!comData.length && <p style={{ color: "var(--dim)", fontSize: 13 }}>Nenhuma tarefa com data agendada.</p>}
            {[...byDate.entries()].slice(0, 20).map(([d, items]) => {
              const isPast = d < hojeISO; const isToday = d === hojeISO;
              const label  = new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
              return (
                <div key={d} className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", borderLeft: `3px solid ${isToday ? "var(--accent)" : isPast ? "var(--red)" : "var(--line-2)"}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: "capitalize", color: isToday ? "var(--accent)" : isPast ? "var(--red)" : "var(--txt)", display: "flex", alignItems: "center", gap: 8 }}>
                    {label}
                    {isToday && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--accent)", color: "#fff", fontWeight: 700 }}>HOJE</span>}
                    {isPast && !isToday && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--red) 15%,transparent)", color: "var(--red)", fontWeight: 700 }}>VENCIDO</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map(e => {
                      const s = eff(e); const ar = e.area ? AREAS[e.area] : null;
                      return (
                        <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ST[s].c, flexShrink: 0 }} />
                          <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</Link>
                          <span style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>{cliMap.get(e.cliente_id) ?? "—"}</span>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", marginBottom: 8 }}>Sem data — {semData.length} tarefa{semData.length !== 1 ? "s" : ""}</div>
                {semData.slice(0, 10).map(e => {
                  const s = eff(e);
                  return (
                    <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: ST[s].c, flexShrink: 0 }} />
                      <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 12, color: "var(--mut)", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</Link>
                      <span style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>{cliMap.get(e.cliente_id) ?? "—"}</span>
                    </div>
                  );
                })}
                {semData.length > 10 && <Link href="/expand/planejamento" style={{ fontSize: 11, color: "var(--dim)" }}>+{semData.length - 10} no planejamento</Link>}
              </div>
            )}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          DASHBOARD — Metrics & health
      ═══════════════════════════════════════════════════════════════ */}
      {view === "dash" && (() => {
        const dTotal  = dashSource.length;
        const dDone   = dashSource.filter(e => effDash(e) === "done").length;
        const dLate   = dashSource.filter(e => effDash(e) === "late").length;
        const dRun    = dashSource.filter(e => effDash(e) === "run").length;
        const dHealth = dTotal ? Math.round((1 - dLate / dTotal) * 100) : 100;
        const dPct    = dTotal ? Math.round(dDone / dTotal * 100) : 0;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Mode badge */}
            <div className="hx-glass" style={{ borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: modeColor }}>
                {isAdmin ? "Visão de Gestão — todos os colaboradores" : `Visão Colaborador — ${pessoa.nome}`}
              </span>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>· {dTotal} tarefas no total</span>
              {isAdmin && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <Link href={qs({ s: "all", v: "lista" })} className="ex-chip2" style={{ fontSize: 11 }}>Ver lista completa</Link>
                  <Link href={qs({ s: "mine", v: "dash" })} className="ex-chip2" style={{ fontSize: 11 }}>Minha visão</Link>
                </div>
              )}
            </div>

            {/* Global KPIs */}
            <div className="ex-kpis">
              <div className="ex-kpi hx-glass">
                <div className="lab">Saúde geral</div>
                <div className="val" style={{ color: dHealth >= 80 ? "var(--green)" : dHealth >= 60 ? "var(--warn)" : "var(--red)" }}>{dHealth}%</div>
                <div className="foot">tarefas sem atraso</div>
              </div>
              <div className="ex-kpi hx-glass">
                <div className="lab">Progresso</div>
                <div className="val hx-accent-text">{dPct}%</div>
                <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${dPct}%`, background: "var(--green)", borderRadius: 99 }} />
                </div>
              </div>
              <div className="ex-kpi hx-glass">
                <div className="lab">Em execução</div>
                <div className="val" style={{ color: "var(--accent)" }}>{dRun}</div>
                <div className="foot">tarefas ativas</div>
              </div>
              <div className="ex-kpi hx-glass">
                <div className="lab">Atrasadas</div>
                <div className="val" style={{ color: dLate ? "var(--red)" : "var(--dim)" }}>{dLate}</div>
                <div className="foot">fora do SLA</div>
              </div>
              <div className="ex-kpi hx-glass">
                <div className="lab">Entregues</div>
                <div className="val" style={{ color: "var(--green)" }}>{dDone}</div>
                <div className="foot">de {dTotal} totais</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr" : "1fr", gap: 16 }}>
              {/* Client health */}
              <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
                <div className="ex-grph" style={{ marginBottom: 14 }}>
                  <span className="gt">Saúde por cliente</span>
                  <span className="gc">{cliDash.size}</span>
                  <span className="gl" />
                </div>
                {[...cliDash.entries()]
                  .sort((a, b) => {
                    const pa = a[1].total ? a[1].done / a[1].total : 0;
                    const pb = b[1].total ? b[1].done / b[1].total : 0;
                    return pa - pb; // worst first
                  })
                  .map(([cid, d]) => {
                    const p = d.total ? Math.round(d.done / d.total * 100) : 0;
                    const barClr = d.late > 0 ? "var(--red)" : p >= 80 ? "var(--green)" : "var(--accent)";
                    return (
                      <div key={cid} style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <Link href={`/expand/clientes/${cid}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)", textDecoration: "none" }}>{cliMap.get(cid) ?? "—"}</Link>
                          <div style={{ fontSize: 11, color: "var(--dim)", display: "flex", gap: 10 }}>
                            {d.late > 0 && <span style={{ color: "var(--red)" }}>⚠ {d.late}</span>}
                            {d.run  > 0 && <span style={{ color: "var(--accent)" }}>▶ {d.run}</span>}
                            <span>{d.done}/{d.total} · {p}%</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: "var(--panel-2)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p}%`, background: barClr, borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Team workload (admin) / My activity (equipe) */}
              {isAdmin ? (
                <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
                  <div className="ex-grph" style={{ marginBottom: 14 }}>
                    <span className="gt">Carga por colaborador</span>
                    <span className="gc">{teamDash.size}</span>
                    <span className="gl" />
                  </div>
                  {[...teamDash.entries()]
                    .filter(([k]) => k !== "Sem responsável")
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([resp, d]) => {
                      const p = d.total ? Math.round(d.done / d.total * 100) : 0;
                      return (
                        <div key={resp} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)" }}>{resp}</span>
                            <div style={{ fontSize: 11, color: "var(--dim)", display: "flex", gap: 10 }}>
                              {d.late > 0 && <span style={{ color: "var(--red)" }}>⚠ {d.late}</span>}
                              <span>{d.total} tarefas · {p}% concluído</span>
                            </div>
                          </div>
                          <div style={{ height: 5, background: "var(--panel-2)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p}%`, background: d.late > d.total * 0.3 ? "var(--warn)" : "var(--accent)", borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
                  <div className="ex-grph" style={{ marginBottom: 14 }}>
                    <span className="gt">Minhas entregas recentes</span>
                    <span className="gc">{recentDone.length}</span>
                    <span className="gl" />
                  </div>
                  {recentDone.map(e => (
                    <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/expand/etapa/${e.id}`} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</Link>
                        <div style={{ fontSize: 10.5, color: "var(--dim)" }}>
                          {cliMap.get(e.cliente_id) ?? "—"}
                          {e.concluida_em && ` · ${new Date(e.concluida_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!recentDone.length && <p style={{ fontSize: 12, color: "var(--dim)" }}>Nenhuma entrega concluída ainda.</p>}
                </div>
              )}
            </div>

            {/* Priority breakdown */}
            <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px" }}>
              <div className="ex-grph" style={{ marginBottom: 14 }}>
                <span className="gt">Distribuição por urgência</span>
                <span className="gc">{dTotal}</span>
                <span className="gl" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {URG_ORDER.map(u => {
                  const count = dashSource.filter(e => urgencia(e) === u).length;
                  const upct  = dTotal ? Math.round(count / dTotal * 100) : 0;
                  const ug    = URG[u];
                  return (
                    <div key={u} style={{ borderRadius: 10, padding: "12px 14px", background: ug.bg, border: `1px solid ${ug.bdr}` }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{ug.emoji}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: ug.c }}>{count}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: ug.c }}>{ug.l}</div>
                      <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>{upct}% do total</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={qs({ v: "lista", st: "late" })} className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12, borderColor: "var(--red)", color: "var(--red)" }}>Ver atrasadas →</Link>
              <Link href={qs({ v: "board" })} className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Ver board →</Link>
              <Link href={qs({ v: "gantt" })} className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Ver Gantt →</Link>
              <Link href="/expand/planejamento" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Planejamento →</Link>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════
          MATRIX — Eisenhower 2×2
      ═══════════════════════════════════════════════════════════════ */}
      {view === "matrix" && (() => {
        const QUADS = [
          { key: "urgente", label: "Fazer Agora",  sub: "Urgente · Importante",    emoji: "🔴", col: "var(--red)",    bg: "color-mix(in srgb,var(--red) 8%,transparent)",    border: "var(--red)" },
          { key: "alta",    label: "Agendar",       sub: "Importante · Não-urgente", emoji: "🟠", col: "var(--warn)",   bg: "color-mix(in srgb,var(--warn) 8%,transparent)",   border: "var(--warn)" },
          { key: "normal",  label: "Delegar",        sub: "Urgente · Menos crítico",  emoji: "🔵", col: "var(--accent)", bg: "color-mix(in srgb,var(--accent) 8%,transparent)", border: "var(--accent)" },
          { key: "baixa",   label: "Eliminar",       sub: "Baixa prioridade",         emoji: "⚪", col: "var(--dim)",    bg: "var(--panel-2)",                                   border: "var(--line-2)" },
        ] as const;

        const openTasks = etapas.filter(e => eff(e) !== "done");

        return (
          <div>
            <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 16, lineHeight: 1.6 }}>
              Classificação automática pela urgência derivada de datas, SLA e marcos.
              Arraste para o <Link href={qs({ v: "board" })} style={{ color: "var(--accent)" }}>Board</Link> para mover entre status.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {QUADS.map(q => {
                const items = openTasks.filter(e => urgencia(e) === q.key);
                return (
                  <div key={q.key} style={{
                    borderRadius: 14, border: `1px solid ${q.border}`,
                    background: q.bg, display: "flex", flexDirection: "column",
                    minHeight: 200, overflow: "hidden",
                  }}>
                    {/* Quadrant header */}
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${q.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{q.emoji}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: q.col }}>{q.label}</div>
                        <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{q.sub}</div>
                      </div>
                      <span style={{
                        marginLeft: "auto", fontSize: 12, fontWeight: 700,
                        padding: "2px 10px", borderRadius: 20,
                        background: `color-mix(in srgb,${q.col} 18%,transparent)`, color: q.col,
                      }}>{items.length}</span>
                    </div>
                    {/* Tasks */}
                    <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 380 }}>
                      {items.length === 0 && (
                        <p style={{ fontSize: 12, color: "var(--dim)", margin: "auto", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
                          Nenhuma tarefa aqui
                        </p>
                      )}
                      {items.slice(0, 20).map(e => {
                        const s = eff(e); const st = ST[s];
                        const resp = e.responsavel_atual ?? e.responsavel;
                        const dateStr = e.data_prevista
                          ? new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;
                        const isPast = e.data_prevista && e.data_prevista < hojeISO;
                        return (
                          <Link key={e.id} href={qs({ qv: e.id })} style={{ textDecoration: "none" }}>
                            <div style={{
                              background: "var(--panel)", borderRadius: 10,
                              padding: "9px 12px", borderLeft: `3px solid ${st.bdr}`,
                            }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", lineHeight: 1.35, marginBottom: 5 }}>
                                {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
                                {e.titulo}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                                {cliMap.get(e.cliente_id) && (
                                  <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 5, background: "color-mix(in srgb,var(--accent) 13%,transparent)", color: "var(--accent)", fontWeight: 600 }}>
                                    {cliMap.get(e.cliente_id)}
                                  </span>
                                )}
                                {e.area && AREAS[e.area] && (
                                  <span style={{ fontSize: 10, color: AREAS[e.area].cor }}>{AREAS[e.area].n}</span>
                                )}
                                {resp && <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{resp}</span>}
                                {dateStr && (
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: isPast ? "var(--red)" : "var(--dim)", marginLeft: "auto" }}>
                                    {isPast ? "⚠ " : "📅 "}{dateStr}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {items.length > 20 && (
                        <Link href={qs({ v: "lista" })} style={{ fontSize: 11, color: "var(--dim)", padding: "4px 0", textAlign: "center" }}>
                          +{items.length - 20} — ver lista completa
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Task Quick View Overlay ────────────────────────────── */}
      {qvEtapa && (
        <TaskQuickView
          etapa={qvEtapa}
          arquivos={qvArquivos}
          logs={qvLogs}
          cliente={qvCliente}
          signedUrls={qvSignedUrls}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Quick Capture (fixed, all views except dash) ────────── */}
      {view !== "dash" && (
        <QuickCapture
          clientes={clientes}
          defaultClienteId={filtroCli || undefined}
          backUrl={`/expand/v2?v=${view}&s=${scope}&g=${grupo}${filtroCli ? `&c=${filtroCli}` : ""}`}
        />
      )}
    </>
  );
}
