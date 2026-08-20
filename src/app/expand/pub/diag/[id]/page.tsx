import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const DIAGS = [
  {
    slug: "disc",
    nome: "DISC",
    descricao: "Perfil comportamental — dominância, influência, estabilidade, conformidade.",
    perguntas: 12, tempo: "~3 min",
    cor: "#4F6BED", iconeName: "bolt",
    campo: "disc_segmento",
  },
  {
    slug: "arquetipo",
    nome: "Arquétipo",
    descricao: "Identifica seu arquétipo dominante entre 12 perfis da metodologia Expand.",
    perguntas: 48, tempo: "~12 min",
    cor: "var(--accent)", iconeName: "compass",
    campo: "arquetipo_dominante",
  },
  {
    slug: "temperamento",
    nome: "Temperamentos",
    descricao: "Como você sente, reage e se relaciona. 4 temperamentos clássicos.",
    perguntas: 32, tempo: "~8 min",
    cor: "var(--green)", iconeName: "wave",
    campo: "temperamento_dominante",
  },
];

export default async function PublicDiagHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data } = await sb
    .from("expand_perfis")
    .select("id, nome, disc_segmento, arquetipo_dominante, temperamento_dominante")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const p = data as { id: string; nome: string; disc_segmento: string | null; arquetipo_dominante: string | null; temperamento_dominante: string | null };
  const resultados: Record<string, string | null> = {
    disc: p.disc_segmento,
    arquetipo: p.arquetipo_dominante,
    temperamento: p.temperamento_dominante,
  };

  const feitos = DIAGS.filter(d => resultados[d.slug]).length;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--txt)", padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--accent)", marginBottom: 8 }}>Diagnóstico comportamental</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px" }}>{p.nome}</h1>
        <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 24 }}>
          3 diagnósticos independentes que constroem um mapa completo do seu perfil.
        </p>

        {/* Progresso */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 5, background: "var(--panel-2)", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${(feitos / 3) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--green))", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap" }}>{feitos} de 3 concluídos</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DIAGS.map((d) => {
            const feito = Boolean(resultados[d.slug]);
            return (
              <div key={d.slug} style={{ background: "color-mix(in srgb, var(--txt) 4%, transparent)", border: `1px solid color-mix(in srgb, ${d.cor} 25%, var(--line))`, borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span style={{ height: 44, width: 44, flexShrink: 0, borderRadius: 12, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${d.cor} 15%, transparent)`, color: d.cor }}>
                    <Icon name={d.iconeName} size={20} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{d.nome}</span>
                      {feito
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "color-mix(in srgb, var(--green) 15%, transparent)", color: "var(--green)", textTransform: "uppercase" }}>✓ Feito</span>
                        : <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "color-mix(in srgb, var(--dim) 12%, transparent)", color: "var(--dim)", textTransform: "uppercase" }}>Pendente</span>
                      }
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--mut)", margin: "0 0 10px", lineHeight: 1.55 }}>{d.descricao}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "var(--dim)" }}>{d.perguntas} perguntas · {d.tempo}</span>
                      <Link
                        href={`/expand/pub/diag/${id}/${d.slug}`}
                        style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: feito ? "transparent" : `color-mix(in srgb, ${d.cor} 18%, transparent)`, color: d.cor, border: `1px solid color-mix(in srgb, ${d.cor} 35%, transparent)`, textDecoration: "none" }}
                      >
                        {feito ? "Refazer →" : "Começar →"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {feitos === 3 && (
          <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--green)", fontWeight: 700, margin: 0 }}>✓ Todos os diagnósticos concluídos!</p>
          </div>
        )}
      </div>
    </main>
  );
}
