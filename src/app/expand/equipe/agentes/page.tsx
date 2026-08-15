import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Agente = { id: string; nome: string; cargo: string; area: string | null; cor: string | null };

export default async function AgentesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, area, cor")
    .eq("tipo", "agente")
    .order("area")
    .order("nome");
  const agentes = (data ?? []) as Agente[];

  const porArea: Record<string, Agente[]> = {};
  for (const a of agentes) {
    const k = a.area ?? "Geral";
    (porArea[k] ??= []).push(a);
  }

  return (
    <>
      <p className="hx-eyebrow">Projetos · Equipe</p>
      <h1 className="ex-h1">Agentes <span className="hx-accent-text">de IA</span></h1>
      <p className="ex-sub">{agentes.length} agentes especializados trabalhando na operação.</p>

      {Object.entries(porArea)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, ags]) => (
          <div key={area} style={{ marginBottom: 32 }}>
            <div className="ex-grph">
              <span className="gt">{area}</span>
              <span className="gc">{ags.length}</span>
              <span className="gl" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
              {ags.map((a) => (
                <Link key={a.id} href={`/expand/equipe/${a.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="hx-glass"
                    style={{
                      padding: "14px 14px", borderRadius: 12,
                      borderLeft: `3px solid ${a.cor ?? "var(--accent)"}`,
                      cursor: "pointer", transition: "opacity .15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: a.cor ?? "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>
                        {a.nome.charAt(0)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", lineHeight: 1.2 }}>{a.nome}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.45, paddingLeft: 42 }}>{a.cargo}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </>
  );
}
