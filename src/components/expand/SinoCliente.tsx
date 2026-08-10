"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type NotifCli = { id: string; tipo: string | null; texto: string; link: string | null; lida: boolean; criado_em: string };

// Regra da casa: toda notificação leva a algum lugar, exceto alerta/aviso (informativos).
const SO_AVISO = ["alerta", "aviso"];

const ICONE: Record<string, string> = {
  aprovacao: "✎", entrega: "✓", demanda: "＋", reuniao: "📅", alerta: "⏰", aviso: "ℹ", mensagem: "💬",
};

export default function SinoCliente({ notas, marcarLida }: { notas: NotifCli[]; marcarLida: (fd: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  const naoLidas = notas.filter((n) => !n.lida).length;

  async function abrir(n: NotifCli) {
    // ids "aprov-…" são pendências vivas (não são linhas na tabela) — não marcam leitura.
    if (!n.lida && !n.id.startsWith("aprov-")) { const fd = new FormData(); fd.set("notifId", n.id); await marcarLida(fd); }
    const soAviso = SO_AVISO.includes(n.tipo ?? "");
    if (n.link && !soAviso) { setAberto(false); router.push(n.link); }
    else router.refresh();
  }

  const quando = (s: string) => {
    const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min`;
    if (m < 1440) return `${Math.floor(m / 60)} h`;
    return `${Math.floor(m / 1440)} d`;
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="ex-iconbtn" onClick={() => setAberto((v) => !v)} title="Notificações" aria-label={`Notificações${naoLidas ? `: ${naoLidas} não lidas` : ""}`} style={{ position: "relative" }}>
        <svg className="ex-ic" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {naoLidas ? <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 9, background: "var(--accent)", color: "#0A1512", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 4px" }}>{naoLidas}</span> : null}
      </button>

      {aberto ? (
        <>
          <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div className="hx-glass" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "min(340px, 88vw)", borderRadius: 14, zIndex: 50, background: "var(--panel)", overflow: "hidden", boxShadow: "0 20px 50px -20px rgba(0,0,0,.7)" }}>
            <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 700 }}>
              Notificações {naoLidas ? <span style={{ color: "var(--accent)" }}>· {naoLidas} nova(s)</span> : null}
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {notas.length ? notas.map((n) => {
                const soAviso = SO_AVISO.includes(n.tipo ?? "");
                return (
                  <button key={n.id} onClick={() => abrir(n)} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", padding: "11px 15px", background: n.lida ? "transparent" : "color-mix(in srgb, var(--accent) 7%, transparent)", border: "none", borderBottom: "1px solid var(--line)", cursor: soAviso && !n.link ? "default" : "pointer", font: "inherit", color: "inherit" }}>
                    <span style={{ fontSize: 15, flexShrink: 0, color: n.tipo === "aprovacao" ? "var(--accent)" : "var(--mut)" }}>{ICONE[n.tipo ?? ""] ?? "•"}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.45, color: "var(--txt)" }}>{n.texto}</span>
                      <span style={{ display: "block", fontSize: 10.5, color: "var(--dim)", marginTop: 3 }}>
                        {quando(n.criado_em)} atrás{n.link && !soAviso ? " · toque para abrir" : ""}
                      </span>
                    </span>
                    {!n.lida ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} /> : null}
                  </button>
                );
              }) : <p style={{ padding: "20px 15px", fontSize: 12.5, color: "var(--dim)", textAlign: "center" }}>Nenhuma notificação por aqui. 👍</p>}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
