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

const STATUS_APROV: Record<string, { label: string; cor: string }> = {
  aguardando:  { label: "Aguardando aprovação", cor: "#F59E0B" },
  aprovado:    { label: "Aprovado",              cor: "#22C55E" },
  rejeitado:   { label: "Rejeitado",             cor: "#EF4444" },
  alteracoes:  { label: "Alterações solicitadas",cor: "#F97316" },
};

function elapsedLabel(iso: string | null) {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function TaskDrawer({ tarefa, onClose, onUpdate }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(tarefa?.status ?? "idle");
  const [visivelCliente, setVisivelCliente] = useState(tarefa?.visivel_cliente ?? false);
  const [portalAprovacao, setPortalAprovacao] = useState(tarefa?.portal_aprovacao ?? false);
  const [portalStatus, setPortalStatus] = useState(tarefa?.portal_status ?? null);
  const [portalAprovacaoEm, setPortalAprovacaoEm] = useState(tarefa?.portal_aprovacao_em ?? null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tarefa) return;
    setStatus(tarefa.status);
    setVisivelCliente(tarefa.visivel_cliente);
    setPortalAprovacao(tarefa.portal_aprovacao ?? false);
    setPortalStatus(tarefa.portal_status ?? null);
    setPortalAprovacaoEm(tarefa.portal_aprovacao_em ?? null);
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

          {/* Visível para cliente + Aprovação */}
          <div style={{ borderRadius: 8, background: "var(--panel)", border: "1px solid var(--line-2)", overflow: "hidden" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px" }}>
              <input type="checkbox" checked={visivelCliente}
                onChange={(e) => { setVisivelCliente(e.target.checked); salvar({ visivel_cliente: e.target.checked }); }}
                style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>Visível no portal do cliente</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)" }}>O cliente poderá ver esta tarefa no portal</div>
              </div>
            </label>

            {visivelCliente && (
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--line)", background: "var(--panel-2)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={portalAprovacao}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPortalAprovacao(checked);
                      const now = checked ? new Date().toISOString() : null;
                      setPortalAprovacaoEm(now);
                      setPortalStatus(checked ? "aguardando" : null);
                      salvar({
                        portal_aprovacao: checked,
                        portal_status: checked ? "aguardando" : null,
                        portal_aprovacao_em: now,
                      } as Partial<EtapaRow>);
                    }}
                    style={{ width: 15, height: 15, accentColor: "#F59E0B", cursor: "pointer" }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)" }}>
                    Cliente precisa aprovar
                  </div>
                </label>

                {portalAprovacao && portalStatus && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700,
                        color: STATUS_APROV[portalStatus]?.cor ?? "var(--dim)",
                        background: `color-mix(in srgb, ${STATUS_APROV[portalStatus]?.cor ?? "var(--dim)"} 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${STATUS_APROV[portalStatus]?.cor ?? "var(--dim)"} 28%, transparent)`,
                        borderRadius: 20, padding: "2px 10px",
                      }}>
                        {STATUS_APROV[portalStatus]?.label ?? portalStatus}
                      </span>
                      {portalAprovacaoEm && (
                        <span style={{ fontSize: 11, color: "var(--dim)" }}>
                          · {portalStatus === "aguardando" ? "desde " : ""}{elapsedLabel(portalAprovacaoEm)}
                        </span>
                      )}
                    </div>
                    {tarefa.portal_feedback && (
                      <div style={{
                        fontSize: 12, color: "var(--txt)", lineHeight: 1.5,
                        padding: "8px 10px", borderRadius: 6,
                        background: "color-mix(in srgb, var(--warn) 8%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--warn) 22%, transparent)",
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--warn)", display: "block", marginBottom: 3 }}>
                          MENSAGEM DO CLIENTE
                        </span>
                        {tarefa.portal_feedback}
                      </div>
                    )}
                    {tarefa.portal_feedback_audio_url && (
                      <audio controls src={tarefa.portal_feedback_audio_url}
                        style={{ width: "100%", height: 32, marginTop: 2 }} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
