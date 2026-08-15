import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Membro = { id: string; nome: string; cargo: string; area: string | null; cor: string | null };

export default async function HumanosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, area, cor")
    .eq("tipo", "humano")
    .order("nome");
  const membros = (data ?? []) as Membro[];

  return (
    <>
      <p className="hx-eyebrow">Projetos · Equipe</p>
      <h1 className="ex-h1">Equipe <span className="hx-accent-text">Humana</span></h1>
      <p className="ex-sub">{membros.length} pessoas que movem a operação Expand.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16, marginTop: 28 }}>
        {membros.map((m) => (
          <Link key={m.id} href={`/expand/equipe/${m.id}`} style={{ textDecoration: "none" }}>
            <div
              className="hx-glass"
              style={{
                padding: "22px 18px", borderRadius: 16,
                borderTop: `3px solid ${m.cor ?? "var(--accent)"}`,
                cursor: "pointer", transition: "opacity .15s",
                display: "flex", flexDirection: "column", gap: 10, height: "100%",
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: m.cor ?? "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800, color: "#fff",
                flexShrink: 0,
              }}>
                {m.nome.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--txt)", marginBottom: 3 }}>{m.nome}</div>
                <div style={{ fontSize: 12, color: m.cor ?? "var(--accent)", fontWeight: 600, marginBottom: 2 }}>{m.cargo}</div>
                {m.area && <div style={{ fontSize: 11, color: "var(--dim)" }}>{m.area}</div>}
              </div>
              <div style={{ marginTop: "auto", fontSize: 11, color: "var(--dim)", display: "flex", alignItems: "center", gap: 4 }}>
                Ver perfil →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
