"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { EtapaRow } from "@/lib/expand-tarefas";

const STATUS_OPTIONS = [
  { value: "idle", label: "Backlog" },
  { value: "run",  label: "Em Execução" },
  { value: "wait", label: "Em Revisão" },
  { value: "done", label: "Concluída" },
  { value: "late", label: "Atrasada" },
];

type Props = {
  tarefa: (EtapaRow & { cliente_nome?: string }) | null;
  onClose: () => void;
  onUpdate?: (id: string, fields: Partial<EtapaRow>) => Promise<void>;
};

export default function TaskDrawer({ tarefa, onClose, onUpdate }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(tarefa?.status ?? "idle");
  const [visivelCliente, setVisivelCliente] = useState(tarefa?.visivel_cliente ?? false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tarefa) return;
    setStatus(tarefa.status);
    setVisivelCliente(tarefa.visivel_cliente);
  }, [tarefa?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!tarefa) return null;

  const prazo = tarefa.data_prevista
    ? new Date(tarefa.data_prevista).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  function salvar(field: Partial<EtapaRow>) {
    if (!onUpdate || !tarefa) return;
    startTransition(() => {
      onUpdate(tarefa.id, field);
    });
  }

  return (
    <>
      {/* Overlay */}
      <div ref={overlayRef} onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(480px, 100vw)",
        background: "var(--bg)",
        borderLeft: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,.12)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 4 }}>
              {tarefa.area ?? "Tarefa"}
              {tarefa.cliente_nome ? ` · ${tarefa.cliente_nome}` : ""}
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, margin: 0, color: "var(--txt)" }}>
              {tarefa.titulo}
            </h2>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 20, padding: "0 4px", lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status */}
          <div>
            <label style={labelSt}>Status</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.value}
                  onClick={() => { setStatus(opt.value); salvar({ status: opt.value }); }}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "1px solid",
                    borderColor: status === opt.value ? "var(--accent)" : "var(--line-2)",
                    background: status === opt.value ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "var(--panel)",
                    color: status === opt.value ? "var(--accent)" : "var(--mut)",
                    fontWeight: status === opt.value ? 700 : 400,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Responsável */}
          {tarefa.responsavel_atual && (
            <div>
              <label style={labelSt}>Responsável</label>
              <p style={valueSt}>{tarefa.responsavel_atual}</p>
            </div>
          )}

          {/* Prazo */}
          <div>
            <label style={labelSt}>Prazo previsto</label>
            <p style={valueSt}>{prazo}</p>
          </div>

          {/* SLA */}
          {tarefa.sla && (
            <div>
              <label style={labelSt}>SLA</label>
              <p style={valueSt}>{tarefa.sla}</p>
            </div>
          )}

          {/* Critério de conclusão */}
          {tarefa.criterio && (
            <div>
              <label style={labelSt}>Critério de conclusão</label>
              <p style={{ ...valueSt, whiteSpace: "pre-wrap" }}>{tarefa.criterio}</p>
            </div>
          )}

          {/* Bloqueio */}
          {tarefa.bloqueado && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>🔒 Bloqueado</div>
              {tarefa.bloqueio_motivo && <p style={{ fontSize: 12.5, color: "var(--txt)", margin: 0 }}>{tarefa.bloqueio_motivo}</p>}
            </div>
          )}

          {/* Visível para cliente */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 8, background: "var(--panel)", border: "1px solid var(--line-2)" }}>
            <input type="checkbox" checked={visivelCliente}
              onChange={(e) => { setVisivelCliente(e.target.checked); salvar({ visivel_cliente: e.target.checked }); }}
              style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>Visível no portal do cliente</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)" }}>O cliente poderá ver esta tarefa no portal</div>
            </div>
          </label>

          {pending && (
            <div style={{ fontSize: 12, color: "var(--dim)", textAlign: "center" }}>Salvando...</div>
          )}
        </div>
      </div>
    </>
  );
}

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".07em", color: "var(--dim)", marginBottom: 6,
};
const valueSt: React.CSSProperties = {
  fontSize: 13.5, color: "var(--txt)", margin: 0,
};
