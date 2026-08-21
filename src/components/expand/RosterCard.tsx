"use client";

export function openAgentChat(id: string, nome: string, cor: string, tipo: "agente" | "humano") {
  window.dispatchEvent(new CustomEvent("expand:chat", { detail: { id, nome, cor, tipo } }));
}

export default function RosterCard({
  id, nome, tipo, run, open, isAi,
}: {
  id: string; nome: string; tipo: "agente" | "humano"; run: number; open: number; isAi: boolean;
}) {
  const cor = isAi ? "var(--accent)" : "var(--green)";

  function handleClick() {
    openAgentChat(id, nome, cor, tipo);
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        padding: "5px 8px", borderRadius: 8, textAlign: "left",
        transition: "background .12s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
      title={`Abrir chat com ${nome}`}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isAi
          ? "color-mix(in srgb, var(--accent) 20%, transparent)"
          : "color-mix(in srgb, var(--green) 20%, transparent)",
        border: `1.5px solid ${cor}`,
        display: "grid", placeItems: "center",
        fontSize: 11, fontWeight: 800, color: cor,
      }}>
        {nome[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {nome}
        </div>
        <div style={{ fontSize: 10, color: "var(--dim)" }}>
          {run > 0 ? `${run} em execução` : `${open} pendente${open !== 1 ? "s" : ""}`}
        </div>
      </div>
      {run > 0 && (
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)", flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 10, color: "var(--dim)", opacity: 0.6, flexShrink: 0 }}>chat →</span>
    </button>
  );
}
