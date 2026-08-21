"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export type Notif = { id: string; tipo: string; texto: string; link: string | null; lida: boolean; criado_em: string };
const ICON: Record<string, string> = { tarefa: "📋", chamado: "🆘", bloqueio: "⛔", info: "🔔", demanda: "📥", resumo: "📊" };

export default function Notificacoes({ notas, marcarLida, marcarTodas }: {
  notas: Notif[];
  marcarLida: (fd: FormData) => Promise<void>;
  marcarTodas: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [lidas, setLidas] = useState<Set<string>>(new Set(notas.filter(n => n.lida).map(n => n.id)));
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  function openPanel() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  const naoLidas = notas.filter(n => !lidas.has(n.id)).length;

  async function abrir(n: Notif) {
    if (!lidas.has(n.id)) {
      setLidas(prev => new Set([...prev, n.id]));
      const fd = new FormData(); fd.set("id", n.id); await marcarLida(fd);
    }
    setOpen(false);
    if (n.link) router.push(n.link); else router.refresh();
  }

  async function marcarTodosHandler() {
    const todas = new Set(notas.map(n => n.id));
    setLidas(todas);
    await marcarTodas();
    setOpen(false);
  }

  const panel = open && rect && mounted ? createPortal(
    <>
      <div
        onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, zIndex: 998 }}
      />
      <div
        className="hx-glass"
        style={{
          position: "fixed",
          top: rect.top,
          right: rect.right,
          width: 340,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: 440,
          overflowY: "auto",
          zIndex: 999,
          borderRadius: 12,
          padding: 8,
          boxShadow: "0 16px 44px -12px rgba(0,0,0,.6)",
          background: "var(--panel)",
          border: "1px solid var(--line-2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 8px" }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Notificações</span>
          {naoLidas > 0 && (
            <button
              onClick={marcarTodosHandler}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--accent)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
            >
              marcar todas
            </button>
          )}
        </div>

        {notas.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--dim)", textAlign: "center", padding: "18px 0" }}>Nada por aqui. 🎉</p>
        ) : notas.map((n) => {
          const isLida = lidas.has(n.id);
          return (
            <button
              key={n.id}
              onClick={() => abrir(n)}
              style={{
                width: "100%", display: "flex", gap: 10, alignItems: "flex-start",
                textAlign: "left", padding: "9px 8px",
                background: isLida ? "transparent" : "color-mix(in srgb,var(--accent) 8%,transparent)",
                border: "none", borderRadius: 9, cursor: "pointer",
                fontFamily: "inherit", marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{ICON[n.tipo] ?? "🔔"}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--txt)", lineHeight: 1.4 }}>{n.texto}</span>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>
                  {new Date(n.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              {!isLida && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 5 }} />}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className="ex-iconbtn"
        onClick={openPanel}
        title="Notificações"
        style={{ position: "relative" }}
      >
        <svg className="ex-ic" viewBox="0 0 24 24">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {naoLidas > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            minWidth: 16, height: 16, padding: "0 4px",
            borderRadius: 8, background: "var(--red)", color: "#fff",
            fontSize: 9.5, fontWeight: 800, display: "grid", placeItems: "center",
          }}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
