import type { Perfil } from "@/lib/expand-perfis";

export default function PerfilAvatar({ p, size, radius }: { p: Pick<Perfil, "foto_url" | "cor" | "tipo" | "nome">; size: number; radius: number }) {
  const st: React.CSSProperties = {
    width: size, height: size, borderRadius: radius, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontFamily: "var(--font-cinzel), serif", fontWeight: 700, color: "#0A1512", fontSize: size * 0.42,
  };
  if (p.foto_url) {
    return (
      <div style={st}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ ...st, background: `linear-gradient(135deg, ${p.cor}, color-mix(in srgb, ${p.cor} 55%, #8a6a2f))` }}>
      {p.tipo === "agente" ? "⚡" : p.nome[0]}
    </div>
  );
}
