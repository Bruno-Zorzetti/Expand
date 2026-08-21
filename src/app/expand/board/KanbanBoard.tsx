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

const COLS = [
  { id: "idle", label: "Na fila",    cor: "#64748B" },
  { id: "wait", label: "Aguardando", cor: "#F59E0B" },
  { id: "run",  label: "Executando", cor: "#3B82F6" },
  { id: "late", label: "Atrasada",   cor: "#EF4444" },
  { id: "done", label: "Concluída",  cor: "#22C55E" },
] as const;

const AREA_COR: Record<string, string> = {
  cm: "#CE6A5F", pm: "#C89B5E", cs: "#E6D0A8",
  av: "#6FBF92", sm: "#86C0A6", tf: "#CE7F4C", cl: "#8A9990",
};
const AREA_NOME: Record<string, string> = {
  cm: "Comercial", pm: "PM", cs: "CS", av: "Audiovisual",
  sm: "Social", tf: "Tráfego", cl: "Conteúdo",
};

function areaCor(a: string | null) { return a ? (AREA_COR[a] ?? "#6FBF92") : "#475569"; }
function areaNome(a: string | null) { return a ? (AREA_NOME[a] ?? a) : null; }

function isLate(e: EtapaK) {
  if (e.status === "done" || !e.data_prevista) return false;
  return new Date(e.data_prevista + "T00:00:00") < new Date();
}

function elapsedMin(iso: string | null) {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? `${m % 60}m` : ""}`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ── Card ─────────────────────────────────────────────────────────────────────
function KCard({ e, dragging, onDragStart, onDragEnd }: {
  e: EtapaK; dragging: boolean;
  onDragStart: () => void; onDragEnd: () => void;
}) {
  const cor = areaCor(e.area);
  const nome = areaNome(e.area);
  const resp = e.responsavel_atual ?? e.responsavel;
  const late = isLate(e);
  const running = e.status === "run";
  const filesOk = (e.arquivos_total ?? 0) > 0 && e.arquivos_aprovados === e.arquivos_total;

  return (
    <Link href={`/expand/etapa/${e.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        draggable
        onDragStart={(ev) => {
          ev.dataTransfer.setData("etapaId", e.id);
          ev.dataTransfer.setData("fromStatus", e.status);
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        style={{
          background: "var(--panel)",
          border: `1px solid ${dragging ? cor : "var(--line)"}`,
          borderRadius: 10, padding: "11px 13px",
          cursor: dragging ? "grabbing" : "grab",
          opacity: dragging ? 0.4 : 1,
          transition: "box-shadow .12s, border-color .12s",
          userSelect: "none", position: "relative", overflow: "hidden",
        }}
        onMouseEnter={(el) => { if (!dragging) (el.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 14px rgba(0,0,0,.2)"; }}
        onMouseLeave={(el) => { (el.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* Top color strip */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: late ? "#EF4444" : cor }} />

        {/* Area + badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, marginTop: 3, flexWrap: "wrap" }}>
          {nome && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
              color: cor, background: `color-mix(in srgb, ${cor} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${cor} 25%, transparent)`,
              borderRadius: 20, padding: "1px 7px",
            }}>{nome}</span>
          )}
          {e.marco && <span style={{ fontSize: 9.5, color: "var(--accent)", fontWeight: 800 }}>◆ MARCO</span>}
          {late && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#EF4444", marginLeft: "auto" }}>⚠ ATRASADA</span>}
        </div>

        {/* Title */}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", lineHeight: 1.35, marginBottom: 9 }}>
          {running && (
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: "#3B82F6", marginRight: 5, verticalAlign: "middle",
              animation: "kanPulse 1.6s ease-in-out infinite",
            }} />
          )}
          {e.titulo}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {resp && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-flex", width: 18, height: 18, borderRadius: "50%",
                background: `color-mix(in srgb, ${cor} 20%, var(--panel-2))`,
                color: cor, fontSize: 9, fontWeight: 800,
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{initials(resp)}</span>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>{resp.split(" ")[0]}</span>
            </div>
          )}
          {e.sla && <span style={{ fontSize: 11, color: "var(--dim)" }}>· {e.sla}</span>}
          {running && e.iniciada_em && (
            <span style={{ fontSize: 11, color: "#3B82F6" }}>⏱ {elapsedMin(e.iniciada_em)}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
            {(e.arquivos_total ?? 0) > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 600, color: filesOk ? "#22C55E" : "var(--dim)" }}>
                📎 {e.arquivos_aprovados ?? 0}/{e.arquivos_total}
              </span>
            )}
            {e.bloqueado && <span title="Bloqueada">🔒</span>}
            {e.chamado && <span title="Chamado aberto">📣</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function KColumn({ colId, label, cor, cards, totalTasks, draggingId, draggingFrom, onDragStart, onDragEnd, onDrop }: {
  colId: string; label: string; cor: string; cards: EtapaK[]; totalTasks: number;
  draggingId: string | null; draggingFrom: string | null;
  onDragStart: (id: string, from: string) => void;
  onDragEnd: () => void;
  onDrop: (colId: string, etapaId: string, from: string) => void;
}) {
  const [hovering, setHovering] = useState(false);
  const canReceive = draggingId !== null && draggingFrom !== colId;
  const pct = totalTasks > 0 ? (cards.length / totalTasks) * 100 : 0;

  return (
    <div
      style={{ flex: "0 0 220px", minWidth: 200, display: "flex", flexDirection: "column" }}
      onDragOver={(e) => { e.preventDefault(); if (canReceive) setHovering(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovering(false); }}
      onDrop={(e) => {
        e.preventDefault(); setHovering(false);
        const etapaId = e.dataTransfer.getData("etapaId");
        const from = e.dataTransfer.getData("fromStatus");
        if (etapaId && from !== colId) onDrop(colId, etapaId, from);
      }}
    >
      {/* Column header */}
      <div style={{
        padding: "10px 12px 12px", marginBottom: 10, borderRadius: 12,
        border: `1px solid ${hovering ? cor : "var(--line)"}`,
        background: hovering ? `color-mix(in srgb,${cor} 10%,var(--panel))` : "var(--panel)",
        transition: "border-color .15s, background .15s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: cor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)" }}>{label}</span>
          <span style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 800, color: cor,
            background: `color-mix(in srgb,${cor} 14%,transparent)`,
            borderRadius: 20, padding: "1px 9px", minWidth: 24, textAlign: "center",
          }}>{cards.length}</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: cor, borderRadius: 2, transition: "width .35s" }} />
        </div>
        {hovering && (
          <div style={{ fontSize: 10, color: cor, marginTop: 6, textAlign: "center", fontWeight: 700 }}>
            Soltar aqui →
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {cards.length === 0 && !hovering && (
          <div style={{
            textAlign: "center", padding: "24px 8px", color: "var(--dim)", fontSize: 11.5,
            border: "1px dashed var(--line)", borderRadius: 10,
          }}>Vazia</div>
        )}
        {cards.map((e) => (
          <KCard key={e.id} e={e}
            dragging={draggingId === e.id}
            onDragStart={() => onDragStart(e.id, e.status)}
            onDragEnd={onDragEnd}
          />
        ))}
        {hovering && (
          <div style={{ height: 52, borderRadius: 10, border: `2px dashed ${cor}`, background: `color-mix(in srgb,${cor} 8%,transparent)` }} />
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function KanbanBoard({ etapas: serverEtapas }: { etapas: EtapaK[]; clienteId: string }) {
  const [, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);

  const [optimistic, updateOptimistic] = useOptimistic(
    serverEtapas,
    (state, { id, status }: { id: string; status: string }) =>
      state.map((e) => (e.id === id ? { ...e, status } : e))
  );

  const handleDrop = (colId: string, etapaId: string) => {
    setDraggingId(null); setDraggingFrom(null);
    const targetStatus = colId === "late" ? "run" : colId;
    startTransition(async () => {
      updateOptimistic({ id: etapaId, status: targetStatus });
      const fd = new FormData();
      fd.set("etapaId", etapaId);
      fd.set("status", targetStatus);
      await moverStatusEtapa(fd);
    });
  };

  const buckets = COLS.map((col) => {
    const cards =
      col.id === "late"
        ? optimistic.filter((e) => isLate(e) && e.status !== "done")
        : optimistic.filter((e) => !isLate(e) && e.status === col.id);
    return { ...col, cards: cards.sort((a, b) => a.ordem - b.ordem) };
  });

  const runCount = optimistic.filter((e) => e.status === "run").length;
  const lateCount = optimistic.filter((e) => isLate(e) && e.status !== "done").length;
  const doneCount = optimistic.filter((e) => e.status === "done").length;

  return (
    <>
      <style>{`@keyframes kanPulse { 0%,100%{opacity:1} 50%{opacity:.2} }`}</style>

      {/* Stats strip */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14,
        padding: "10px 16px", background: "var(--panel-2)",
        borderRadius: 10, border: "1px solid var(--line)", alignItems: "center",
      }}>
        {runCount > 0 && <span style={{ fontSize: 12.5, color: "#3B82F6", fontWeight: 700 }}>⚡ {runCount} em execução</span>}
        {lateCount > 0 && <span style={{ fontSize: 12.5, color: "#EF4444", fontWeight: 700 }}>⚠ {lateCount} atrasada{lateCount > 1 ? "s" : ""}</span>}
        <span style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 600 }}>✓ {doneCount} concluída{doneCount !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 12, color: "var(--dim)" }}>· {optimistic.length} total</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>
          Arraste os cards para mover entre colunas
        </span>
      </div>

      {/* Columns */}
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <div style={{ display: "flex", gap: 14, minWidth: `${COLS.length * 234}px` }}>
          {buckets.map((col) => (
            <KColumn
              key={col.id}
              colId={col.id} label={col.label} cor={col.cor}
              cards={col.cards} totalTasks={optimistic.length}
              draggingId={draggingId} draggingFrom={draggingFrom}
              onDragStart={(id, from) => { setDraggingId(id); setDraggingFrom(from); }}
              onDragEnd={() => { setDraggingId(null); setDraggingFrom(null); }}
              onDrop={(colId, etapaId) => handleDrop(colId, etapaId)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
