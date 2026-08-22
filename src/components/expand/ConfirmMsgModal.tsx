"use client";

import { useState, useTransition } from "react";
import MModalOverlay from "@/components/monay/MModalOverlay";

type Tipo = "boas_vindas" | "onboarding" | "followup_reuniao" | "relatorio";

const LABELS: Record<Tipo, string> = {
  boas_vindas:      "Boas-vindas",
  onboarding:       "Onboarding",
  followup_reuniao: "Follow-up de reunião",
  relatorio:        "Entrega de relatório",
};

interface Props {
  clienteId: string;
  tipo: Tipo;
  preview: string;
  grupo: string;
  enviarAction: (fd: FormData) => Promise<void>;
  children: (abrirModal: () => void) => React.ReactNode;
}

export default function ConfirmMsgModal({ clienteId, tipo, preview, grupo, enviarAction, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const [meetLink, setMeetLink] = useState("");
  const [pending, startTransition] = useTransition();

  function enviar() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("clienteId", clienteId);
      fd.set("tipo", tipo);
      if (meetLink) fd.set("meet_link", meetLink);
      await enviarAction(fd);
      setAberto(false);
    });
  }

  return (
    <>
      {children(() => setAberto(true))}

      <MModalOverlay open={aberto} onClose={() => setAberto(false)} maxWidth={520}>
        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--txt)", marginBottom: 20, paddingRight: 32 }}>
            Enviar — {LABELS[tipo]}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 8 }}>Destino</div>
          <div style={{ padding: "10px 13px", borderRadius: 9, background: "var(--panel-2)", border: "1px solid var(--line)", fontSize: 13, color: "var(--mut)", marginBottom: 16 }}>
            Grupo WhatsApp — <span style={{ color: "var(--txt)", fontWeight: 600 }}>{grupo || "não configurado"}</span>
          </div>

          {tipo === "followup_reuniao" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)", display: "block", marginBottom: 6 }}>Link da reunião (opcional)</label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--txt)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 8 }}>Prévia da mensagem</div>
          <div style={{ padding: "12px 14px", borderRadius: 9, background: "color-mix(in srgb, var(--accent) 6%, var(--panel-2))", border: "1px solid color-mix(in srgb, var(--accent) 20%, var(--line))", fontSize: 13, color: "var(--txt)", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
            {preview}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setAberto(false)} disabled={pending} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid var(--line)", background: "transparent", color: "var(--mut)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={enviar} disabled={pending} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#0A1512", fontSize: 13, fontWeight: 800, cursor: pending ? "wait" : "pointer" }}>
              {pending ? "Enviando…" : "Enviar agora"}
            </button>
          </div>
        </div>
      </MModalOverlay>
    </>
  );
}
