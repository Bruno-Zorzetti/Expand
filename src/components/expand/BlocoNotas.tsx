"use client";

import { useRef, useState } from "react";

const CORES: Record<string, { bg: string; tx: string }> = {
  amarelo: { bg: "#E8CE6A", tx: "#2a2410" },
  verde: { bg: "#9BCF9B", tx: "#14240f" },
  azul: { bg: "#92B7D6", tx: "#0f1c28" },
  rosa: { bg: "#D69BB5", tx: "#2a1420" },
  laranja: { bg: "#E0A96A", tx: "#2a1a0f" },
};

export default function BlocoNotas({ inicial, corInicial, salvar }: { inicial: string; corInicial?: string; salvar: (fd: FormData) => Promise<void> }) {
  const [cor, setCor] = useState(corInicial && CORES[corInicial] ? corInicial : "amarelo");
  const [status, setStatus] = useState<"idle" | "salvando" | "salvo">("idle");
  const edRef = useRef<HTMLDivElement>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = CORES[cor];

  function persistir(novaCor?: string) {
    setStatus("salvando");
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const fd = new FormData();
      fd.set("conteudo", edRef.current?.innerHTML ?? "");
      fd.set("cor", novaCor ?? cor);
      await salvar(fd);
      setStatus("salvo");
    }, 700);
  }
  const cmd = (c: string) => { document.execCommand(c); edRef.current?.focus(); persistir(); };

  return (
    <div className="ex-panel hx-glass" style={{ padding: 0 }}>
      <div className="ph"><span className="pt">📌 Post-it</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: status === "salvo" ? "var(--green)" : "var(--dim)" }}>{status === "salvando" ? "salvando…" : status === "salvo" ? "✓ salvo" : ""}</span></div>
      <div style={{ padding: "10px 14px 14px" }}>
        <div style={{ background: c.bg, borderRadius: 12, padding: 12, boxShadow: "0 6px 18px rgba(0,0,0,.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }} style={{ ...tbtn, color: c.tx, fontWeight: 800 }}>B</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }} style={{ ...tbtn, color: c.tx, fontStyle: "italic" }}>I</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }} style={{ ...tbtn, color: c.tx, fontSize: 13 }}>•</button>
            <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {Object.entries(CORES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => { setCor(k); persistir(k); }} title={k} style={{ width: 16, height: 16, borderRadius: "50%", background: v.bg, border: cor === k ? "2px solid rgba(0,0,0,.5)" : "1px solid rgba(0,0,0,.2)", cursor: "pointer" }} />
              ))}
            </span>
          </div>
          <div ref={edRef} contentEditable suppressContentEditableWarning onInput={() => persistir()} dangerouslySetInnerHTML={{ __html: inicial }}
            style={{ minHeight: 110, color: c.tx, fontSize: 13.5, lineHeight: 1.55, outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif" }} />
        </div>
      </div>
    </div>
  );
}

const tbtn: React.CSSProperties = { width: 26, height: 24, borderRadius: 6, border: "1px solid rgba(0,0,0,.18)", background: "rgba(255,255,255,.25)", cursor: "pointer", fontSize: 12, lineHeight: 1, display: "grid", placeItems: "center" };
