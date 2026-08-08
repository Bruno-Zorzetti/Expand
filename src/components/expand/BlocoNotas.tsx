"use client";

import { useEffect, useRef, useState } from "react";

const CORES: Record<string, { bg: string; tx: string }> = {
  amarelo: { bg: "#E8CE6A", tx: "#2a2410" },
  verde: { bg: "#9BCF9B", tx: "#14240f" },
  azul: { bg: "#92B7D6", tx: "#0f1c28" },
  rosa: { bg: "#D69BB5", tx: "#2a1420" },
  laranja: { bg: "#E0A96A", tx: "#2a1a0f" },
};

export type Nota = { id: string; conteudo: string; cor: string };
type Props = {
  notas: Nota[];
  salvar: (fd: FormData) => Promise<void>;
  excluir: (fd: FormData) => Promise<void>;
};

// Um post-it. O innerHTML é setado UMA vez no mount (imperativo) — nunca controlado
// pelo React — pra o refresh do server action não sobrescrever o que se digita.
function Postit({ nota, cor: corInicial, salvar, excluir, onRemover }: { nota: Nota; cor: string; salvar: Props["salvar"]; excluir: Props["excluir"]; onRemover: () => void }) {
  const ed = useRef<HTMLDivElement>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cor, setCor] = useState(CORES[corInicial] ? corInicial : "amarelo");
  const [status, setStatus] = useState<"" | "salvando" | "salvo">("");
  const c = CORES[cor];

  useEffect(() => { if (ed.current) ed.current.innerHTML = nota.conteudo || ""; }, []); // uma vez

  function persistir(novaCor?: string) {
    setStatus("salvando");
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      const fd = new FormData();
      fd.set("id", nota.id);
      fd.set("conteudo", ed.current?.innerHTML ?? "");
      fd.set("cor", novaCor ?? cor);
      await salvar(fd);
      setStatus("salvo");
      setTimeout(() => setStatus(""), 1200);
    }, 600);
  }
  const cmd = (k: string) => { document.execCommand(k); ed.current?.focus(); persistir(); };

  async function remover() {
    onRemover();
    const fd = new FormData(); fd.set("id", nota.id);
    await excluir(fd);
  }

  return (
    <div style={{ background: c.bg, borderRadius: 12, padding: 10, boxShadow: "0 6px 18px rgba(0,0,0,.25)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }} style={{ ...tbtn, color: c.tx, fontWeight: 800 }}>B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }} style={{ ...tbtn, color: c.tx, fontStyle: "italic" }}>I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }} style={{ ...tbtn, color: c.tx, fontSize: 13 }}>•</button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 3, alignItems: "center" }}>
          {Object.entries(CORES).map(([k, v]) => (
            <button key={k} type="button" onClick={() => { setCor(k); persistir(k); }} title={k} style={{ width: 14, height: 14, borderRadius: "50%", background: v.bg, border: cor === k ? "2px solid rgba(0,0,0,.55)" : "1px solid rgba(0,0,0,.2)", cursor: "pointer" }} />
          ))}
          <button type="button" onClick={remover} title="Apagar post-it" style={{ ...tbtn, width: 22, color: c.tx, marginLeft: 4 }}>✕</button>
        </span>
      </div>
      <div ref={ed} contentEditable suppressContentEditableWarning onInput={() => persistir()}
        data-ph="Escreva…"
        style={{ minHeight: 92, color: c.tx, fontSize: 13.5, lineHeight: 1.5, outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif" }} />
      <div style={{ fontSize: 9.5, color: c.tx, opacity: .55, textAlign: "right", height: 12, marginTop: 2 }}>{status === "salvando" ? "salvando…" : status === "salvo" ? "✓ salvo" : ""}</div>
    </div>
  );
}

export default function BlocoNotas({ notas, salvar, excluir }: Props) {
  const [lista, setLista] = useState<Nota[]>(notas);

  function novo() {
    const id = (globalThis.crypto?.randomUUID?.() ?? "n" + Date.now());
    setLista((a) => [...a, { id, conteudo: "", cor: "amarelo" }]);
  }
  function remover(id: string) { setLista((a) => a.filter((n) => n.id !== id)); }

  return (
    <div className="ex-panel hx-glass" style={{ padding: 0 }}>
      <div className="ph"><span className="pt">📌 Post-its</span><button type="button" onClick={novo} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--line-2)", color: "var(--mut)", borderRadius: 7, padding: "3px 9px", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>＋ Novo</button></div>
      <div style={{ padding: "10px 14px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {lista.length === 0 ? <p style={{ fontSize: 12, color: "var(--dim)", gridColumn: "1 / -1" }}>Sem post-its. Clique em <b>＋ Novo</b> para começar.</p> : null}
        {lista.map((n) => (
          <Postit key={n.id} nota={n} cor={n.cor} salvar={salvar} excluir={excluir} onRemover={() => remover(n.id)} />
        ))}
      </div>
    </div>
  );
}

const tbtn: React.CSSProperties = { width: 24, height: 22, borderRadius: 6, border: "1px solid rgba(0,0,0,.18)", background: "rgba(255,255,255,.28)", cursor: "pointer", fontSize: 12, lineHeight: 1, display: "grid", placeItems: "center" };
