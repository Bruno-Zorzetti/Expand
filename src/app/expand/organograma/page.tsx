import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

// Estrelas de avaliação (nota 0–10 → 5 estrelas, com fração).
function Stars({ nota }: { nota: number | null }) {
  const v = Math.max(0, Math.min(5, (nota ?? 0) / 2));
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }} title={nota != null ? `Nota ${nota}` : "Sem avaliação"}>
      {[0, 1, 2, 3, 4].map((i) => {
        const f = Math.max(0, Math.min(1, v - i));
        return (
          <span key={i} style={{ position: "relative", width: 13, height: 13, lineHeight: "13px", fontSize: 13 }}>
            <span style={{ position: "absolute", inset: 0, color: "var(--line-2)" }}>★</span>
            <span style={{ position: "absolute", inset: 0, color: "var(--accent)", width: `${f * 100}%`, overflow: "hidden" }}>★</span>
          </span>
        );
      })}
      <span style={{ fontSize: 10.5, color: "var(--dim)", marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>{nota != null ? nota.toFixed(1) : "—"}</span>
    </span>
  );
}

function No({ p, byPai, nivel = 0 }: { p: Perfil; byPai: Map<string, Perfil[]>; nivel?: number }) {
  const kids = byPai.get(p.id) ?? [];
  const cor = p.cor ?? "var(--accent)";
  const ehAgente = p.tipo === "agente";
  return (
    <div>
      <div className="hx-glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, borderLeft: `3px solid ${cor}`, marginBottom: 8 }}>
        <Link href={`/expand/equipe/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
          <PerfilAvatar p={p} size={46} radius={13} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{p.nome}</span>
              {nivel === 0 ? <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", background: "var(--accent)", color: "#0A1512", borderRadius: 20, padding: "1px 7px" }}>Diretoria</span> : null}
              {ehAgente ? <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", border: `1px solid ${cor}`, color: cor, borderRadius: 20, padding: "1px 7px" }}>IA</span> : null}
            </div>
            <div style={{ fontSize: 12, color: "var(--mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.cargo}{p.area ? ` · ${p.area}` : ""}</div>
            <div style={{ marginTop: 3 }}><Stars nota={p.nota} /></div>
          </div>
        </Link>
        <Link href={`/expand/equipe/${p.id}/editar`} className="hx-btn hx-btn-ghost" style={{ padding: "5px 11px", fontSize: 11.5, flexShrink: 0 }}>Editar</Link>
      </div>
      {kids.length ? (
        <div style={{ marginLeft: 23, borderLeft: "1px solid var(--line)", paddingLeft: 16 }}>
          {kids.map((k) => <No key={k.id} p={k} byPai={byPai} nivel={nivel + 1} />)}
        </div>
      ) : null}
    </div>
  );
}

export default async function Organograma() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_perfis").select("*").order("ordem");
  const perfis = (data ?? []) as Perfil[];

  const byPai = new Map<string, Perfil[]>();
  perfis.forEach((p) => { const s = p.superior ?? "__root__"; const arr = byPai.get(s) ?? []; arr.push(p); byPai.set(s, arr); });
  const roots = byPai.get("__root__") ?? [];
  const humanos = perfis.filter((p) => p.tipo !== "agente").length;
  const agentes = perfis.length - humanos;

  return (
    <>
      <p className="hx-eyebrow">Estrutura do time</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Organograma</span></h1>
      <p className="ex-sub">Quem responde a quem — humanos e agentes de IA, um time só, com foto, cargo e a avaliação em estrelas. Clique num card para ver o perfil; use <b>Editar</b> para mudar cargo, superior e chapéus. Reorganize e meça resultado com o tempo.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div className="hx-glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", fontSize: 16 }}>◈</div>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>Time único</div><div style={{ fontSize: 11.5, color: "var(--mut)" }}>{humanos} humanos · {agentes} agentes de IA</div></div>
        </div>
        <Link href="/expand/squads" className="hx-glass hx-glass-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent-2) 18%, transparent)", color: "var(--accent-2)", fontSize: 16 }}>◇</div>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>Squads por projeto ↗</div><div style={{ fontSize: 11.5, color: "var(--mut)" }}>Arranjo diferente por conta</div></div>
        </Link>
      </div>

      <div style={{ maxWidth: 720 }}>
        {roots.map((r) => <No key={r.id} p={r} byPai={byPai} />)}
      </div>
    </>
  );
}
