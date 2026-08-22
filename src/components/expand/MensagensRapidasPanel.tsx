"use client";

import ConfirmMsgModal from "@/components/expand/ConfirmMsgModal";

type Tipo = "boas_vindas" | "onboarding" | "followup_reuniao" | "relatorio";

const MSGS: { tipo: Tipo; emoji: string; label: string }[] = [
  { tipo: "boas_vindas",      emoji: "👋", label: "Boas-vindas ao grupo" },
  { tipo: "onboarding",       emoji: "🚀", label: "Início do projeto" },
  { tipo: "followup_reuniao", emoji: "📅", label: "Follow-up de reunião (1h)" },
  { tipo: "relatorio",        emoji: "📊", label: "Entrega de relatório" },
];

interface Props {
  clienteId: string;
  grupoJid: string;
  previews: Record<Tipo, string>;
  enviarAction: (fd: FormData) => Promise<void>;
}

export default function MensagensRapidasPanel({ clienteId, grupoJid, previews, enviarAction }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 8 }}>
      {MSGS.map(({ tipo, emoji, label }) => (
        <ConfirmMsgModal
          key={tipo}
          clienteId={clienteId}
          tipo={tipo}
          preview={previews[tipo]}
          grupo={grupoJid}
          enviarAction={enviarAction}
        >
          {(abrir) => (
            <button
              type="button"
              onClick={abrir}
              className="hx-btn hx-btn-ghost"
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", fontSize: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 3, height: "auto" }}
            >
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
            </button>
          )}
        </ConfirmMsgModal>
      ))}
    </div>
  );
}
