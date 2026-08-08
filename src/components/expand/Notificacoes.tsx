"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type Notif = { id: string; tipo: string; texto: string; link: string | null; lida: boolean; criado_em: string };
const ICON: Record<string, string> = { tarefa: "📋", chamado: "🆘", bloqueio: "⛔", info: "🔔" };

export default function Notificacoes({ notas, marcarLida, marcarTodas }: {
  notas: Notif[];
  marcarLida: (fd: FormData) => Promise<void>;
  marcarTodas: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const naoLidas = notas.filter((n) => !n.lida).length;

  async function abrir(n: Notif) {
    if (!n.lida) { const fd = new FormData(); fd.set("id", n.id); await marcarLida(fd); }
    setOpen(false);
    if (n.link) router.push(n.link); else router.refresh();
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="ex-iconbtn" onClick={() => setOpen((v) => !v)} title="Notificações" style={{ position: "relative" }}>
        <svg className="ex-ic" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {naoLidas ? <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--red)", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "grid", placeItems: "center" }}>{naoLidas > 9 ? "9+" : naoLidas}</span> : null}
      </button>

      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
          <div className="hx-glass" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxWidth: "90vw", maxHeight: 440, overflowY: "auto", zIndex: 49, borderRadius: 12, padding: 8, boxShadow: "0 16px 44px -12px rgba(0,0,0,.5)" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 8px" }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Notificações</span>
              {naoLidas ? <button onClick={async () => { await marcarTodas(); setOpen(false); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--accent)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>marcar todas</button> : null}
            </div>
            {notas.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--dim)", textAlign: "center", padding: "18px 0" }}>Nada por aqui. 🎉</p>
            ) : notas.map((n) => (
              <button key={n.id} onClick={() => abrir(n)} style={{ width: "100%", display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", padding: "9px 8px", background: n.lida ? "transparent" : "color-mix(in srgb,var(--accent) 8%,transparent)", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", marginBottom: 2 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ICON[n.tipo] ?? "🔔"}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--txt)", lineHeight: 1.4 }}>{n.texto}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>{new Date(n.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                {!n.lida ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
