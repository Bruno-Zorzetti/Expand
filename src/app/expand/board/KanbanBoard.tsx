"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import { moverStatusEtapa } from "@/app/expand/actions";

export type EtapaK = {
  id: string; titulo: string; area: string | null; agente: string | null;
  responsavel: string | null; responsavel_atual: string | null;
  status: string; sla: string | null; marco: boolean;
  data_prevista: string | null; iniciada_em: string | null; ordem: number;
  arquivos_total?: number; arquivos_aprovados?: number;
  bloqueado?: boolean; chamado?: boolean;
};

export type ClienteK = { id: string; nome: string };

// ── Status column definitions ─────────────────────────────────────────────────
const COLS = [
  { id: "idle", label: "Na fila",     cor: "#7C8C7F" },
  { id: "wait", label: "Aguardando",  cor: "#D9A94E" },
  { id: "run",  label: "Executando",  cor: "#C89B5E" },
  { id: "late", label: "Atrasada",    cor: "#CE6A5F" },
  { id: "done", label: "Concluída",   cor: "#3B82F6" },
] as const;

const AREA_COR: Record<string, string> = {
  cm: "#CE6A5F", pm: "#C89B5E", cs: "#E6D0A8", av: "#6FBF92",
  sm: "#86C0A6", tf: "#CE7F4C", cl: "#8A9990",
};

function areaCor(area: string | null) {
  if (!area) return "#475569";
  return AREA_COR[area] ?? "#6FBF92";
}

function isLate(e: EtapaK): boolean {
  if (e.status === "done") return false;
  if (!e.sla && !e.data_prevista) return false;
  if (e.data_prevista) {
    const dp = new Date(e.data_prevista + "T00:00:00");
    return dp < new Date();
  }
  return false;
}

function elapsedMin(iso: string | null) {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60); const rm = m % 60;
  if (h < 24) return `${h}h${rm ? `${rm}m` : ""}`;
  return `${Math.floor(h / 24)}d`;
}

// ── Card ─────────────────────────────────────────────────────────────────────
function KCard({
  e, dragging, onDragStart, onDragEnd,
}: {
  e: EtapaK; dragging: boolean;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const cor = areaCor(e.area);
  const resp = e.responsavel_atual ?? e.responsavel;
  const running = e.status === "run";
  const late  = isLate(e);

  return (
    <Link href={`/expand/etapa/${e.id}`} style={{ textDecoration: "none" }}>
      <div
        draggable
        onDragStart={(ev) => { ev.dataTransfer.setData("etapaId", e.id); ev.dataTransfer.setData("fromStatus", e.status); onDragStart(); }}
        onDragEnd={onDragEnd}
        style={{
          background: "var(--panel-2)", border: "1px solid var(--line)",
          borderLeft: `3px solid ${late ? "#CE6A5F" : cor}`,
          borderRadius: "0 10px 10px 0", padding: "10px 12px",
          cursor: dragging ? "grabbing" : "grab",
          opacity: dragging ? 0.45 : 1,
          transition: "box-shadow .12s, opacity .12s",
          userSelect: "none",
        }}
        onMouseEnter={(el) => { if (!dragging) (el.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,.15)"; }}
        onMouseLeave={(el) => { (el.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* Title */}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", lineHeight: 1.35, marginBottom: 6 }}>
          {running && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: cor, marginRight: 5, animation: "kanPulse 1.6s ease-in-out infinite", verticalAlign: "middle" }} />}
          {e.marco && <span style={{ color: "var(--accent)", marginRight: 3 }}>◆</span>}
          {e.titulo}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 8px", fontSize: 11, color: "var(--dim)" }}>
          {resp && (
            <span style={{ color: cor, fontWeight: 600 }}>{resp.split(" ")[0]}</span>
          )}
          {e.sla && (
            <span>{e.sla}</span>
          )}
          {running && e.iniciada_em && (
            <span style={{ color: cor }}>⏱ {elapsedMin(e.iniciada_em)}</span>
          )}
          {late && e.status !== "done" && (
            <span style={{ color: "#CE6A5F", fontWeight: 700 }}>⚠ atrasada</span>
          )}
          {(e.arquivos_total ?? 0) > 0 && (
            <span style={{ color: e.arquivos_aprovados === e.arquivos_total ? "var(--green)" : "var(--dim)" }}>
              📎 {e.arquivos_aprovados ?? 0}/{e.arquivos_total}
            </span>
          )}
          {e.bloqueado && <span style={{ color: "var(--red)", fontWeight: 700 }}>🔒</span>}
          {e.chamado && <span style={{ color: "var(--warn)" }}>📣</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Drop Zone Column ──────────────────────────────────────────────────────────
function KColumn({
  colId, label, cor, cards, allCards,
  draggingId, draggingFrom, onDragStart, onDragEnd, onDrop,
}: {
  colId: string; label: string; cor: string;
  cards: EtapaK[]; allCards: EtapaK[];
  draggingId: string | null; draggingFrom: string | null;
  onDragStart: (id: string, from: string) => void;
  onDragEnd: () => void;
  onDrop: (colId: string, etapaId: string, fromStatus: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const canReceive = draggingId !== null && draggingFrom !== colId;

  return (
    <div
      style={{ flex: "0 0 220px", minWidth: 200 }}
      onDragOver={(e) => { e.preventDefault(); if (canReceive) setHovering(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovering(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setHovering(false);
        const etapaId = e.dataTransfer.getData("etapaId");
        const from    = e.dataTransfer.getData("fromStatus");
        if (etapaId && from !== colId) onDrop(colId, etapaId, from);
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "8px 12px", marginBottom: 10,
        borderRadius: 10, border: `1px solid ${hovering ? cor : "var(--line)"}`,
        background: hovering ? `color-mix(in srgb,${cor} 8%,var(--panel-2))` : "var(--panel-2)",
        transition: "border-color .15s, background .15s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--txt)" }}>{label}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: cor, fontWeight: 700, background: `color-mix(in srgb,${cor} 14%,transparent)`, borderRadius: 20, padding: "1px 8px" }}>
            {cards.length}
          </span>
        </div>
        {hovering && (
          <div style={{ fontSize: 10, color: cor, marginTop: 4, textAlign: "center" }}>
            Soltar aqui
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 120 }}>
        {cards.length === 0 && !hovering && (
          <div style={{ textAlign: "center", padding: "20px 8px", color: "var(--dim)", fontSize: 11.5, border: "1px dashed var(--line)", borderRadius: 10 }}>
            Vazia
          </div>
        )}
        {cards.map((e) => (
          <KCard key={e.id} e={e}
            dragging={draggingId === e.id}
            onDragStart={() => onDragStart(e.id, e.status)}
            onDragEnd={onDragEnd}
          />
        ))}
        {hovering && (
          <div style={{ height: 48, borderRadius: 10, border: `2px dashed ${cor}`, background: `color-mix(in srgb,${cor} 8%,transparent)` }} />
        )}
      </div>
    </div>
  );
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────
export function KanbanBoard({
  etapas: serverEtapas, clienteId,
}: {
  etapas: EtapaK[]; clienteId: string;
}) {
  const [, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);

  const [optimistic, updateOptimistic] = useOptimistic(
    serverEtapas,
    (state, { id, status }: { id: string; status: string }) =>
      state.map((e) => e.id === id ? { ...e, status } : e)
  );

  const handleDrop = (colId: string, etapaId: string, from: string) => {
    setDraggingId(null);
    setDraggingFrom(null);
    // Treat "late" column as a read-only indicator; use run for drop
    const targetStatus = colId === "late" ? "run" : colId;
    startTransition(async () => {
      updateOptimistic({ id: etapaId, status: targetStatus });
      const fd = new FormData();
      fd.set("etapaId", etapaId);
      fd.set("status", targetStatus);
      await moverStatusEtapa(fd);
    });
  };

  // Bucket tasks into columns: "late" is a virtual column
  const buckets = COLS.map((col) => {
    const cards = col.id === "late"
      ? optimistic.filter((e) => isLate(e) && e.status !== "done")
      : optimistic.filter((e) => {
          if (isLate(e)) return false; // late tasks go to the late column
          return e.status === col.id;
        });
    return { ...col, cards: cards.sort((a, b) => a.ordem - b.ordem) };
  });

  const runCount  = optimistic.filter((e) => e.status === "run").length;
  const lateCount = optimistic.filter((e) => isLate(e) && e.status !== "done").length;
  const doneCount = optimistic.filter((e) => e.status === "done").length;

  return (
    <>
      <style>{`
        @keyframes kanPulse { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, fontSize: 12 }}>
        {runCount > 0 && <span style={{ color: "#C89B5E", fontWeight: 700 }}>⚡ {runCount} em execução</span>}
        {lateCount > 0 && <span style={{ color: "#CE6A5F", fontWeight: 700 }}>⚠ {lateCount} atrasadas</span>}
        <span style={{ color: "var(--dim)" }}>✓ {doneCount} concluídas · {optimistic.length} total</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>
          Arraste os cards para mover entre colunas
        </span>
      </div>

      {/* Columns */}
      <div style={{ overflowX: "auto", paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, minWidth: `${COLS.length * 234}px` }}>
          {buckets.map((col) => (
            <KColumn
              key={col.id}
              colId={col.id} label={col.label} cor={col.cor}
              cards={col.cards} allCards={optimistic}
              draggingId={draggingId} draggingFrom={draggingFrom}
              onDragStart={(id, from) => { setDraggingId(id); setDraggingFrom(from); }}
              onDragEnd={() => { setDraggingId(null); setDraggingFrom(null); }}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </>
  );
}
