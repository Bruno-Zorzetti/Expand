"use client";

import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EtapaRow } from "@/lib/expand-tarefas";
import TaskCard from "./TaskCard";
import TaskDrawer from "./TaskDrawer";

const COLUNAS = [
  { id: "idle", label: "Backlog",      cor: "var(--dim)" },
  { id: "run",  label: "Em Execução",  cor: "var(--accent)" },
  { id: "wait", label: "Em Revisão",   cor: "var(--warn)" },
  { id: "done", label: "Concluída",    cor: "var(--green)" },
];

type Tarefa = EtapaRow & { cliente_nome?: string };

function SortableCard({ tarefa, onClick }: { tarefa: Tarefa; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}>
      <TaskCard tarefa={tarefa} onClick={onClick} dragging={isDragging} />
    </div>
  );
}

type Props = {
  tarefas: Tarefa[];
  onStatusChange?: (id: string, status: string) => Promise<void>;
  onUpdate?: (id: string, fields: Partial<EtapaRow>) => Promise<void>;
};

export default function TaskBoard({ tarefas, onStatusChange, onUpdate }: Props) {
  const [items, setItems] = useState<Tarefa[]>(tarefas);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tarefa | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as string);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setDraggingId(null);
    if (!over || active.id === over.id) return;

    const overId = over.id as string;
    const col = COLUNAS.find((c) => c.id === overId);
    const newStatus = col ? col.id : items.find((t) => t.id === overId)?.status;
    if (!newStatus) return;

    setItems((prev) => prev.map((t) => t.id === active.id ? { ...t, status: newStatus } : t));
    onStatusChange?.(active.id as string, newStatus);
  }

  const draggingCard = items.find((t) => t.id === draggingId);

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 0 16px", minHeight: 400 }}>
          {COLUNAS.map((col) => {
            const colItems = items.filter((t) => t.status === col.id);
            return (
              <div key={col.id} id={col.id}
                style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Cabeçalho da coluna */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.cor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)" }}>{col.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--dim)", marginLeft: 2 }}>{colItems.length}</span>
                </div>

                {/* Cards */}
                <SortableContext items={colItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1,
                    minHeight: 80, borderRadius: 10, padding: "6px",
                    background: "color-mix(in srgb, var(--line) 40%, transparent)",
                    border: "1px dashed var(--line-2)" }}>
                    {colItems.map((t) => (
                      <SortableCard key={t.id} tarefa={t} onClick={() => setSelected(t)} />
                    ))}
                    {colItems.length === 0 && (
                      <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--dim)", fontSize: 12 }}>
                        Vazio
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {draggingCard && <TaskCard tarefa={draggingCard} dragging />}
        </DragOverlay>
      </DndContext>

      <TaskDrawer
        tarefa={selected}
        onClose={() => setSelected(null)}
        onUpdate={onUpdate}
      />
    </>
  );
}
