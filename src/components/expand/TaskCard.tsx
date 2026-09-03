"use client";

import type { EtapaRow } from "@/lib/expand-tarefas";

const AREA_COR: Record<string, string> = {
  copy:    "#7C5CBF",
  design:  "#2563EB",
  cs:      "#059669",
  video:   "#DC2626",
  social:  "#D97706",
  trafego: "#0891B2",
  gestao:  "#6B7280",
};

const STATUS_COR: Record<string, string> = {
  idle: "var(--dim)",
  run:  "var(--accent)",
  wait: "var(--warn)",
  done: "var(--green)",
  late: "var(--red)",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Backlog",
  run:  "Em Execução",
  wait: "Em Revisão",
  done: "Concluída",
  late: "Atrasada",
};

export type TaskCardProps = {
  tarefa: EtapaRow & { cliente_nome?: string };
  onClick?: () => void;
  dragging?: boolean;
};

export default function TaskCard({ tarefa, onClick, dragging }: TaskCardProps) {
  const areaCor = AREA_COR[tarefa.area?.toLowerCase() ?? ""] ?? "var(--line-2)";
  const statusCor = STATUS_COR[tarefa.status] ?? "var(--dim)";
  const prazo = tarefa.data_prevista ? new Date(tarefa.data_prevista).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;
  const atrasado = tarefa.data_prevista && tarefa.status !== "done" && new Date(tarefa.data_prevista) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg)",
        border: "1px solid var(--line-2)",
        borderRadius: 10,
        cursor: "pointer",
        opacity: dragging ? 0.5 : 1,
        boxShadow: dragging ? "0 8px 20px rgba(0,0,0,.18)" : "0 1px 3px rgba(0,0,0,.06)",
        transition: "box-shadow .15s, opacity .15s",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Cover bar de área */}
      <div style={{ height: 3, background: areaCor }} />

      <div style={{ padding: "10px 12px" }}>
        {/* Labels */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
          {tarefa.area && (
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
              padding: "2px 7px", borderRadius: 20,
              background: `color-mix(in srgb, ${areaCor} 18%, transparent)`,
              color: areaCor,
            }}>
              {tarefa.area}
            </span>
          )}
          {tarefa.marco && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
              Marco
            </span>
          )}
          {tarefa.visivel_cliente && (
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "color-mix(in srgb, var(--green) 15%, transparent)", color: "var(--green)" }}>
              Cliente
            </span>
          )}
        </div>

        {/* Título */}
        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: "var(--txt)", margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {tarefa.titulo}
        </p>

        {tarefa.cliente_nome && (
          <p style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tarefa.cliente_nome}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {prazo && (
            <span style={{ fontSize: 10.5, color: atrasado ? "var(--red)" : "var(--mut)", display: "flex", alignItems: "center", gap: 3 }}>
              📅 {prazo}
            </span>
          )}
          {tarefa.bloqueado && (
            <span style={{ fontSize: 10.5, color: "var(--red)" }}>🔒 Bloqueado</span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: statusCor,
            background: `color-mix(in srgb, ${statusCor} 12%, transparent)`,
            padding: "2px 7px", borderRadius: 20 }}>
            {STATUS_LABEL[tarefa.status] ?? tarefa.status}
          </span>
        </div>
      </div>
    </div>
  );
}
