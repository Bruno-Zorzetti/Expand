"use client";

import { useState } from "react";
import type { EtapaRow } from "@/lib/expand-tarefas";
import TaskDrawer from "./TaskDrawer";

type Tarefa = EtapaRow & { cliente_nome?: string };

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

const AREA_COR: Record<string, string> = {
  copy:    "#7C5CBF",
  design:  "#2563EB",
  cs:      "#059669",
  video:   "#DC2626",
  social:  "#D97706",
  trafego: "#0891B2",
  gestao:  "#6B7280",
};

type Props = {
  tarefas: Tarefa[];
  onUpdate?: (id: string, fields: Partial<EtapaRow>) => Promise<void>;
};

export default function TaskList({ tarefas, onUpdate }: Props) {
  const [selected, setSelected] = useState<Tarefa | null>(null);
  const [items, setItems] = useState<Tarefa[]>(tarefas);

  async function handleUpdate(id: string, fields: Partial<EtapaRow>) {
    setItems((prev) => prev.map((t) => t.id === id ? { ...t, ...fields } : t));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, ...fields } : prev);
    await onUpdate?.(id, fields);
  }

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)" }}>
              {["Título", "Cliente", "Área", "Responsável", "Prazo", "Status"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((t, i) => {
              const areaCor = AREA_COR[t.area?.toLowerCase() ?? ""] ?? "var(--line-2)";
              const statusCor = STATUS_COR[t.status] ?? "var(--dim)";
              const prazo = t.data_prevista ? new Date(t.data_prevista).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";
              const atrasado = t.data_prevista && t.status !== "done" && new Date(t.data_prevista) < new Date();
              return (
                <tr key={t.id}
                  onClick={() => setSelected(t)}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    background: i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--line) 20%, transparent)",
                    cursor: "pointer",
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 6%, transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--line) 20%, transparent)")}
                >
                  <td style={{ padding: "10px 12px", maxWidth: 280 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 3, height: 32, borderRadius: 2, background: areaCor, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--txt)" }}>
                        {t.titulo}
                      </span>
                      {t.visivel_cliente && <span style={{ fontSize: 9.5, color: "var(--green)", flexShrink: 0 }}>●</span>}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--mut)", whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.cliente_nome ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {t.area ? (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: `color-mix(in srgb, ${areaCor} 15%, transparent)`, color: areaCor }}>
                        {t.area}
                      </span>
                    ) : <span style={{ color: "var(--dim)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--mut)", whiteSpace: "nowrap" }}>
                    {t.responsavel_atual ?? "—"}
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: atrasado ? "var(--red)" : "var(--mut)" }}>
                    {prazo}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                      background: `color-mix(in srgb, ${statusCor} 14%, transparent)`, color: statusCor }}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px 12px", textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
                  Nenhuma tarefa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TaskDrawer tarefa={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />
    </>
  );
}
