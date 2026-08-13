"use client";

import { useMemo, useRef, useState } from "react";
import { QUESTOES_ARQ } from "@/lib/expand-arquetipo";

const NOTAS = [
  { v: 1, l: "Nada a ver" },
  { v: 2, l: "Pouco" },
  { v: 3, l: "Mais ou menos" },
  { v: 4, l: "Bastante" },
  { v: 5, l: "É a marca" },
];

// Teste de arquétipo de MARCA (48 afirmações, material do Henrique) — define o
// posicionamento da empresa, diferente do temperamento, que é da pessoa.
export default function TesteArquetipoMarca({ clienteId, salvar }: { clienteId: string; salvar: (fd: FormData) => Promise<void> }) {
  const [resp, setResp] = useState<number[]>(() => Array(QUESTOES_ARQ.length).fill(0));
  const inicio = useRef<number>(Date.now());
  const respondidas = resp.filter(Boolean).length;
  const pct = Math.round((respondidas / QUESTOES_ARQ.length) * 100);
  const faltam = useMemo(() => resp.findIndex((r) => !r), [resp]);
  const completo = respondidas === QUESTOES_ARQ.length;

  return (
    <form action={salvar} style={{ maxWidth: 760 }}>
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="respostas" value={JSON.stringify(resp)} />
      <input type="hidden" name="segundos" value={String(Math.round((Date.now() - inicio.current) / 1000))} />

      <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", marginBottom: 18, position: "sticky", top: 8, zIndex: 5, background: "var(--panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}>
          <span style={{ fontWeight: 700 }}>{respondidas} de {QUESTOES_ARQ.length} respondidas</span>
          <span style={{ color: "var(--dim)" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "var(--panel-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,var(--accent),var(--accent-2))", transition: "width .25s" }} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Quem está respondendo</span>
          <input name="pessoa_nome" required placeholder="Seu nome" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 9, color: "var(--txt)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }} />
        </label>
        <input name="pessoa_papel" placeholder="Seu papel na empresa (opcional)" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 9, color: "var(--txt)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {QUESTOES_ARQ.map((q, i) => (
          <div key={i} className="hx-glass" style={{ borderRadius: 12, padding: "13px 15px", borderLeft: `3px solid ${resp[i] ? "var(--green)" : "var(--line-2)"}` }}>
            <div style={{ fontSize: 13.5, marginBottom: 9, display: "flex", gap: 9 }}>
              <span style={{ color: "var(--dim)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <span>{q}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {NOTAS.map((n) => {
                const on = resp[i] === n.v;
                return (
                  <button key={n.v} type="button" onClick={() => setResp((r) => r.map((x, k) => (k === i ? n.v : x)))}
                    style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: on ? 700 : 500,
                      border: on ? "none" : "1px solid var(--line-2)", background: on ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "transparent", color: on ? "#0A1512" : "var(--mut)" }}>
                    {n.l}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: "sticky", bottom: 12, marginTop: 18 }}>
        <button className="hx-btn hx-btn-primary" type="submit" disabled={!completo} style={{ width: "100%", justifyContent: "center", opacity: completo ? 1 : 0.5, padding: "13px" }}>
          {completo ? "Ver o arquétipo da minha marca" : `Faltam ${QUESTOES_ARQ.length - respondidas} — próxima é a ${faltam + 1}`}
        </button>
      </div>
    </form>
  );
}
