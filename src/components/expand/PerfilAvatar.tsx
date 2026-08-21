import type { Perfil } from "@/lib/expand-perfis";

// Ícone de robô para agentes de IA (sobre o gradiente da cor do agente).
export function BotIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0A1512" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="8" width="15" height="11" rx="3.5" />
      <path d="M12 8V4.6" /><circle cx="12" cy="3.4" r="1.15" fill="#0A1512" stroke="none" />
      <circle cx="9.4" cy="13" r="1.35" fill="#0A1512" stroke="none" />
      <circle cx="14.6" cy="13" r="1.35" fill="#0A1512" stroke="none" />
      <path d="M9.5 16.3h5" /><path d="M2.6 12v3M21.4 12v3" />
    </svg>
  );
}

export default function PerfilAvatar({ p, size, radius }: { p: Pick<Perfil, "foto_url" | "cor" | "tipo" | "nome">; size: number; radius: number }) {
  const cor = p.cor ?? "var(--accent)";
  // Fotos são sempre quadradas (borderRadius pequeno), independente do radius passado.
  const photoRadius = Math.min(radius, 8);
  const st: React.CSSProperties = {
    width: size, height: size, borderRadius: photoRadius, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontFamily: "var(--font-cinzel), serif", fontWeight: 700, color: "#0A1512", fontSize: size * 0.42, position: "relative",
  };
  if (p.foto_url) {
    return (
      <div style={st}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {p.tipo === "agente" ? (
          <span style={{ position: "absolute", right: 1, bottom: 1, width: Math.max(14, size * 0.34), height: Math.max(14, size * 0.34), borderRadius: "50%", background: cor, display: "grid", placeItems: "center", border: "1.5px solid var(--panel)" }}>
            <BotIcon size={Math.max(9, size * 0.22)} />
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div style={{ ...st, background: `linear-gradient(135deg, ${cor}, color-mix(in srgb, ${cor} 55%, #8a6a2f))` }}>
      {p.tipo === "agente" ? <BotIcon size={size * 0.58} /> : p.nome[0]}
    </div>
  );
}
