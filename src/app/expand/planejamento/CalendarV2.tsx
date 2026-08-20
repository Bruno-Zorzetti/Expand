"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agendarEtapa, criarEtapaCal } from "@/app/expand/actions";
import { AREAS } from "@/lib/expand-esteira";

// ── Types ────────────────────────────────────────────────────────────────────
export type Et = {
  id: string;
  titulo: string;
  area: string | null;
  responsavel: string | null;
  responsavel_atual: string | null;
  sla: string | null;
  status: string;
  marco: boolean;
  data_prevista: string | null;
  cliente_id: string;
  iniciada_em: string | null;
};
export type Cli = { id: string; nome: string };
export type Membro = { id: string; nome: string; papel: string; ini: string };
export type Vista = "dia" | "semana" | "mes" | "timeline";

type PanelState =
  | { kind: "task"; et: Et }
  | { kind: "day"; date: Date }
  | { kind: "new"; date: string }
  | null;

// ── Calendar event type colors ────────────────────────────────────────────────
const TIPO_COR: Record<string, string> = {
  reuniao:  "#4A90E2",
  lembrete: "#F5A623",
  mensagem: "#9B59B6",
  gravacao: "#E74C3C",
  report:   "#2ECC71",
  ligacao:  "#1ABC9C",
  proposta: "#E67E22",
};

const TIPOS = [
  { value: "reuniao",  label: "Reuniao" },
  { value: "lembrete", label: "Lembrete" },
  { value: "mensagem", label: "Mensagem" },
  { value: "gravacao", label: "Gravacao" },
  { value: "report",   label: "Report" },
  { value: "ligacao",  label: "Ligacao" },
  { value: "proposta", label: "Proposta" },
];

// ── Date helpers ─────────────────────────────────────────────────────────────
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s: string) => {
  const d = new Date(s + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const DIAS_ABREV = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_MIN = ["S", "T", "Q", "Q", "S", "S", "D"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_ABR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const areaCor = (area: string | null, marco: boolean) => {
  if (marco) return "var(--accent)";
  if (!area) return "var(--dim)";
  if (TIPO_COR[area]) return TIPO_COR[area];
  if (AREAS[area]) return AREAS[area].cor;
  return "var(--dim)";
};

const elapsedMin = (iso: string | null): string | null => {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? `${m}m` : ""}`;
  return `${Math.floor(h / 24)}d${h % 24 ? ` ${h % 24}h` : ""}`;
};

// ── Chip (compact, for month view) ───────────────────────────────────────────
function Chip({
  e, nomeCli, draggingId, onDragStart, onDragEnd, onClick,
}: {
  e: Et; nomeCli: Record<string, string>; draggingId: string | null;
  onDragStart: (id: string) => void; onDragEnd: () => void; onClick: (e: Et) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  return (
    <div
      draggable
      onDragStart={(ev) => { ev.dataTransfer.setData("etapaId", e.id); onDragStart(e.id); }}
      onDragEnd={onDragEnd}
      onClick={(ev) => { ev.stopPropagation(); onClick(e); }}
      title={`${e.titulo} — ${nomeCli[e.cliente_id] ?? "?"}`}
      style={{
        borderLeft: `3px solid ${cor}`,
        background: draggingId === e.id ? "var(--line)" : running ? `color-mix(in srgb,${cor} 16%,var(--panel-2))` : "var(--panel-2)",
        borderRadius: "0 5px 5px 0", padding: "3px 6px", marginBottom: 3,
        fontSize: 11, lineHeight: 1.35, color: "var(--txt)",
        cursor: draggingId === e.id ? "grabbing" : "grab",
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        opacity: draggingId === e.id ? 0.45 : 1, transition: "opacity .12s, background .12s", userSelect: "none",
      }}
    >
      {running && <span className="cal-pulse-dot" style={{ background: cor, marginRight: 4 }} />}
      {e.marco && <span style={{ color: "var(--accent)", marginRight: 3 }}>◆</span>}
      {e.titulo}
    </div>
  );
}

// ── CardFull (list row, for week/day views) ───────────────────────────────────
function CardFull({
  e, nomeCli, draggingId, onDragStart, onDragEnd, onClick,
}: {
  e: Et; nomeCli: Record<string, string>; draggingId: string | null;
  onDragStart: (id: string) => void; onDragEnd: () => void; onClick: (e: Et) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  const ar = e.area ? (AREAS[e.area] ?? null) : null;
  const tipoLabel = e.area && TIPO_COR[e.area] ? TIPOS.find(t => t.value === e.area)?.label : ar?.n;
  return (
    <div
      draggable
      onDragStart={(ev) => { ev.dataTransfer.setData("etapaId", e.id); onDragStart(e.id); }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(e)}
      style={{
        display: "flex", alignItems: "center", gap: 12, background: "var(--panel-2)",
        border: "1px solid var(--line)", borderLeft: `4px solid ${cor}`,
        borderRadius: "0 12px 12px 0", padding: "12px 16px", marginBottom: 8,
        cursor: "pointer", opacity: draggingId === e.id ? 0.45 : 1, transition: "box-shadow .15s, opacity .12s",
      }}
      onMouseEnter={(el) => ((el.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.12)")}
      onMouseLeave={(el) => ((el.currentTarget as HTMLDivElement).style.boxShadow = "none")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--txt)", marginBottom: 4 }}>
          {running && <span className="cal-pulse-dot" style={{ background: cor, marginRight: 6 }} />}
          {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
          {e.titulo}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>
          {nomeCli[e.cliente_id] ?? "—"}
          {tipoLabel ? ` · ${tipoLabel}` : ""}
          {e.sla ? ` · SLA ${e.sla}` : ""}
          <span style={{ color: running ? cor : undefined }}>
            {running ? ` · ⏱ ${elapsedMin(e.iniciada_em) ?? "?"}` : ""}
          </span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

// ── Detail Panel (single task) ────────────────────────────────────────────────
function DetailPanel({
  e, nomeCli, onClose, onReschedule,
}: {
  e: Et; nomeCli: Record<string, string>;
  onClose: () => void; onReschedule: (etapaId: string, date: string) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  const ar = e.area ? (AREAS[e.area] ?? null) : null;
  const tipoLabel = e.area && TIPO_COR[e.area] ? TIPOS.find(t => t.value === e.area)?.label ?? e.area : ar?.n ?? "Tarefa";
  const [dateVal, setDateVal] = useState(e.data_prevista ?? "");

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5, gap: 12 }}>
      <span style={{ color: "var(--dim)", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--txt)", fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: cor, background: `color-mix(in srgb,${cor} 14%,transparent)`, padding: "3px 9px", borderRadius: 20 }}>
          {tipoLabel}
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)", lineHeight: 1.25, marginBottom: 16 }}>
        {e.marco && <span style={{ color: "var(--accent)" }}>◆ </span>}
        {e.titulo}
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: running ? `color-mix(in srgb,${cor} 14%,transparent)` : "var(--panel-2)", border: `1px solid ${running ? cor : "var(--line)"}`, borderRadius: 20, padding: "5px 12px", fontSize: 11.5, color: running ? cor : "var(--txt)", fontWeight: 700, marginBottom: 20 }}>
        {running && <span className="cal-pulse-dot" style={{ background: cor }} />}
        {running ? `Em execução · ${elapsedMin(e.iniciada_em) ?? "?"}` : "Na fila"}
      </div>

      <Row label="Cliente">{nomeCli[e.cliente_id] ?? "—"}</Row>
      {ar && <Row label="Área">{ar.n}</Row>}
      {e.sla && <Row label="SLA">{e.sla}</Row>}
      {(e.responsavel_atual || e.responsavel) && (
        <Row label="Responsável">{e.responsavel_atual ?? e.responsavel}</Row>
      )}

      <div style={{ margin: "20px 0", padding: 14, background: "var(--panel-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
          Data prevista
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="date" value={dateVal} onChange={(ev) => setDateVal(ev.target.value)}
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--txt)", padding: "7px 10px", fontSize: 12.5, outline: "none", colorScheme: "dark" }} />
          <button onClick={() => { onReschedule(e.id, dateVal); onClose(); }}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
            Salvar
          </button>
        </div>
        {e.data_prevista && (
          <button onClick={() => { onReschedule(e.id, ""); onClose(); }}
            style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 11, cursor: "pointer", marginTop: 8, padding: 0 }}>
            ✕ Remover data
          </button>
        )}
      </div>

      <Link href={`/expand/etapa/${e.id}`}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "var(--accent)", color: "#fff", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 13.5 }}>
        Ver etapa completa
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

// ── Day Panel (task list for a date) ─────────────────────────────────────────
function DayPanel({
  date, etapas, nomeCli, draggingId, onDragStart, onDragEnd, onTaskClick, onNewTask, onClose,
}: {
  date: Date; etapas: Et[]; nomeCli: Record<string, string>; draggingId: string | null;
  onDragStart: (id: string) => void; onDragEnd: () => void; onTaskClick: (e: Et) => void;
  onNewTask: (date: string) => void; onClose: () => void;
}) {
  const ds = ymd(date);
  const its = etapas.filter(e => e.data_prevista === ds);
  const diaSem = DIAS_ABREV[(date.getDay() + 6) % 7];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)" }}>{diaSem}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>{date.getDate()}</div>
          <div style={{ fontSize: 12, color: "var(--dim)" }}>{MESES[date.getMonth()]} {date.getFullYear()}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
      </div>

      <button
        onClick={() => onNewTask(ds)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "var(--panel-2)", border: "1px dashed var(--accent)", borderRadius: 10, padding: "10px 14px", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
        Nova tarefa neste dia
      </button>

      {its.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 13, padding: "32px 0" }}>
          Nenhuma tarefa agendada.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>
            {its.length} tarefa{its.length !== 1 ? "s" : ""}
          </div>
          {its.map((e) => (
            <CardFull key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId}
              onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── New Task Form ─────────────────────────────────────────────────────────────
function NewTaskForm({
  date, clientes, membroNome, onClose, onCreate,
}: {
  date: string; clientes: Cli[]; membroNome: string;
  onClose: () => void;
  onCreate: (tipo: string, titulo: string, clienteId: string, date: string, horarioInicio: string, horarioFim: string) => void;
}) {
  const [tipo, setTipo] = useState("reuniao");
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [dateVal, setDateVal] = useState(date);
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [horarioFim, setHorarioFim] = useState("10:00");
  const cor = TIPO_COR[tipo] ?? "var(--accent)";

  const inpSt: React.CSSProperties = {
    width: "100%", background: "var(--bg)", border: "1px solid var(--line)",
    borderRadius: 8, color: "var(--txt)", padding: "8px 11px", fontSize: 13,
    outline: "none", boxSizing: "border-box", colorScheme: "dark",
  };
  const inpTimeSt: React.CSSProperties = {
    ...inpSt, width: "auto", flex: 1,
  };

  // tipos que têm hora relevante
  const TIPOS_COM_HORA = new Set(["reuniao", "gravacao", "ligacao"]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--txt)" }}>Nova tarefa</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
      </div>

      {/* Tipo selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Tipo</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {TIPOS.map((t) => {
            const tc = TIPO_COR[t.value] ?? "var(--dim)";
            const sel = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                style={{
                  fontSize: 11.5, padding: "5px 12px", borderRadius: 20,
                  border: `1px solid ${sel ? tc : "var(--line)"}`,
                  background: sel ? `color-mix(in srgb,${tc} 14%,transparent)` : "transparent",
                  color: sel ? tc : "var(--dim)", cursor: "pointer", fontWeight: sel ? 700 : 400,
                  transition: "all .12s",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Titulo */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Título</div>
        <input
          type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
          placeholder={`Descreva a ${TIPOS.find(t => t.value === tipo)?.label?.toLowerCase() ?? "tarefa"}...`}
          style={inpSt}
          autoFocus
        />
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Cliente</div>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inpSt}>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Data */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Data</div>
        <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={inpSt} />
      </div>

      {/* Horário — só para tipos com hora relevante */}
      {TIPOS_COM_HORA.has(tipo) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Horário</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="time" value={horarioInicio}
              onChange={(e) => setHorarioInicio(e.target.value)}
              style={inpTimeSt}
            />
            <span style={{ color: "var(--dim)", fontSize: 12, flexShrink: 0 }}>até</span>
            <input
              type="time" value={horarioFim}
              onChange={(e) => setHorarioFim(e.target.value)}
              style={inpTimeSt}
            />
          </div>
        </div>
      )}
      {!TIPOS_COM_HORA.has(tipo) && <div style={{ marginBottom: 20 }} />}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose}
          style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px", fontSize: 13, color: "var(--dim)", cursor: "pointer", fontWeight: 600 }}>
          Cancelar
        </button>
        <button
          onClick={() => {
            if (!titulo.trim() || !clienteId) return;
            onCreate(tipo, titulo.trim(), clienteId, dateVal, horarioInicio, horarioFim);
          }}
          style={{ flex: 2, background: cor, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          Criar {TIPOS.find(t => t.value === tipo)?.label}
        </button>
      </div>
    </div>
  );
}

// ── Status metadata ──────────────────────────────────────────────────────────
const STATUS_META: Record<string, { l: string; c: string }> = {
  run:  { l: "Em execução", c: "#6FBF92" },
  late: { l: "Atrasada",    c: "#CE6A5F" },
  wait: { l: "Aguardando",  c: "#D9A94E" },
  idle: { l: "Na fila",     c: "#7C8C7F" },
  done: { l: "Concluída",   c: "#3B82F6" },
};

// ── SLA → days (for timeline bar width) ──────────────────────────────────────
function slaParaDias(sla: string | null): number {
  if (!sla) return 1;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1, Math.ceil(Number(mh[1]) / 8));
  return 1;
}

// ── Timeline View ─────────────────────────────────────────────────────────────
function TimelineView({
  etapas, nomeCli, anchor, hojeS, onTaskClick,
}: {
  etapas: Et[]; nomeCli: Record<string, string>;
  anchor: Date; hojeS: string;
  onTaskClick: (e: Et) => void;
}) {
  const DAYS = 28;
  const start = monday(anchor);
  const cols = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const startMs = start.getTime();
  const endMs   = addDays(start, DAYS).getTime();

  // Group tasks with a date in window + tasks without date
  const inWindow = etapas.filter((e) => {
    if (!e.data_prevista) return false;
    const d = new Date(e.data_prevista + "T00:00:00").getTime();
    return d >= startMs && d < endMs;
  });
  const noDate = etapas.filter((e) => !e.data_prevista);

  // Group by client
  const byClient: Map<string, Et[]> = new Map();
  for (const e of inWindow) {
    const arr = byClient.get(e.cliente_id) ?? [];
    arr.push(e);
    byClient.set(e.cliente_id, arr);
  }

  const HEADER_H = 36;
  const ROW_H    = 36;
  const BAR_H    = 24;
  const BAR_TOP  = (ROW_H - BAR_H) / 2;
  const DAY_W    = 32;
  const LABEL_W  = 140;
  const totalW   = LABEL_W + DAYS * DAY_W;

  const months: { label: string; start: number; span: number }[] = [];
  let curMo = -1, curSpan = 0, curStart = 0;
  cols.forEach((d, i) => {
    const mo = d.getMonth();
    if (mo !== curMo) {
      if (curMo >= 0) months.push({ label: `${MESES_ABR[curMo]} ${cols[curStart].getFullYear()}`, start: curStart, span: curSpan });
      curMo = mo; curStart = i; curSpan = 1;
    } else { curSpan++; }
  });
  if (curMo >= 0) months.push({ label: `${MESES_ABR[curMo]} ${cols[curStart].getFullYear()}`, start: curStart, span: curSpan });

  const todayIdx = cols.findIndex((d) => ymd(d) === hojeS);

  const clientRows = Array.from(byClient.entries()).map(([cliId, tasks]) => ({
    cliId, cliNome: nomeCli[cliId] ?? "?", tasks,
  }));

  return (
    <div style={{ overflowX: "auto", position: "relative" }}>
      <svg
        width={totalW}
        height={HEADER_H * 2 + clientRows.reduce((acc, r) => acc + r.tasks.length * ROW_H, 0) + (noDate.length > 0 ? 32 : 0) + 20}
        style={{ display: "block", fontFamily: "var(--font-sans, inherit)" }}
      >
        {/* Month headers */}
        {months.map((m) => (
          <g key={m.label}>
            <rect x={LABEL_W + m.start * DAY_W} y={0} width={m.span * DAY_W} height={HEADER_H}
              fill="var(--panel-2, #0c1629)" />
            <text x={LABEL_W + m.start * DAY_W + 6} y={HEADER_H / 2 + 4}
              fill="var(--txt, #eee)" fontSize="11" fontWeight="700">{m.label}</text>
          </g>
        ))}

        {/* Day column headers */}
        {cols.map((d, i) => {
          const isToday = ymd(d) === hojeS;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const x = LABEL_W + i * DAY_W;
          return (
            <g key={i}>
              <rect x={x} y={HEADER_H} width={DAY_W} height={HEADER_H}
                fill={isToday ? "color-mix(in srgb,var(--accent) 18%,var(--panel-2,#0c1629))" : isWeekend ? "color-mix(in srgb,var(--line) 30%,var(--panel-2,#0c1629))" : "var(--panel-2,#0c1629)"} />
              <text x={x + DAY_W / 2} y={HEADER_H + HEADER_H / 2 + 4}
                fill={isToday ? "var(--accent,#C89B5E)" : isWeekend ? "var(--dim,#64748b)" : "var(--dim,#64748b)"}
                fontSize="10" textAnchor="middle" fontWeight={isToday ? "800" : "500"}>
                {d.getDate()}
              </text>
            </g>
          );
        })}

        {/* Frozen label header */}
        <rect x={0} y={0} width={LABEL_W} height={HEADER_H * 2} fill="var(--bg,#08110E)" />
        <text x={10} y={HEADER_H + HEADER_H / 2 + 4} fill="var(--dim)" fontSize="10" fontWeight="700">CLIENTE / TAREFA</text>

        {/* Task rows */}
        {clientRows.map(({ cliNome, tasks }, gi) => {
          const groupY = HEADER_H * 2 + clientRows.slice(0, gi).reduce((a, r) => a + r.tasks.length * ROW_H, 0);
          const groupH = tasks.length * ROW_H;
          return (
            <g key={gi}>
              {/* Client label band */}
              <rect x={0} y={groupY} width={LABEL_W} height={groupH} fill="var(--panel,#08110E)" />
              <text x={8} y={groupY + groupH / 2 + 4} fill="var(--txt)" fontSize="10.5" fontWeight="700"
                clipPath={`url(#clip-lbl-${gi})`}>{cliNome}</text>
              <clipPath id={`clip-lbl-${gi}`}>
                <rect x={0} y={groupY} width={LABEL_W - 4} height={groupH} />
              </clipPath>

              {tasks.map((e, ri) => {
                const rowY = groupY + ri * ROW_H;
                const cor = areaCor(e.area, e.marco);
                const running = e.status === "run";
                const d0 = new Date(e.data_prevista! + "T00:00:00");
                const dayOff = Math.round((d0.getTime() - startMs) / 86400000);
                const durDays = Math.max(1, slaParaDias(e.sla));
                const barX = LABEL_W + dayOff * DAY_W;
                const barW = Math.min(durDays * DAY_W - 4, totalW - barX - 2);

                return (
                  <g key={e.id} style={{ cursor: "pointer" }}
                    onClick={() => onTaskClick(e)}>
                    {/* Hover background */}
                    <rect x={LABEL_W} y={rowY} width={DAYS * DAY_W} height={ROW_H}
                      fill="transparent" />
                    {/* Column lines */}
                    {cols.map((_, ci) => (
                      <line key={ci} x1={LABEL_W + ci * DAY_W} y1={rowY} x2={LABEL_W + ci * DAY_W} y2={rowY + ROW_H}
                        stroke="var(--line,#1e3a5f)" strokeWidth="0.4" />
                    ))}
                    {/* Task bar */}
                    <rect x={barX + 2} y={rowY + BAR_TOP} width={Math.max(barW, 4)} height={BAR_H}
                      rx={5} fill={`color-mix(in srgb,${cor} 25%,var(--panel-2,#0c1629))`}
                      stroke={cor} strokeWidth={running ? "1.8" : "1"} />
                    {running && (
                      <rect x={barX + 2} y={rowY + BAR_TOP} width={4} height={BAR_H}
                        rx={5} fill={cor}>
                        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
                      </rect>
                    )}
                    {/* Task title */}
                    <text x={barX + 8} y={rowY + ROW_H / 2 + 4}
                      fill={cor} fontSize="10" fontWeight="600"
                      clipPath={`url(#clip-bar-${e.id})`}>
                      {e.marco ? "◆ " : ""}{e.titulo}
                    </text>
                    <clipPath id={`clip-bar-${e.id}`}>
                      <rect x={barX + 4} y={rowY} width={Math.max(barW - 4, 0)} height={ROW_H} />
                    </clipPath>
                  </g>
                );
              })}

              {/* Separator line */}
              <line x1={0} y1={groupY + groupH} x2={totalW} y2={groupY + groupH}
                stroke="var(--line)" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* Today line */}
        {todayIdx >= 0 && (
          <line
            x1={LABEL_W + todayIdx * DAY_W + DAY_W / 2}
            y1={HEADER_H}
            x2={LABEL_W + todayIdx * DAY_W + DAY_W / 2}
            y2={HEADER_H * 2 + clientRows.reduce((a, r) => a + r.tasks.length * ROW_H, 0)}
            stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
        )}

        {/* Top border */}
        <rect x={0} y={0} width={totalW} height={1} fill="var(--line)" />
        <rect x={0} y={HEADER_H} width={totalW} height={1} fill="var(--line)" />
        <rect x={0} y={HEADER_H * 2} width={totalW} height={1} fill="var(--line)" />
        <rect x={LABEL_W} y={0} width={1} height={HEADER_H * 2 + clientRows.reduce((a, r) => a + r.tasks.length * ROW_H, 0)} fill="var(--line)" />
      </svg>

      {/* Tasks without date */}
      {noDate.length > 0 && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--warn)", marginBottom: 8 }}>
            Sem data ({noDate.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {noDate.map((e) => {
              const cor = areaCor(e.area, e.marco);
              return (
                <button key={e.id} onClick={() => onTaskClick(e)} style={{
                  background: `color-mix(in srgb,${cor} 12%,var(--panel-2))`,
                  border: `1px solid ${cor}`, borderRadius: 8, padding: "4px 10px",
                  fontSize: 11.5, color: cor, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {e.marco ? "◆ " : ""}{e.titulo}
                  <span style={{ fontSize: 10, color: "var(--dim)", marginLeft: 6 }}>{nomeCli[e.cliente_id] ?? "?"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Calendar (sidebar) ───────────────────────────────────────────────────
function MiniCalendar({
  mainAnchor, etapas, hojeS, onDayClick,
}: {
  mainAnchor: Date; etapas: Et[]; hojeS: string; onDayClick: (d: Date) => void;
}) {
  const [mini, setMini] = useState(new Date(mainAnchor));
  const ini = new Date(mini.getFullYear(), mini.getMonth(), 1);
  const g0 = monday(ini);
  const dias: Date[] = [];
  let cur = g0;
  while (cur.getMonth() <= mini.getMonth() || dias.length < 35) {
    dias.push(cur);
    cur = addDays(cur, 1);
    if (dias.length >= 42) break;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() - 1, 1))} style={btnIconSt}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>
          {MESES_ABR[mini.getMonth()]} {mini.getFullYear()}
        </span>
        <button onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() + 1, 1))} style={btnIconSt}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, fontSize: 10, textAlign: "center" }}>
        {DIAS_MIN.map((d, i) => (
          <div key={i} style={{ color: "var(--dim)", fontWeight: 700, paddingBottom: 3 }}>{d}</div>
        ))}
        {dias.map((d) => {
          const ds = ymd(d);
          const isToday = ds === hojeS;
          const isAnchor = ds === ymd(mainAnchor);
          const inMonth = d.getMonth() === mini.getMonth();
          const hasEvt = etapas.some((e) => e.data_prevista === ds);
          return (
            <div
              key={ds}
              onClick={() => onDayClick(d)}
              style={{
                padding: "3px 1px", borderRadius: 4, cursor: "pointer",
                background: isAnchor ? "var(--accent)" : isToday ? `color-mix(in srgb,var(--accent) 15%,transparent)` : "transparent",
                color: isAnchor ? "#fff" : !inMonth ? "transparent" : isToday ? "var(--accent)" : "var(--txt)",
                fontWeight: isToday || isAnchor ? 800 : 400,
                position: "relative", transition: "background .1s",
              }}
            >
              {inMonth ? d.getDate() : ""}
              {hasEvt && !isAnchor && inMonth && (
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: isToday ? "#fff" : "var(--accent)", position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnIconSt: React.CSSProperties = {
  background: "none", border: "none", color: "var(--dim)", cursor: "pointer",
  fontSize: 16, padding: "2px 6px", borderRadius: 4, lineHeight: 1,
};

// ── Main CalendarV2 ───────────────────────────────────────────────────────────
export function CalendarV2({
  etapas: serverEtapas, nomeCli, equipe, isAdmin, clientes,
  membroId, membroNome, initialView, initialDate, initialFiltroCli,
}: {
  etapas: Et[]; nomeCli: Record<string, string>; equipe: Membro[];
  isAdmin: boolean; clientes: Cli[]; membroId: string; membroNome: string;
  initialView: Vista; initialDate: string; initialFiltroCli: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [view, setView] = useState<Vista>(initialView);
  const [anchor, setAnchor] = useState(() => parseDate(initialDate));
  const [filtroCliente, setFiltroCliente] = useState(initialFiltroCli);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [panel, setPanel] = useState<PanelState>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);

  const [optimisticEtapas, updateOptimistic] = useOptimistic(
    serverEtapas,
    (state, { id, date }: { id: string; date: string }) =>
      state.map((e) => e.id === id ? { ...e, data_prevista: date || null } : e)
  );

  const hojeS = ymd(new Date());
  const etapas = optimisticEtapas
    .filter((e) => !filtroCliente || e.cliente_id === filtroCliente)
    .filter((e) => !filtroStatus || e.status === filtroStatus)
    .filter((e) => !filtroArea || e.area === filtroArea);

  // Unique areas from all etapas for the filter
  const areasUnicas = Array.from(new Set(optimisticEtapas.map((e) => e.area).filter(Boolean) as string[])).sort();

  let ini: Date, gridDias: Date[];
  if (view === "dia") {
    ini = anchor; gridDias = [anchor];
  } else if (view === "semana") {
    ini = monday(anchor);
    gridDias = Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  } else if (view === "timeline") {
    ini = monday(anchor);
    gridDias = Array.from({ length: 28 }, (_, i) => addDays(ini, i));
  } else {
    ini = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const g0 = monday(ini);
    gridDias = Array.from({ length: 42 }, (_, i) => addDays(g0, i));
  }

  const doDia = (d: Date) => etapas.filter((e) => e.data_prevista === ymd(d));
  const semData = etapas.filter((e) => !e.data_prevista);

  const label =
    view === "dia"
      ? anchor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "long" })
      : view === "semana"
      ? `${ini.getDate()}–${addDays(ini, 6).getDate()} ${MESES_ABR[addDays(ini, 6).getMonth()]} ${addDays(ini, 6).getFullYear()}`
      : view === "timeline"
      ? `${monday(anchor).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${addDays(monday(anchor), 27).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      : `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const navigate = (dir: number) => {
    setAnchor(
      view === "dia" ? addDays(anchor, dir)
      : view === "semana" ? addDays(anchor, dir * 7)
      : view === "timeline" ? addDays(anchor, dir * 28)
      : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)
    );
  };

  const switchMembro = (id: string) => {
    const p = new URLSearchParams();
    if (id !== equipe[0]?.id) p.set("m", id);
    if (view !== "mes" && view !== "timeline") p.set("v", view);
    const s = p.toString();
    router.push(`/expand/planejamento${s ? `?${s}` : ""}`);
  };

  const reschedule = (etapaId: string, date: string) => {
    startTransition(async () => {
      updateOptimistic({ id: etapaId, date });
      const fd = new FormData();
      fd.set("etapaId", etapaId); fd.set("data", date);
      await agendarEtapa(fd);
      router.refresh();
    });
  };

  const createTask = (tipo: string, titulo: string, clienteId: string, date: string, horarioInicio: string, horarioFim: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("tipo", tipo); fd.set("titulo", titulo);
      fd.set("clienteId", clienteId); fd.set("date", date);
      fd.set("membroNome", membroNome);
      if (horarioInicio) fd.set("horario_inicio", horarioInicio);
      if (horarioFim)    fd.set("horario_fim",    horarioFim);
      await criarEtapaCal(fd);
      router.refresh();
      setPanel(null);
    });
  };

  const onDrop = (dateStr: string, ev: React.DragEvent) => {
    ev.preventDefault();
    const etapaId = ev.dataTransfer.getData("etapaId");
    if (!etapaId) return;
    setDropDate(null); setDraggingId(null);
    reschedule(etapaId, dateStr);
  };

  const chipProps = {
    nomeCli, draggingId,
    onDragStart: setDraggingId,
    onDragEnd: () => { setDraggingId(null); setDropDate(null); },
    onClick: (e: Et) => setPanel({ kind: "task", et: e }),
  };

  const DZ = ({ dateStr, children, style }: { dateStr: string; children: React.ReactNode; style?: React.CSSProperties }) => {
    const active = dropDate === dateStr && !!draggingId;
    return (
      <div
        style={{
          ...style,
          outline: active ? "2px dashed var(--accent)" : "none",
          outlineOffset: -2,
          background: active ? `color-mix(in srgb,var(--accent) 8%,${(style?.background as string) ?? "transparent"})` : (style?.background as string | undefined),
          borderRadius: (style?.borderRadius as number | string | undefined) ?? 6,
          transition: "outline .1s, background .1s",
        }}
        onDragOver={(e) => { e.preventDefault(); setDropDate(dateStr); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropDate(null); }}
        onDrop={(e) => onDrop(dateStr, e)}
      >
        {children}
      </div>
    );
  };

  const btnNav: React.CSSProperties = {
    background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 8,
    color: "var(--txt)", fontSize: 16, padding: "4px 10px", cursor: "pointer", lineHeight: 1,
  };

  return (
    <>
      <style>{`
        @keyframes calPulse { 0%,100%{opacity:1} 50%{opacity:.25} }
        .cal-pulse-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          animation: calPulse 1.6s ease-in-out infinite; vertical-align: middle;
        }
        .cal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 900;
          opacity: 0; pointer-events: none; transition: opacity .22s;
        }
        .cal-overlay.open { opacity: 1; pointer-events: all; }
        .cal-panel {
          position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
          background: var(--bg); border-left: 1px solid var(--line);
          box-shadow: -12px 0 40px rgba(0,0,0,.18); z-index: 901;
          overflow-y: auto; padding: 24px;
          transform: translateX(100%);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .cal-panel.open { transform: translateX(0); }
        .cal-mes-cell {
          border-radius: 8px; border: 1px solid var(--line); background: var(--bg);
          min-height: 80px; padding: 5px; cursor: pointer; transition: border-color .12s;
        }
        .cal-mes-cell:hover { border-color: var(--accent); }
        .cal-mes-cell.hoje { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .cal-mes-cell.out { opacity: .22; background: transparent; border-color: transparent; pointer-events:none; }
        .cal-mes-dn { font-size: 11px; font-weight: 700; color: var(--dim); margin-bottom: 3px; display: block; }
        .cal-mes-cell.hoje .cal-mes-dn { color: var(--accent); }
        .cal-day-row {
          border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
          background: var(--bg); margin-bottom: 8px; transition: border-color .12s;
        }
        .cal-day-row.hoje { border-color: var(--accent); }
        .cal-day-head {
          display: flex; align-items: center; gap: 10; padding: 10px 14px;
          border-bottom: 1px solid var(--line); background: var(--panel-2);
          cursor: pointer;
        }
        .cal-day-row.hoje .cal-day-head { background: color-mix(in srgb,var(--accent) 6%,transparent); }
        .sidebar-card { background: var(--panel-2); border-radius: 12px; padding: 14px; margin-bottom: 12px; border: 1px solid var(--line); }
        @media(max-width:860px) {
          .cal-layout { flex-direction: column !important; }
          .cal-sidebar { width: 100% !important; }
          .cal-panel { width: 100% !important; }
        }
        @media(max-width:640px) {
          .cal-mes-cell { min-height: 46px !important; padding: 2px 3px !important; }
          .cal-mes-dn { font-size: 10px !important; margin-bottom: 1px !important; }
          .cal-chip-full { display: none !important; }
          .cal-chip-ct { display: flex !important; }
          .cal-col-full { display: none; }
          .cal-col-min { display: inline; }
          .cal-panel { top: 0; padding: 16px; }
          .cal-ctrl-hd { flex-wrap: wrap !important; }
          .cal-select-cli { width: 100% !important; margin-left: 0 !important; }
          .cal-btn-nova { width: 100% !important; justify-content: center; }
          .cal-view-tabs { width: 100%; }
          .cal-view-tabs button { flex: 1; padding: 5px 4px !important; font-size: 10px !important; }
        }
        @media(min-width:641px) {
          .cal-chip-ct { display: none; }
          .cal-col-min { display: none; }
        }
      `}</style>

      <div className="cal-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* ═══ SIDEBAR ═══════════════════════════════════════════════════ */}
        <div className="cal-sidebar" style={{ width: 215, flexShrink: 0 }}>

          <div className="sidebar-card">
            <MiniCalendar mainAnchor={anchor} etapas={optimisticEtapas} hojeS={hojeS}
              onDayClick={(d) => {
                setAnchor(d);
                if (view === "mes") setPanel({ kind: "day", date: d });
              }} />
          </div>

          {isAdmin && equipe.length > 0 && (
            <div className="sidebar-card">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>Equipe</div>
              {equipe.map((m) => {
                const active = m.nome === membroNome;
                return (
                  <button key={m.id} onClick={() => switchMembro(m.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: active ? `color-mix(in srgb,var(--accent) 12%,transparent)` : "transparent", border: active ? "1px solid var(--accent)" : "1px solid transparent", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: active ? "var(--accent)" : "var(--txt)", fontSize: 12, fontWeight: active ? 700 : 400, transition: "all .15s", marginBottom: 2 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: active ? "var(--accent)" : "var(--bg)", border: "1px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: active ? "#fff" : "var(--txt)", flexShrink: 0 }}>
                      {m.ini}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nome}</span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tipos legend */}
          <div className="sidebar-card">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>Tipos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {TIPOS.map((t) => (
                <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--txt)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: TIPO_COR[t.value], flexShrink: 0 }} />
                  {t.label}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--txt)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)", flexShrink: 0 }} />
                Marco
              </div>
            </div>
          </div>

          {semData.length > 0 && (
            <div className="sidebar-card">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--warn)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                A agendar
                <span style={{ background: `color-mix(in srgb,var(--warn) 18%,transparent)`, color: "var(--warn)", borderRadius: 20, padding: "1px 7px", fontSize: 10 }}>
                  {semData.length}
                </span>
              </div>
              <p style={{ fontSize: 10.5, color: "var(--dim)", marginBottom: 8, marginTop: -4 }}>Arraste para o calendário</p>
              {semData.map((e) => <Chip key={e.id} e={e} {...chipProps} />)}
            </div>
          )}
        </div>

        {/* ═══ MAIN ══════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Top controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div className="cal-ctrl-hd" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* View tabs */}
              <div className="cal-view-tabs" style={{ display: "flex", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 9, padding: 2, gap: 1 }}>
                {(["dia", "semana", "mes", "timeline"] as Vista[]).map((v, i) => (
                  <button key={v} onClick={() => setView(v)}
                    style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", background: view === v ? "var(--accent)" : "transparent", color: view === v ? "#fff" : "var(--dim)", transition: "all .15s" }}>
                    {["Dia", "Semana", "Mês", "Timeline"][i]}
                  </button>
                ))}
              </div>

              <button onClick={() => navigate(-1)} style={btnNav}>‹</button>
              <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 160, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
              <button onClick={() => navigate(1)} style={btnNav}>›</button>
              <button
                onClick={() => setAnchor(new Date())}
                style={{ ...btnNav, fontSize: 11.5, color: "var(--accent)", border: "1px solid var(--accent)", fontWeight: 700 }}
              >
                Hoje
              </button>

              {/* Client filter */}
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="cal-select-cli"
                style={{ marginLeft: "auto", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--txt)", padding: "5px 10px", fontSize: 12, cursor: "pointer", outline: "none" }}
              >
                <option value="">Todos os clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              {/* Nova tarefa */}
              <button
                onClick={() => setPanel({ kind: "new", date: hojeS })}
                className="cal-btn-nova"
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                + Nova
              </button>
            </div>

            {/* Filter chips: status + area */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 2 }}>Status</span>
              {["", ...Object.keys(STATUS_META)].map((s) => {
                const meta = s ? STATUS_META[s] : null;
                const active = filtroStatus === s;
                return (
                  <button key={s || "all"} onClick={() => setFiltroStatus(s)}
                    style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      border: `1px solid ${active ? (meta?.c ?? "var(--accent)") : "var(--line)"}`,
                      background: active ? `color-mix(in srgb,${meta?.c ?? "var(--accent)"} 15%,transparent)` : "transparent",
                      color: active ? (meta?.c ?? "var(--accent)") : "var(--dim)",
                      cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                    }}>
                    {s ? meta!.l : "Todos"}
                  </button>
                );
              })}

              {areasUnicas.length > 0 && (
                <>
                  <span style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginLeft: 8, marginRight: 2 }}>Área</span>
                  {["", ...areasUnicas].map((a) => {
                    const cor = a ? areaCor(a, false) : "var(--accent)";
                    const active = filtroArea === a;
                    const label = a ? (AREAS[a]?.n ?? TIPOS.find(t => t.value === a)?.label ?? a) : "Todas";
                    return (
                      <button key={a || "all-area"} onClick={() => setFiltroArea(a)}
                        style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 20,
                          border: `1px solid ${active ? cor : "var(--line)"}`,
                          background: active ? `color-mix(in srgb,${cor} 15%,transparent)` : "transparent",
                          color: active ? cor : "var(--dim)",
                          cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                        }}>
                        {label}
                      </button>
                    );
                  })}
                </>
              )}

              {(filtroStatus || filtroArea) && (
                <button onClick={() => { setFiltroStatus(""); setFiltroArea(""); }}
                  style={{ fontSize: 11, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", marginLeft: 4, textDecoration: "underline", fontFamily: "inherit" }}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* ── SEMANA — lista ──────────────────────────────────────── */}
          {view === "semana" && (
            <div>
              {gridDias.map((d) => {
                const ds = ymd(d);
                const its = doDia(d);
                const hoje = ds === hojeS;
                const diaSem = DIAS_ABREV[(d.getDay() + 6) % 7];
                return (
                  <div key={ds} className={`cal-day-row${hoje ? " hoje" : ""}`}>
                    <div className="cal-day-head" onClick={() => setPanel({ kind: "day", date: d })}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: hoje ? "var(--accent)" : "var(--dim)", minWidth: 28 }}>
                        {diaSem}
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: hoje ? "var(--accent)" : "var(--txt)", lineHeight: 1, minWidth: 30 }}>
                        {d.getDate()}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--dim)" }}>{MESES_ABR[d.getMonth()]}</span>
                      {its.length > 0 && (
                        <span style={{ background: `color-mix(in srgb,var(--accent) 14%,transparent)`, color: "var(--accent)", borderRadius: 20, padding: "1px 8px", fontSize: 10.5, fontWeight: 700 }}>
                          {its.length}
                        </span>
                      )}
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setPanel({ kind: "new", date: ds }); }}
                        style={{ marginLeft: "auto", background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 10px", fontSize: 11, color: "var(--dim)", cursor: "pointer" }}
                      >
                        + Nova
                      </button>
                    </div>
                    {its.length > 0 && (
                      <DZ dateStr={ds} style={{ padding: "10px 12px" }}>
                        {its.map((e) => <CardFull key={e.id} e={e} {...chipProps} />)}
                      </DZ>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MÊS ─────────────────────────────────────────────── */}
          {view === "mes" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                {DIAS_ABREV.map((d, i) => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", textAlign: "center", padding: "2px 0" }}>
                    <span className="cal-col-full">{d}</span>
                    <span className="cal-col-min">{DIAS_MIN[i]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {gridDias.map((d) => {
                  const ds = ymd(d);
                  const outMes = d.getMonth() !== anchor.getMonth();
                  const its = doDia(d);
                  const hoje = ds === hojeS;
                  return (
                    <DZ key={ds} dateStr={ds}>
                      <div
                        className={`cal-mes-cell${hoje ? " hoje" : ""}${outMes ? " out" : ""}`}
                        onClick={() => { setAnchor(d); setPanel({ kind: "day", date: d }); }}
                      >
                        <span className="cal-mes-dn">{d.getDate()}</span>
                        <div className="cal-chip-full">
                          {its.slice(0, 3).map((e) => <Chip key={e.id} e={e} {...chipProps} />)}
                          {its.length > 3 && (
                            <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>+{its.length - 3}</div>
                          )}
                        </div>
                        <div className="cal-chip-ct" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", alignItems: "center", justifyContent: "center" }}>
                          {its.length > 0 ? its.length : ""}
                        </div>
                      </div>
                    </DZ>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TIMELINE ────────────────────────────────────────── */}
          {view === "timeline" && (
            <TimelineView
              etapas={etapas}
              nomeCli={nomeCli}
              anchor={anchor}
              hojeS={hojeS}
              onTaskClick={(e) => setPanel({ kind: "task", et: e })}
            />
          )}

          {/* ── DIA ─────────────────────────────────────────────── */}
          {view === "dia" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  onClick={() => setPanel({ kind: "new", date: ymd(anchor) })}
                  style={{ background: "none", border: "1px dashed var(--accent)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}
                >
                  + Nova tarefa neste dia
                </button>
              </div>
              <DZ dateStr={ymd(anchor)} style={{ minHeight: 200, borderRadius: 12 }}>
                {doDia(anchor).length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 13, padding: "60px 0", border: "1px dashed var(--line)", borderRadius: 12 }}>
                    Nenhuma tarefa para este dia.
                    <br />
                    <span style={{ fontSize: 11.5 }}>Arraste um card da coluna &ldquo;A agendar&rdquo; aqui.</span>
                  </div>
                ) : (
                  doDia(anchor).map((e) => <CardFull key={e.id} e={e} {...chipProps} />)
                )}
              </DZ>
            </div>
          )}
        </div>
      </div>

      {/* ── SLIDE PANEL ───────────────────────────────────────────────────── */}
      <div className={`cal-overlay${panel ? " open" : ""}`} onClick={() => setPanel(null)} />
      <div className={`cal-panel${panel ? " open" : ""}`}>
        {panel?.kind === "task" && (
          <DetailPanel e={panel.et} nomeCli={nomeCli}
            onClose={() => setPanel(null)}
            onReschedule={(etapaId, date) => {
              reschedule(etapaId, date);
              setPanel((prev) => prev?.kind === "task" && prev.et.id === etapaId
                ? { ...prev, et: { ...prev.et, data_prevista: date || null } }
                : prev);
            }} />
        )}
        {panel?.kind === "day" && (
          <DayPanel
            date={panel.date}
            etapas={optimisticEtapas}
            nomeCli={nomeCli}
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDragEnd={() => { setDraggingId(null); setDropDate(null); }}
            onTaskClick={(e) => setPanel({ kind: "task", et: e })}
            onNewTask={(date) => setPanel({ kind: "new", date })}
            onClose={() => setPanel(null)}
          />
        )}
        {panel?.kind === "new" && (
          <NewTaskForm
            date={panel.date}
            clientes={clientes}
            membroNome={membroNome}
            onClose={() => setPanel(null)}
            onCreate={createTask}
          />
        )}
      </div>
    </>
  );
}
