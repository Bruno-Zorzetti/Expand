"use client";
import { useState } from "react";

export function CopiarUrl({ url, label = "Copiar link" }: { url: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        readOnly
        value={url}
        onClick={e => (e.target as HTMLInputElement).select()}
        style={{
          flex: 1, minWidth: 200,
          background: "var(--panel-2)", border: "1px solid var(--line-2)",
          borderRadius: 8, color: "var(--txt)", padding: "7px 10px",
          fontSize: 11.5, fontFamily: "monospace", outline: "none",
        }}
      />
      <button
        type="button"
        onClick={copiar}
        style={{
          fontSize: 12, padding: "7px 14px", borderRadius: 8, flexShrink: 0,
          border: "1px solid var(--line-2)", cursor: "pointer",
          background: copiado ? "color-mix(in srgb, var(--green) 15%, transparent)" : "transparent",
          color: copiado ? "var(--green)" : "var(--dim)",
          transition: "all .2s",
        }}
      >
        {copiado ? "✓ Copiado" : label}
      </button>
    </div>
  );
}
