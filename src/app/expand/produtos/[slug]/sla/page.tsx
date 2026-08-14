import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RITUAIS, SEMAFORO, ESCAL } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

type Etapa = {
  id: string; ordem: number; titulo: string; area: string | null;
  responsavel: string | null; agente: string | null; sla: string | null;
  marco: boolean; fase_ordem: number;
};
type Fase = { ordem: number; nome: string };

export default async function ProdutoSLA({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: prod } = await supabase.from("products").select("name").eq("slug", slug).single();
  if (!prod) notFound();

  const [{ data: fData }, { data: eData }] = await Promise.all([
    supabase.from("expand_prod_fases").select("ordem, nome").eq("produto_slug", slug).order("ordem"),
    supabase.from("expand_prod_etapas")
      .select("id, ordem, titulo, area, responsavel, agente, sla, marco, fase_ordem")
      .eq("produto_slug", slug)
      .not("sla", "is", null)
      .order("ordem"),
  ]);

  const fases = (fData ?? []) as Fase[];
  const etapas = (eData ?? []) as Etapa[];
  const faseMap = new Map(fases.map((f) => [f.ordem, f.nome]));
  const isPide = slug === "pide";
  const comSLA = etapas.filter((e) => e.sla);
  const porFase = new Map<number, Etapa[]>();
  comSLA.forEach((e) => {
    const arr = porFase.get(e.fase_ordem) ?? [];
    arr.push(e);
    porFase.set(e.fase_ordem, arr);
  });
  const faseOrdens = [...new Set(comSLA.map((e) => e.fase_ordem))].sort((a, b) => a - b);

  return (
    <>
      <div className="ex-grph"><span className="gt">SLA por etapa</span><span className="gc">{comSLA.length}</span><span className="gl" /></div>

      {comSLA.length === 0 ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "20px 24px", color: "var(--dim)", fontSize: 13, marginBottom: 20 }}>
          Nenhuma etapa com SLA definido. Configure em{" "}
          <a href={`/expand/produtos/${slug}/processo`} style={{ color: "var(--accent)" }}>Processo</a>.
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {faseOrdens.map((fo) => (
            <div key={fo} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 6 }}>
                F{fo} · {faseMap.get(fo) ?? "Fase"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(porFase.get(fo) ?? []).map((e) => (
                  <div key={e.id} className="hx-glass" style={{ borderRadius: 10, padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)" }}>
                        {e.marco && <span style={{ color: "var(--accent)", marginRight: 5 }}>◆</span>}
                        {e.titulo}
                      </span>
                      {e.responsavel && (
                        <span style={{ fontSize: 11, color: "var(--dim)", marginLeft: 8 }}>{e.responsavel}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap" }}>{e.sla}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isPide && (
        <>
          <div className="ex-grph" style={{ marginTop: 8 }}><span className="gt">Semáforo de SLA — como lemos o prazo</span><span className="gl" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
            {SEMAFORO.map((s) => (
              <div key={s.h} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${s.c}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: s.c, marginBottom: 6 }}>{s.h}</div>
                <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>{s.p}</div>
              </div>
            ))}
          </div>

          <div className="ex-grph" style={{ marginTop: 8 }}><span className="gt">Rituais de gestão</span><span className="gl" /></div>
          <div className="hx-glass" style={{ borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {RITUAIS.cols.map((c) => (
                    <th key={c} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700, whiteSpace: "nowrap" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RITUAIS.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "9px 14px", color: j === 0 ? "var(--txt)" : "var(--mut)", fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ex-grph" style={{ marginTop: 8 }}><span className="gt">Escalonamento de problemas</span><span className="gl" /></div>
          <div className="hx-glass" style={{ borderRadius: 14, overflow: "auto", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {ESCAL.cols.map((c) => (
                    <th key={c} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700, whiteSpace: "nowrap" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ESCAL.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "9px 14px", color: j === 0 ? "var(--txt)" : "var(--mut)", fontWeight: j === 0 ? 600 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
