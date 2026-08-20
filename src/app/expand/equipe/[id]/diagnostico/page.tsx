import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
export const dynamic = "force-dynamic";

export default async function DiagnosticoHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("id, nome, disc_segmento, arquetipo_dominante, temperamento_dominante, temperamento_apoio").eq("id", id).single();
  if (!data) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = data as any as { id: string; nome: string; disc_segmento: string | null; arquetipo_dominante: string | null; temperamento_dominante: string | null; temperamento_apoio: string | null };

  const ehDono = me?.role === "admin" || (me?.expand_membro as string | null) === id;

  const diagnosticos = [
    {
      slug: "disc",
      nome: "DISC",
      descricao: "Como você age, decide e reage sob pressão. Revela seu perfil de dominância, influência, estabilidade e conformidade.",
      perguntas: 12,
      tempo: "~3 min",
      resultado: p.disc_segmento,
      resultadoLabel: p.disc_segmento ? `Perfil ${p.disc_segmento}` : null,
      cor: "#4F6BED",
      iconeName: "bolt",
    },
    {
      slug: "arquetipo",
      nome: "Arquétipo",
      descricao: "Quem você é por dentro. Identifica seu arquétipo dominante entre 12 perfis da metodologia Henrique Toledo.",
      perguntas: 48,
      tempo: "~12 min",
      resultado: p.arquetipo_dominante,
      resultadoLabel: p.arquetipo_dominante ? `Arquétipo: ${p.arquetipo_dominante.charAt(0).toUpperCase() + p.arquetipo_dominante.slice(1)}` : null,
      cor: "var(--accent)",
      iconeName: "compass",
    },
    {
      slug: "temperamento",
      nome: "Temperamentos",
      descricao: "Como você sente, reage e se relaciona. Baseado na tradição clássica dos 4 temperamentos aplicada ao contexto moderno.",
      perguntas: 32,
      tempo: "~8 min",
      resultado: p.temperamento_dominante,
      resultadoLabel: p.temperamento_dominante ? `${p.temperamento_dominante.charAt(0).toUpperCase() + p.temperamento_dominante.slice(1)}${p.temperamento_apoio ? ` / ${p.temperamento_apoio}` : ""}` : null,
      cor: "var(--green)",
      iconeName: "wave",
    },
  ];

  const total = diagnosticos.length;
  const feitos = diagnosticos.filter(d => d.resultado).length;

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>
      <p className="hx-eyebrow">Equipe · {p.nome}</p>
      <h1 className="ex-h1">Diagnósticos <span className="hx-accent-text">comportamentais</span></h1>
      <p className="ex-sub" style={{ maxWidth: 580, margin: "0 auto 10px", textAlign: "center" }}>
        3 diagnósticos independentes que juntos constroem um mapa completo de quem você é.
        Faça na ordem que quiser.
      </p>

      {/* Link público — para compartilhar sem exigir login */}
      {ehDono && (
        <div style={{ maxWidth: 580, margin: "0 auto 22px", padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--mut)", flex: 1 }}>
            Link público (sem login):
            <code style={{ marginLeft: 6, fontFamily: "monospace", fontSize: 11, color: "var(--accent)" }}>/expand/pub/diag/{id}</code>
          </span>
          <a
            href={`/expand/pub/diag/${id}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", textDecoration: "none", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
          >
            Abrir →
          </a>
        </div>
      )}

      {/* Progresso geral */}
      <div style={{ maxWidth: 580, margin: "0 auto 28px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, height: 6, background: "var(--panel-2)", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${(feitos / total) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--green))", borderRadius: 3, transition: ".4s" }} />
        </div>
        <span style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap" }}>{feitos} de {total} concluídos</span>
      </div>

      {/* Cards dos diagnósticos */}
      <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {diagnosticos.map((d) => (
          <div key={d.slug} className="hx-glass" style={{ borderRadius: 14, borderLeft: `3px solid ${d.cor}`, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                {/* Ícone */}
                <span className="hx-icon-tile" style={{ height: 44, width: 44, flexShrink: 0, ["--accent" as string]: d.cor, ["--accent-2" as string]: d.cor }}>
                  <Icon name={d.iconeName} size={20} className="hx-icon-glow" />
                </span>

                {/* Conteúdo */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{d.nome}</span>
                    {d.resultado ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `color-mix(in srgb, var(--green) 15%, transparent)`, color: "var(--green)", textTransform: "uppercase", letterSpacing: ".05em" }}>✓ Concluído</span>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "color-mix(in srgb, var(--dim) 12%, transparent)", color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em" }}>Pendente</span>
                    )}
                  </div>

                  {d.resultadoLabel && (
                    <div style={{ fontSize: 12, color: d.cor, fontWeight: 700, marginBottom: 6 }}>{d.resultadoLabel}</div>
                  )}

                  <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55, margin: "0 0 10px" }}>{d.descricao}</p>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>{d.perguntas} perguntas · {d.tempo}</span>
                    {ehDono && (
                      <Link
                        href={`/expand/equipe/${id}/diagnostico/${d.slug}`}
                        className="hx-btn hx-btn-primary"
                        style={{ padding: "6px 14px", fontSize: 12, marginLeft: "auto" }}
                      >
                        {d.resultado ? "Refazer →" : "Fazer agora →"}
                      </Link>
                    )}
                    {!ehDono && d.resultado && (
                      <Link
                        href={`/expand/equipe/${id}`}
                        className="hx-btn hx-btn-ghost"
                        style={{ padding: "6px 14px", fontSize: 12, marginLeft: "auto" }}
                      >
                        Ver resultado →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {feitos === total && (
        <div style={{ maxWidth: 580, margin: "20px auto 0", padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--green)", fontWeight: 700, margin: 0 }}>
            ✓ Todos os diagnósticos concluídos — veja seu perfil completo no painel
          </p>
          <Link href={`/expand/equipe/${id}`} className="hx-btn hx-btn-ghost" style={{ fontSize: 12, padding: "6px 14px", marginTop: 10, display: "inline-block" }}>Ver perfil completo →</Link>
        </div>
      )}
    </>
  );
}
