"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTOES_DISC } from "@/lib/expand-disc";
import { QUESTOES_ARQ } from "@/lib/expand-arquetipo";
import { QUESTOES_TEMP } from "@/lib/expand-temperamento";

// Ordem definida pelo Bruno: Temperamento → Arquétipo → DISC.
const TODAS = [
  ...QUESTOES_TEMP.map((q) => ({ q, sec: "Temperamento" as const })),
  ...QUESTOES_ARQ.map((q) => ({ q, sec: "Arquétipo" as const })),
  ...QUESTOES_DISC.map((q) => ({ q: q.q, sec: "DISC" as const })),
];
const ESCALA = ["Discordo\ntotalmente", "Discordo", "Neutro", "Concordo", "Concordo\ntotalmente"];

export default function DiagnosticoForm({ perfilId, nome, onSalvar }: {
  perfilId: string; nome: string; onSalvar: (disc: number[], arqu: number[], temp: number[]) => Promise<void>;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<(number | null)[]>(Array(TODAS.length).fill(null));
  const [enviando, setEnviando] = useState(false);
  const total = TODAS.length;
  const atual = TODAS[i];
  const ultima = i === total - 1;

  function responder(v: number) {
    setAns((s) => { const a = [...s]; a[i] = v; return a; });
    if (!ultima) setTimeout(() => setI((x) => Math.min(total - 1, x + 1)), 220);
  }

  async function finalizar() {
    if (ans.some((a) => a === null)) { setI(ans.findIndex((a) => a === null)); return; }
    setEnviando(true);
    const nT = QUESTOES_TEMP.length, nA = QUESTOES_ARQ.length;
    const temp = ans.slice(0, nT).map((v) => v ?? 3);
    const arqu = ans.slice(nT, nT + nA).map((v) => v ?? 3);
    const disc = ans.slice(nT + nA).map((v) => v ?? 3);
    await onSalvar(disc, arqu, temp);
    router.push(`/expand/equipe/${perfilId}`);
    router.refresh();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "5") responder(Number(e.key));
      else if (e.key === "ArrowLeft" && i > 0) setI(i - 1);
      else if (e.key === "ArrowRight" && ans[i] !== null && !ultima) setI(i + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ex-panel hx-glass" style={{ maxWidth: 640, margin: "0 auto", padding: 0, overflow: "hidden" }}>
      <div style={{ height: 5, background: "var(--panel-2)" }}>
        <div style={{ height: "100%", width: `${((i + 1) / total) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))", transition: ".3s" }} />
      </div>
      <div style={{ padding: "30px 30px 26px", minHeight: 300, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--dim)", marginBottom: 18 }}>
          <span style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, color: "var(--accent)" }}>{atual.sec}</span>
          <span>{i + 1} de {total}</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, color: "var(--txt)", marginBottom: 24, flex: 1 }}>{atual.q}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {ESCALA.map((l, k) => {
            const v = k + 1, on = ans[i] === v;
            return (
              <button key={v} onClick={() => responder(v)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 6px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg)",
                  color: on ? "var(--accent)" : "var(--mut)", transition: ".12s", fontFamily: "inherit",
                }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{v}</span>
                <span style={{ fontSize: 9, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.2 }}>{l}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="hx-btn hx-btn-ghost" style={{ padding: "8px 14px", fontSize: 12, opacity: i === 0 ? 0.4 : 1 }}>← Voltar</button>
          {ultima ? (
            <button onClick={finalizar} disabled={enviando} className="hx-btn hx-btn-primary" style={{ marginLeft: "auto" }}>{enviando ? "Gerando…" : "Ver meu resultado"}</button>
          ) : (
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>Dica: tecle 1 a 5</span>
          )}
        </div>
      </div>
      <div style={{ padding: "10px 30px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--dim)" }}>Diagnóstico de {nome} · respostas 100% suas — guardamos o histórico para ver sua evolução.</div>
    </div>
  );
}
