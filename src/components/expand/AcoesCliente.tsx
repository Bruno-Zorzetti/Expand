"use client";

import { useState } from "react";

// Ações principais do cliente sempre ao alcance (Lei de Fitts): falar com a equipe
// no grupo oficial de WhatsApp e solicitar uma nova demanda.
export default function AcoesCliente({
  clienteId,
  grupoLink,
  solicitar,
}: {
  clienteId: string;
  grupoLink: string | null;
  solicitar: (fd: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);

  const fab: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9, padding: "13px 20px", borderRadius: 999,
    fontSize: 13.5, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 12px 30px -10px rgba(0,0,0,.6)", textDecoration: "none",
  };

  return (
    <>
      <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
        {grupoLink ? (
          <a href={grupoLink} target="_blank" rel="noreferrer" style={{ ...fab, background: "var(--panel)", color: "var(--txt)", border: "1px solid var(--line-2)" }}>
            <span style={{ fontSize: 16 }}>💬</span> Falar com a equipe
          </a>
        ) : null}
        <button onClick={() => setAberto(true)} style={{ ...fab, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#0A1512" }}>
          <span style={{ fontSize: 17 }}>＋</span> Solicitar demanda
        </button>
      </div>

      {aberto && (
        <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(4,10,8,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="hx-glass" style={{ width: "min(520px,94vw)", borderRadius: 18, padding: 24, background: "var(--panel)", position: "relative" }}>
            <button onClick={() => setAberto(false)} aria-label="Fechar" style={{ position: "absolute", top: 12, right: 15, background: "transparent", border: "none", color: "var(--mut)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Solicitar uma nova demanda</p>
            <p style={{ fontSize: 12.5, color: "var(--mut)", margin: "0 0 16px", lineHeight: 1.5 }}>Precisa de algo novo? Registre aqui que a equipe recebe na hora e retorna com prazo.</p>
            <form action={solicitar} style={{ display: "grid", gap: 12 }}>
              <input type="hidden" name="clienteId" value={clienteId} />
              <label>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 5 }}>O que você precisa</span>
                <input name="titulo" required placeholder="ex.: Um vídeo extra para a campanha de junho" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 9, color: "var(--txt)", padding: "11px 13px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              </label>
              <label>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 5 }}>Detalhes (opcional)</span>
                <textarea name="desc" rows={3} placeholder="contexto, prazo desejado, referências…" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 9, color: "var(--txt)", padding: "11px 13px", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
              </label>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ justifyContent: "center" }}>Enviar demanda</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
