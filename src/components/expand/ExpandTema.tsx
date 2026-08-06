"use client";

import { useEffect, useState } from "react";

const DEFAULTS: Record<string, string> = {
  "--accent": "#C89B5E", "--accent-2": "#E0BC85",
  "--bg": "#08110E", "--panel": "#0F1B16", "--panel-2": "#13251F", "--line": "#1D4034", "--line-2": "#28503F",
  "--txt": "#F4E8D4", "--mut": "#B5AC97", "--dim": "#7C8C7F",
  "--green": "#6FBF92", "--warn": "#D9A94E", "--red": "#CE6A5F",
};
const GRUPOS: { t: string; vars: { k: string; n: string }[] }[] = [
  { t: "Acento (verde/dourado)", vars: [{ k: "--accent", n: "accent" }, { k: "--accent-2", n: "accent-2" }] },
  { t: "Superfícies", vars: [{ k: "--bg", n: "bg" }, { k: "--panel", n: "panel" }, { k: "--panel-2", n: "panel-2" }, { k: "--line", n: "line" }, { k: "--line-2", n: "line-2" }] },
  { t: "Texto", vars: [{ k: "--txt", n: "txt" }, { k: "--mut", n: "mut" }, { k: "--dim", n: "dim" }] },
  { t: "Status", vars: [{ k: "--green", n: "green" }, { k: "--warn", n: "warn" }, { k: "--red", n: "red" }] },
];
const KEY = "expand-tema";
const alvo = () => document.querySelector(".tema-expand") as HTMLElement | null;
function aplicar(map: Record<string, string>) {
  const e = alvo();
  if (!e) return;
  for (const k in map) e.style.setProperty(k, map[k]);
}

export default function ExpandTema() {
  const [vals, setVals] = useState<Record<string, string>>(DEFAULTS);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const m = { ...DEFAULTS, ...JSON.parse(s) };
        setVals(m);
        aplicar(m);
      }
    } catch { /* noop */ }
  }, []);

  function set(k: string, v: string) {
    const m = { ...vals, [k]: v };
    setVals(m);
    aplicar({ [k]: v });
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* noop */ }
  }
  function reset() {
    const e = alvo();
    if (e) Object.keys(DEFAULTS).forEach((k) => e.style.removeProperty(k));
    setVals(DEFAULTS);
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  }

  return (
    <div className="hx-glass" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>Editar o tema Expand</span>
        <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Mexa nas cores — aplica na hora e salva no navegador.</span>
        <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: 12 }}>Restaurar padrão</button>
      </div>
      {GRUPOS.map((g) => (
        <div key={g.t} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--dim)", marginBottom: 8 }}>{g.t}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {g.vars.map((v) => (
              <label key={v.k} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px" }}>
                <input type="color" value={vals[v.k]} onChange={(e) => set(v.k, e.target.value)} style={{ width: 34, height: 34, border: "none", borderRadius: 8, background: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600 }}>{v.n}</span>
                  <input
                    value={vals[v.k]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        setVals((p) => ({ ...p, [v.k]: val }));
                        if (/^#[0-9a-fA-F]{6}$/.test(val)) set(v.k, val);
                      }
                    }}
                    style={{ width: 74, background: "none", border: "none", outline: "none", color: "var(--dim)", fontFamily: "monospace", fontSize: 10.5 }}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>As mudanças valem para toda a área da Expand neste navegador. O modo claro/escuro continua no botão de tema, no topo.</p>
    </div>
  );
}
