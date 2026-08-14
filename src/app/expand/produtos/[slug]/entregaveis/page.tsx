import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Etapa = {
  id: string; ordem: number; titulo: string; area: string | null;
  responsavel: string | null; agente: string | null; sla: string | null;
  criterio: string | null; marco: boolean; fase_ordem: number;
};
type Fase = { ordem: number; nome: string };

const AREA_COR: Record<string, string> = {
  estrategia: "#C89B5E", conteudo: "#5FA8D3", edicao: "#9B8AC4",
  trafego: "#68B893", analise: "#E08F6A", cliente: "#B5B5B5",
};

export default async function ProdutoEntregaveis({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: prod } = await supabase.from("products").select("name").eq("slug", slug).single();
  if (!prod) notFound();

  const [{ data: fData }, { data: eData }] = await Promise.all([
    supabase.from("expand_prod_fases").select("ordem, nome").eq("produto_slug", slug).order("ordem"),
    supabase.from("expand_prod_etapas")
      .select("id, ordem, titulo, area, responsavel, agente, sla, criterio, marco, fase_ordem")
      .eq("produto_slug", slug)
      .eq("visivel_cliente", true)
      .order("ordem"),
  ]);

  const fases = (fData ?? []) as Fase[];
  const etapas = (eData ?? []) as Etapa[];
  const faseMap = new Map(fases.map((f) => [f.ordem, f.nome]));
  const porFase = new Map<number, Etapa[]>();
  etapas.forEach((e) => {
    const arr = porFase.get(e.fase_ordem) ?? [];
    arr.push(e);
    porFase.set(e.fase_ordem, arr);
  });

  const faseOrdens = [...new Set(etapas.map((e) => e.fase_ordem))].sort((a, b) => a - b);

  if (etapas.length === 0) {
    return (
      <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", color: "var(--dim)", fontSize: 13 }}>
        Nenhuma etapa marcada como <b>visível ao cliente</b> neste produto. Configure em{" "}
        <a href={`/expand/produtos/${slug}/processo`} style={{ color: "var(--accent)" }}>Processo</a>.
      </div>
    );
  }

  return (
    <>
      <div className="ex-grph">
        <span className="gt">Entregáveis visíveis ao cliente</span>
        <span className="gc">{etapas.length}</span>
        <span className="gl" />
      </div>
      <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, marginTop: -4 }}>
        Estas são as etapas que o cliente acompanha no portal. Os marcos estratégicos estão marcados com ◆.
      </p>

      {faseOrdens.map((fo) => {
        const grupo = porFase.get(fo) ?? [];
        return (
          <div key={fo} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 8 }}>
              F{fo} · {faseMap.get(fo) ?? "Fase"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {grupo.map((e) => (
                <div key={e.id} className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderLeft: `3px solid ${AREA_COR[e.area ?? ""] ?? "var(--line-2)"}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>
                      {e.marco && <span style={{ color: "var(--accent)", marginRight: 6 }}>◆</span>}
                      {e.titulo}
                    </div>
                    {e.criterio && (
                      <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 3 }}>{e.criterio}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {e.area && (
                      <span className="ex-pill" style={{ color: AREA_COR[e.area] ?? "var(--dim)" }}>{e.area}</span>
                    )}
                    {e.sla && (
                      <span className="ex-pill" style={{ color: "var(--mut)" }}>SLA {e.sla}</span>
                    )}
                    {e.agente && (
                      <span className="ex-pill" style={{ color: "#5FA8D3" }}>IA</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
