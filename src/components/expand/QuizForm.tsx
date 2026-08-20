"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ESCALA = ["Discordo\ntotalmente", "Discordo", "Neutro", "Concordo", "Concordo\ntotalmente"];

export default function QuizForm({
  perfilId,
  nome,
  tipo,
  perguntas,
  voltarHref,
  onSalvar,
}: {
  perfilId: string;
  nome: string;
  tipo: string;
  perguntas: string[];
  voltarHref: string;
  onSalvar: (respostas: number[]) => Promise<void>;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<(number | null)[]>(Array(perguntas.length).fill(null));
  const [enviando, setEnviando] = useState(false);
  const total = perguntas.length;
  const ultima = i === total - 1;

  function responder(v: number) {
    setAns((s) => { const a = [...s]; a[i] = v; return a; });
    if (!ultima) setTimeout(() => setI((x) => Math.min(total - 1, x + 1)), 220);
  }

  async function finalizar() {
    const semResposta = ans.findIndex((a) => a === null);
    if (semResposta !== -1) { setI(semResposta); return; }
    setEnviando(true);
    await onSalvar(ans.map((v) => v ?? 3));
    router.push(`/expand/equipe/${perfilId}/diagnostico`);
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

  const respondidas = ans.filter((a) => a !== null).length;

  return (
    <div className="ex-panel hx-glass" style={{ maxWidth: 660, margin: "0 auto", padding: 0, overflow: "hidden" }}>
      {/* Barra de progresso */}
      <div style={{ height: 5, background: "var(--panel-2)" }}>
        <div style={{ height: "100%", width: `${((respondidas) / total) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))", transition: ".3s" }} />
      </div>

      <div style={{ padding: "28px 28px 24px", minHeight: 310, display: "flex", flexDirection: "column" }}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--dim)", marginBottom: 16 }}>
          <span style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700, color: "var(--accent)" }}>{tipo}</span>
          <span>{i + 1} / {total}</span>
        </div>

        {/* Pergunta */}
        <h2 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.45, color: "var(--txt)", marginBottom: 22, flex: 1 }}>
          {perguntas[i]}
        </h2>

        {/* Escala 1-5 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 }}>
          {ESCALA.map((l, k) => {
            const v = k + 1, on = ans[i] === v;
            return (
              <button key={v} onClick={() => responder(v)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                  padding: "13px 4px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${on ? "var(--accent)" : "var(--line-2)"}`,
                  background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--bg)",
                  color: on ? "var(--accent)" : "var(--mut)", transition: ".12s",
                }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{v}</span>
                <span style={{ fontSize: 9, textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.2 }}>{l}</span>
              </button>
            );
          })}
        </div>

        {/* Navegação */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            className="hx-btn hx-btn-ghost"
            style={{ padding: "7px 13px", fontSize: 12, opacity: i === 0 ? 0.4 : 1 }}
          >← Voltar</button>

          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>
            {ultima ? (
              <button onClick={finalizar} disabled={enviando} className="hx-btn hx-btn-primary" style={{ marginLeft: 0 }}>
                {enviando ? "Salvando…" : "Ver resultado →"}
              </button>
            ) : ans[i] !== null ? (
              <button onClick={() => setI(i + 1)} className="hx-btn hx-btn-ghost" style={{ fontSize: 12, padding: "7px 13px" }}>Próxima →</button>
            ) : "Tecle 1–5 para responder"}
          </span>
        </div>
      </div>

      <div style={{ padding: "9px 28px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--dim)", display: "flex", justifyContent: "space-between" }}>
        <span>Diagnóstico {tipo} de {nome}</span>
        <span>{respondidas}/{total} respondidas</span>
      </div>
    </div>
  );
}
