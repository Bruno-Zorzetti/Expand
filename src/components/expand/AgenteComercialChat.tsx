"use client";

import { useState, useRef } from "react";

type Ctx = {
  nome: string;
  cargo: string;
  xpHoje: number;
  metaHoje: number;
  xpTotal: number;
  nivel: string;
  streak: number;
  missoesDia: { id: string; t: string; tipo: string; valor: number; alvo?: number; done: boolean }[];
  metaACV: number;
  ticketMedio: number;
};

type Msg = { role: "user" | "assistant"; content: string };

export default function AgenteComercialChat({ contexto }: { contexto: Ctx }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const SUGESTOES = [
    "Como estou me saindo hoje?",
    "Minhas metas estão calibradas?",
    "Quais missões devo priorizar?",
    "Como aumentar minha taxa de conversão?",
  ];

  async function enviar(texto: string) {
    if (!texto.trim() || loading) return;
    const novas: Msg[] = [...msgs, { role: "user", content: texto }];
    setMsgs(novas);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/expand/comercial/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto, contexto }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMsgs([...novas, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs([...novas, { role: "assistant", content: acc }]);
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setMsgs([...novas, { role: "assistant", content: "Erro ao conectar com o Téo. Configure a ANTHROPIC_API_KEY em Integrações." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb, var(--accent) 15%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>Téo — Assistente Comercial</div>
          <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Ajustes de metas, análise de desempenho e coaching do dia</div>
        </div>
        <span style={{ fontSize: 12, color: "var(--mut)", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
      </button>

      {open && (
        <div className="hx-glass" style={{ borderRadius: "0 0 14px 14px", borderTop: "none", overflow: "hidden" }}>
          {/* Histórico */}
          <div style={{ maxHeight: 340, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 12 }}>
                  Pergunte ao Téo sobre sua performance, metas ou missões:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {SUGESTOES.map(s => (
                    <button key={s} onClick={() => enviar(s)} style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 20, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--mut)", cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{m.role === "user" ? "👤" : "🤖"}</span>
                  <div style={{ flex: 1, fontSize: 13, color: "var(--txt)", lineHeight: 1.65, background: m.role === "assistant" ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent", borderRadius: 10, padding: m.role === "assistant" ? "8px 12px" : "0", whiteSpace: "pre-wrap" }}>
                    {m.content}
                    {loading && i === msgs.length - 1 && m.role === "assistant" && !m.content && (
                      <span style={{ color: "var(--mut)" }}>pensando…</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid var(--line)", padding: "10px 12px", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar(input))}
              placeholder="Pergunte algo ao Téo…"
              disabled={loading}
              style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 10px", fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={() => enviar(input)}
              disabled={loading || !input.trim()}
              className="hx-btn hx-btn-primary"
              style={{ padding: "7px 14px", fontSize: 12.5, opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              {loading ? "…" : "↑"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
