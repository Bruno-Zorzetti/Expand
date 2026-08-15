"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agendarEtapa } from "@/app/expand/actions";
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
export type Vista = "dia" | "semana" | "mes";

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

const areaCor = (area: string | null, marco: boolean) =>
  marco ? "var(--accent)" : area && AREAS[area] ? AREAS[area].cor : "var(--dim)";

const elapsedMin = (iso: string | null): string | null => {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? `${m}m` : ""}`;
  return `${Math.floor(h / 24)}d${h % 24 ? ` ${h % 24}h` : ""}`;
};

// ── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  e,
  nomeCli,
  draggingId,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  e: Et;
  nomeCli: Record<string, string>;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: (e: Et) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  const isDragging = draggingId === e.id;
  return (
    <div
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData("etapaId", e.id);
        onDragStart(e.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(e)}
      title={`${e.titulo} — ${nomeCli[e.cliente_id] ?? "?"}`}
      style={{
        borderLeft: `3px solid ${cor}`,
        background: isDragging
          ? "var(--line)"
          : running
          ? `color-mix(in srgb,${cor} 16%,var(--panel-2))`
          : "var(--panel-2)",
        borderRadius: "0 5px 5px 0",
        padding: "3px 6px",
        marginBottom: 3,
        fontSize: 11,
        lineHeight: 1.35,
        color: "var(--txt)",
        cursor: isDragging ? "grabbing" : "grab",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        opacity: isDragging ? 0.45 : 1,
        transition: "opacity .12s, background .12s",
        userSelect: "none",
      }}
    >
      {running && (
        <span className="cal-pulse-dot" style={{ background: cor, marginRight: 4 }} />
      )}
      {e.marco && <span style={{ color: "var(--accent)", marginRight: 3 }}>◆</span>}
      {e.titulo}
    </div>
  );
}

function CardFull({
  e,
  nomeCli,
  draggingId,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  e: Et;
  nomeCli: Record<string, string>;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: (e: Et) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  const ar = e.area ? AREAS[e.area] : null;
  return (
    <div
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData("etapaId", e.id);
        onDragStart(e.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(e)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--panel-2)",
        border: "1px solid var(--line)",
        borderLeft: `4px solid ${cor}`,
        borderRadius: "0 12px 12px 0",
        padding: "12px 16px",
        marginBottom: 8,
        cursor: "pointer",
        opacity: draggingId === e.id ? 0.45 : 1,
        transition: "box-shadow .15s, opacity .12s",
      }}
      onMouseEnter={(el) =>
        ((el.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,.12)")
      }
      onMouseLeave={(el) =>
        ((el.currentTarget as HTMLDivElement).style.boxShadow = "none")
      }
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--txt)", marginBottom: 4 }}>
          {running && <span className="cal-pulse-dot" style={{ background: cor, marginRight: 6 }} />}
          {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
          {e.titulo}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.4 }}>
          {nomeCli[e.cliente_id] ?? "—"}
          {ar ? ` · ${ar.n}` : ""}
          {e.sla ? ` · SLA ${e.sla}` : ""}
          <span style={{ color: running ? cor : undefined }}>
            {running ? ` · ⏱ ${elapsedMin(e.iniciada_em) ?? "?"}` : " · na fila"}
          </span>
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

function DetailPanel({
  e,
  nomeCli,
  onClose,
  onReschedule,
}: {
  e: Et;
  nomeCli: Record<string, string>;
  onClose: () => void;
  onReschedule: (etapaId: string, date: string) => void;
}) {
  const cor = areaCor(e.area, e.marco);
  const running = e.status === "run";
  const ar = e.area ? AREAS[e.area] : null;
  const [dateVal, setDateVal] = useState(e.data_prevista ?? "");

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "9px 0",
        borderBottom: "1px solid var(--line)",
        fontSize: 12.5,
        gap: 12,
      }}
    >
      <span style={{ color: "var(--dim)", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--txt)", fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );

  return (
    <div>
      {/* Area tag + Close */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            color: cor,
            background: `color-mix(in srgb,${cor} 14%,transparent)`,
            padding: "3px 9px",
            borderRadius: 20,
          }}
        >
          {ar?.n ?? "Tarefa"}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--dim)",
            fontSize: 18,
            padding: 4,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)", lineHeight: 1.25, marginBottom: 16 }}>
        {e.marco && <span style={{ color: "var(--accent)" }}>◆ </span>}
        {e.titulo}
      </div>

      {/* Status badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: running
            ? `color-mix(in srgb,${cor} 14%,transparent)`
            : "var(--panel-2)",
          border: `1px solid ${running ? cor : "var(--line)"}`,
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 11.5,
          color: running ? cor : "var(--txt)",
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        {running && <span className="cal-pulse-dot" style={{ background: cor }} />}
        {running ? `Em execução · ${elapsedMin(e.iniciada_em) ?? "?"}` : "Na fila"}
      </div>

      {/* Info */}
      <Row label="Cliente">{nomeCli[e.cliente_id] ?? "—"}</Row>
      {ar && <Row label="Área">{ar.n}</Row>}
      {e.sla && <Row label="SLA">{e.sla}</Row>}
      {(e.responsavel_atual || e.responsavel) && (
        <Row label="Responsável">{e.responsavel_atual ?? e.responsavel}</Row>
      )}

      {/* Reschedule block */}
      <div
        style={{
          margin: "20px 0",
          padding: 14,
          background: "var(--panel-2)",
          borderRadius: 12,
          border: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--dim)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
            marginBottom: 10,
          }}
        >
          Data prevista
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="date"
            value={dateVal}
            onChange={(ev) => setDateVal(ev.target.value)}
            style={{
              flex: 1,
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--txt)",
              padding: "7px 10px",
              fontSize: 12.5,
              outline: "none",
              colorScheme: "dark",
            }}
          />
          <button
            onClick={() => {
              onReschedule(e.id, dateVal);
              onClose();
            }}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Salvar
          </button>
        </div>
        {e.data_prevista && (
          <button
            onClick={() => {
              onReschedule(e.id, "");
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--dim)",
              fontSize: 11,
              cursor: "pointer",
              marginTop: 8,
              padding: 0,
            }}
          >
            ✕ Remover data
          </button>
        )}
      </div>

      {/* Link to full etapa */}
      <Link
        href={`/expand/etapa/${e.id}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: "var(--accent)",
          color: "#fff",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 13.5,
        }}
      >
        Ver etapa completa
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}

function MiniCalendar({
  mainAnchor,
  etapas,
  hojeS,
  onDayClick,
}: {
  mainAnchor: Date;
  etapas: Et[];
  hojeS: string;
  onDayClick: (d: Date) => void;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <button
          onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() - 1, 1))}
          style={btnIconSt}
        >
          ‹
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>
          {MESES_ABR[mini.getMonth()]} {mini.getFullYear()}
        </span>
        <button
          onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() + 1, 1))}
          style={btnIconSt}
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 1,
          fontSize: 10,
          textAlign: "center",
        }}
      >
        {DIAS_MIN.map((d, i) => (
          <div key={i} style={{ color: "var(--dim)", fontWeight: 700, paddingBottom: 3 }}>
            {d}
          </div>
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
                padding: "3px 1px",
                borderRadius: 4,
                cursor: "pointer",
                background: isAnchor
                  ? "var(--accent)"
                  : isToday
                  ? `color-mix(in srgb,var(--accent) 15%,transparent)`
                  : "transparent",
                color: isAnchor
                  ? "#fff"
                  : !inMonth
                  ? "transparent"
                  : isToday
                  ? "var(--accent)"
                  : "var(--txt)",
                fontWeight: isToday || isAnchor ? 800 : 400,
                position: "relative",
                transition: "background .1s",
              }}
            >
              {inMonth ? d.getDate() : ""}
              {hasEvt && !isAnchor && inMonth && (
                <div
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: isToday ? "#fff" : "var(--accent)",
                    position: "absolute",
                    bottom: 1,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnIconSt: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--dim)",
  cursor: "pointer",
  fontSize: 16,
  padding: "2px 6px",
  borderRadius: 4,
  lineHeight: 1,
};

// ── Main CalendarV2 component ─────────────────────────────────────────────────
export function CalendarV2({
  etapas: serverEtapas,
  nomeCli,
  equipe,
  isAdmin,
  clientes,
  membroId,
  membroNome,
  initialView,
  initialDate,
  initialFiltroCli,
}: {
  etapas: Et[];
  nomeCli: Record<string, string>;
  equipe: Membro[];
  isAdmin: boolean;
  clientes: Cli[];
  membroId: string;
  membroNome: string;
  initialView: Vista;
  initialDate: string;
  initialFiltroCli: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Local UI state
  const [view, setView] = useState<Vista>(initialView);
  const [anchor, setAnchor] = useState(() => parseDate(initialDate));
  const [filtroCliente, setFiltroCliente] = useState(initialFiltroCli);
  const [selectedEvent, setSelectedEvent] = useState<Et | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);

  // Optimistic state for rescheduling
  const [optimisticEtapas, updateOptimistic] = useOptimistic(
    serverEtapas,
    (state, { id, date }: { id: string; date: string }) =>
      state.map((e) =>
        e.id === id ? { ...e, data_prevista: date || null } : e
      )
  );

  const hojeS = ymd(new Date());

  // Filtered by client
  const etapas = filtroCliente
    ? optimisticEtapas.filter((e) => e.cliente_id === filtroCliente)
    : optimisticEtapas;

  // Compute grid
  let ini: Date, gridDias: Date[];
  if (view === "dia") {
    ini = anchor; gridDias = [anchor];
  } else if (view === "semana") {
    ini = monday(anchor);
    gridDias = Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  } else {
    ini = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const g0 = monday(ini);
    gridDias = Array.from({ length: 42 }, (_, i) => addDays(g0, i));
  }

  const doDia = (d: Date) => etapas.filter((e) => e.data_prevista === ymd(d));
  const semData = etapas.filter((e) => !e.data_prevista);

  // Period label
  const label =
    view === "dia"
      ? anchor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "long" })
      : view === "semana"
      ? `${ini.getDate()}–${addDays(ini, 6).getDate()} ${MESES_ABR[addDays(ini, 6).getMonth()]} ${addDays(ini, 6).getFullYear()}`
      : `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  // Navigation
  const navigate = (dir: number) => {
    setAnchor(
      view === "dia"
        ? addDays(anchor, dir)
        : view === "semana"
        ? addDays(anchor, dir * 7)
        : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1)
    );
  };

  // Member switch (URL → server refetch)
  const switchMembro = (id: string) => {
    const p = new URLSearchParams();
    if (id !== equipe[0]?.id) p.set("m", id);
    if (view !== "semana") p.set("v", view);
    const s = p.toString();
    router.push(`/expand/planejamento${s ? `?${s}` : ""}`);
  };

  // Reschedule (optimistic + server action)
  const reschedule = (etapaId: string, date: string) => {
    startTransition(async () => {
      updateOptimistic({ id: etapaId, date });
      const fd = new FormData();
      fd.set("etapaId", etapaId);
      fd.set("data", date);
      await agendarEtapa(fd);
      router.refresh();
    });
  };

  // Drop handler
  const onDrop = (dateStr: string, ev: React.DragEvent) => {
    ev.preventDefault();
    const etapaId = ev.dataTransfer.getData("etapaId");
    if (!etapaId) return;
    setDropDate(null);
    setDraggingId(null);
    reschedule(etapaId, dateStr);
  };

  // Shared chip/card props
  const chipProps = {
    nomeCli,
    draggingId,
    onDragStart: setDraggingId,
    onDragEnd: () => { setDraggingId(null); setDropDate(null); },
    onClick: setSelectedEvent,
  };

  // Drop zone wrapper
  const DZ = ({
    dateStr,
    children,
    style,
  }: {
    dateStr: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }) => {
    const active = dropDate === dateStr && !!draggingId;
    return (
      <div
        style={{
          ...style,
          outline: active ? "2px dashed var(--accent)" : "none",
          outlineOffset: -2,
          background: active
            ? `color-mix(in srgb,var(--accent) 8%,${
                (style?.background as string) ?? "transparent"
              })`
            : (style?.background as string | undefined),
          borderRadius: (style?.borderRadius as number | string | undefined) ?? 6,
          transition: "outline .1s, background .1s",
        }}
        onDragOver={(e) => { e.preventDefault(); setDropDate(dateStr); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropDate(null);
        }}
        onDrop={(e) => onDrop(dateStr, e)}
      >
        {children}
      </div>
    );
  };

  // Button styles
  const btnNav: React.CSSProperties = {
    background: "var(--panel-2)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--txt)",
    fontSize: 16,
    padding: "4px 10px",
    cursor: "pointer",
    lineHeight: 1,
  };
  const btnChip: React.CSSProperties = {
    background: "var(--panel-2)",
    border: "1px solid var(--line)",
    borderRadius: 20,
    color: "var(--txt)",
    fontSize: 11.5,
    padding: "4px 11px",
    cursor: "pointer",
    fontWeight: 500,
    transition: "background .12s, border .12s, color .12s",
  };
  const btnChipOn: React.CSSProperties = {
    background: `color-mix(in srgb,var(--accent) 14%,transparent)`,
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    fontWeight: 700,
  };

  return (
    <>
      {/* ── CSS ───────────────────────────────────────────────────────────── */}
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
          position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
          background: var(--bg); border-left: 1px solid var(--line);
          box-shadow: -12px 0 40px rgba(0,0,0,.18); z-index: 901;
          overflow-y: auto; padding: 24px;
          transform: translateX(100%);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .cal-panel.open { transform: translateX(0); }
        .cal-week-col {
          border-radius: 10px; border: 1px solid var(--line);
          background: var(--bg); overflow: hidden; flex: 1; min-width: 110px;
        }
        .cal-week-col.hoje { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .cal-week-head {
          padding: 8px 6px; border-bottom: 1px solid var(--line);
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
          color: var(--dim); display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .cal-week-num {
          width: 26px; height: 26px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 14px; font-weight: 800;
          color: var(--txt);
        }
        .cal-week-col.hoje .cal-week-head { color: var(--accent); }
        .cal-week-col.hoje .cal-week-num { background: var(--accent); color: #fff; }
        .cal-mes-cell {
          border-radius: 8px; border: 1px solid var(--line); background: var(--bg);
          min-height: 84px; padding: 5px; cursor: pointer;
          transition: border-color .12s;
        }
        .cal-mes-cell:hover { border-color: var(--accent); }
        .cal-mes-cell.hoje { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        .cal-mes-cell.out { opacity: .28; background: transparent; border-color: transparent; pointer-events:none; }
        .cal-mes-cell.out:hover { border-color: transparent; }
        .cal-mes-dn { font-size: 11px; font-weight: 700; color: var(--dim); margin-bottom: 3px; display: block; }
        .cal-mes-cell.hoje .cal-mes-dn { color: var(--accent); }
        .sidebar-card { background: var(--panel-2); border-radius: 12px; padding: 14px; margin-bottom: 12px; border: 1px solid var(--line); }
        @media(max-width:860px) {
          .cal-layout { flex-direction: column !important; }
          .cal-sidebar { width: 100% !important; }
          .cal-panel { width: 100% !important; }
        }
      `}</style>

      {/* ── LAYOUT ────────────────────────────────────────────────────────── */}
      <div className="cal-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* ═══ SIDEBAR ═══════════════════════════════════════════════════ */}
        <div className="cal-sidebar" style={{ width: 215, flexShrink: 0 }}>

          {/* Mini calendar */}
          <div className="sidebar-card">
            <MiniCalendar
              mainAnchor={anchor}
              etapas={optimisticEtapas}
              hojeS={hojeS}
              onDayClick={(d) => {
                setAnchor(d);
                if (view === "mes") setView("dia");
              }}
            />
          </div>

          {/* Member selector (admin only) */}
          {isAdmin && equipe.length > 0 && (
            <div className="sidebar-card">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>
                Equipe
              </div>
              {equipe.map((m) => {
                const active = m.nome === membroNome;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchMembro(m.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", textAlign: "left",
                      background: active ? `color-mix(in srgb,var(--accent) 12%,transparent)` : "transparent",
                      border: active ? "1px solid var(--accent)" : "1px solid transparent",
                      borderRadius: 8, padding: "6px 8px", cursor: "pointer",
                      color: active ? "var(--accent)" : "var(--txt)",
                      fontSize: 12, fontWeight: active ? 700 : 400,
                      transition: "all .15s", marginBottom: 2,
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: active ? "var(--accent)" : "var(--bg)",
                      border: "1px solid var(--line)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900,
                      color: active ? "#fff" : "var(--txt)", flexShrink: 0,
                    }}>
                      {m.ini}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.nome}
                    </span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Area legend */}
          <div className="sidebar-card">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>
              Legenda
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(AREAS).map(([k, a]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--txt)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: a.cor, flexShrink: 0 }} />
                  {a.n}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--txt)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)", flexShrink: 0 }} />
                Marco
              </div>
            </div>
          </div>

          {/* A agendar (sem data) */}
          {semData.length > 0 && (
            <div className="sidebar-card">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--warn)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                A agendar
                <span style={{ background: `color-mix(in srgb,var(--warn) 18%,transparent)`, color: "var(--warn)", borderRadius: 20, padding: "1px 7px", fontSize: 10 }}>
                  {semData.length}
                </span>
              </div>
              <p style={{ fontSize: 10.5, color: "var(--dim)", marginBottom: 8, marginTop: -4 }}>
                Arraste para o calendário
              </p>
              {semData.map((e) => (
                <Chip key={e.id} e={e} {...chipProps} />
              ))}
            </div>
          )}
        </div>

        {/* ═══ MAIN ══════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Top controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* View tabs */}
              <div style={{ display: "flex", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 9, padding: 2, gap: 1 }}>
                {(["dia", "semana", "mes"] as Vista[]).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "5px 14px",
                      borderRadius: 7, border: "none", cursor: "pointer",
                      background: view === v ? "var(--accent)" : "transparent",
                      color: view === v ? "#fff" : "var(--dim)",
                      transition: "all .15s",
                    }}
                  >
                    {["Dia", "Semana", "Mês"][i]}
                  </button>
                ))}
              </div>

              {/* Prev/Next/Label/Today */}
              <button onClick={() => navigate(-1)} style={btnNav}>‹</button>
              <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 160, textAlign: "center", textTransform: "capitalize" }}>
                {label}
              </span>
              <button onClick={() => navigate(1)} style={btnNav}>›</button>
              <button
                onClick={() => { setAnchor(new Date()); if (view !== "dia") setView("semana"); }}
                style={{ ...btnNav, fontSize: 11.5, color: "var(--accent)", border: "1px solid var(--accent)", fontWeight: 700 }}
              >
                Hoje
              </button>
            </div>

            {/* Client filter */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {[{ id: "", nome: "Todos" }, ...clientes].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFiltroCliente(c.id)}
                  style={{ ...btnChip, ...(filtroCliente === c.id ? btnChipOn : {}) }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* ── SEMANA ──────────────────────────────────────────── */}
          {view === "semana" && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {gridDias.map((d, i) => {
                const ds = ymd(d);
                const its = doDia(d);
                const hoje = ds === hojeS;
                return (
                  <div key={ds} className={`cal-week-col${hoje ? " hoje" : ""}`}>
                    <div className="cal-week-head">
                      {DIAS_ABREV[i]}
                      <span className="cal-week-num">{d.getDate()}</span>
                    </div>
                    <DZ dateStr={ds} style={{ padding: 6, minHeight: 90 }}>
                      {its.length === 0 ? (
                        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 18, color: "var(--line)" }}>+</span>
                        </div>
                      ) : (
                        its.map((e) => <Chip key={e.id} e={e} {...chipProps} />)
                      )}
                    </DZ>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MÊS ─────────────────────────────────────────────── */}
          {view === "mes" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                {DIAS_ABREV.map((d) => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", textAlign: "center", padding: "2px 0" }}>
                    {d}
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
                        onClick={() => { setAnchor(d); setView("dia"); }}
                      >
                        <span className="cal-mes-dn">{d.getDate()}</span>
                        {its.slice(0, 3).map((e) => (
                          <Chip key={e.id} e={e} {...chipProps} />
                        ))}
                        {its.length > 3 && (
                          <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                            +{its.length - 3}
                          </div>
                        )}
                      </div>
                    </DZ>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DIA ─────────────────────────────────────────────── */}
          {view === "dia" && (
            <DZ dateStr={ymd(anchor)} style={{ minHeight: 200, borderRadius: 12 }}>
              {doDia(anchor).length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 13, padding: "60px 0", border: "1px dashed var(--line)", borderRadius: 12 }}>
                  Nenhuma tarefa para este dia.
                  <br />
                  <span style={{ fontSize: 11.5 }}>
                    Arraste um card da coluna &ldquo;A agendar&rdquo; aqui.
                  </span>
                </div>
              ) : (
                doDia(anchor).map((e) => (
                  <CardFull key={e.id} e={e} {...chipProps} />
                ))
              )}
            </DZ>
          )}
        </div>
      </div>

      {/* ── DETAIL PANEL ──────────────────────────────────────────────────── */}
      <div
        className={`cal-overlay${selectedEvent ? " open" : ""}`}
        onClick={() => setSelectedEvent(null)}
      />
      <div className={`cal-panel${selectedEvent ? " open" : ""}`}>
        {selectedEvent && (
          <DetailPanel
            e={selectedEvent}
            nomeCli={nomeCli}
            onClose={() => setSelectedEvent(null)}
            onReschedule={(etapaId, date) => {
              reschedule(etapaId, date);
              setSelectedEvent((prev) =>
                prev?.id === etapaId ? { ...prev, data_prevista: date || null } : prev
              );
            }}
          />
        )}
      </div>
    </>
  );
}
