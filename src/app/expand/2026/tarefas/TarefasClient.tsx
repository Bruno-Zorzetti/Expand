"use client";

import { useState } from "react";
import type { EtapaRow } from "@/lib/expand-tarefas";
import TaskBoard from "@/components/expand/TaskBoard";
import TaskList from "@/components/expand/TaskList";
import NovaTarefaModal from "@/components/expand/NovaTarefaModal";
import { atualizarTarefa2026 } from "@/app/expand/2026/actions";

type Tarefa = EtapaRow & { cliente_nome?: string };

type Props = {
  tarefas: Tarefa[];
  clientes: { id: string; nome: string }[];
};

export default function TarefasClient({ tarefas, clientes }: Props) {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroArea, setFiltroArea] = useState("");

  const filtered = tarefas.filter((t) => {
    if (filtroCliente && t.cliente_id !== filtroCliente) return false;
    if (filtroStatus && t.status !== filtroStatus) return false;
    if (filtroArea && t.area?.toLowerCase() !== filtroArea.toLowerCase()) return false;
    return true;
  });

  async function onUpdate(id: string, fields: Partial<EtapaRow>) {
    await atualizarTarefa2026(id, fields as Record<string, unknown>);
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {/* View toggle */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--line-2)", flexShrink: 0 }}>
          {(["kanban", "lista"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "7px 16px", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                border: "none", borderRight: v === "kanban" ? "1px solid var(--line-2)" : "none",
                background: view === v ? "var(--accent)" : "var(--panel)",
                color: view === v ? "#fff" : "var(--mut)",
                textTransform: "capitalize",
              }}>
              {v === "kanban" ? "⬛ Kanban" : "☰ Lista"}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}
          style={selectSt}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          style={selectSt}>
          <option value="">Todos os status</option>
          <option value="idle">Backlog</option>
          <option value="run">Em Execução</option>
          <option value="wait">Em Revisão</option>
          <option value="done">Concluída</option>
          <option value="late">Atrasada</option>
        </select>

        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}
          style={selectSt}>
          <option value="">Todas as áreas</option>
          {["copy", "design", "cs", "video", "social", "trafego", "gestao"].map((a) => (
            <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
          ))}
        </select>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--dim)" }}>
          {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
        </span>
        <NovaTarefaModal clientes={clientes} />
      </div>

      {/* View */}
      {view === "kanban" ? (
        <TaskBoard
          tarefas={filtered}
          onStatusChange={(id, status) => onUpdate(id, { status: status as EtapaRow["status"] })}
          onUpdate={onUpdate}
        />
      ) : (
        <TaskList tarefas={filtered} onUpdate={onUpdate} />
      )}
    </div>
  );
}

const selectSt: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line-2)",
  background: "var(--panel)", color: "var(--txt)", fontSize: 12.5,
  cursor: "pointer", outline: "none", fontFamily: "inherit",
};
