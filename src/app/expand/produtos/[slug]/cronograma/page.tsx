import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MESES, BASE_MENSAL } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

type Fase = { id: string; ordem: number; nome: string; janela: string | null; obj: string | null };

function janelaDias(j: string | null): { a: number; b: number } | null {
  if (!j) return null;
  const nums = [...j.matchAll(/D(\d+)/g)].map((m) => Number(m[1]));
  if (!nums.length) return null;
  const a = Math.min(...nums);
  let b = Math.max(...nums);
  if (/\+/.test(j)) b += 10;
  if (a === b) b = a + 1;
  return { a, b };
}

export default async function ProdutoCronograma({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: prod } = await supabase.from("products").select("name").eq("slug", slug).single();
  if (!prod) notFound();

  const { data: fData } = await supabase
    .from("expand_prod_fases")
    .select("*")
    .eq("produto_slug", slug)
    .order("ordem");
  const fases = (fData ?? []) as Fase[];
  const maxDia = Math.max(30, ...fases.map((f) => janelaDias(f.janela)?.b ?? 0));
  const isPide = slug === "pide";

  return (
    <>
      <div className="ex-grph"><span className="gt">Linha do tempo — fases do processo</span><span className="gl" /></div>

      {fases.length > 0 ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fases.map((f) => {
              const d = janelaDias(f.janela);
              return (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 12, minWidth: 0 }}>
                    <b style={{ color: "var(--accent)" }}>F{f.ordem}</b>{" "}{f.nome}
                    {f.obj && <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.obj}</div>}
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>{f.janela ?? "sem data fixa"}</div>
                  </div>
                  <div style={{ position: "relative", height: 26, background: "var(--panel-2)", borderRadius: 6, overflow: "hidden" }}>
                    {d ? (
                      <div
                        title={f.janela ?? ""}
                        style={{
                          position: "absolute",
                          left: `${(d.a / maxDia) * 100}%`,
                          width: `${Math.max(4, ((d.b - d.a) / maxDia) * 100)}%`,
                          top: 4, bottom: 4,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                          borderRadius: 4,
                        }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 4, borderRadius: 4, border: "1px dashed var(--line-2)", display: "grid", placeItems: "center", fontSize: 9.5, color: "var(--dim)" }}>
                        recorrente / sem data fixa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, marginTop: 8 }}>
            <span />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--dim)" }}>
              {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                <span key={r}>D{Math.round(maxDia * r)}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "20px 24px", marginBottom: 20, color: "var(--dim)", fontSize: 13 }}>
          Nenhuma fase cadastrada ainda. Acesse a aba <b>Processo</b> para criar as fases deste produto.
        </div>
      )}

      {isPide && (
        <>
          <div className="ex-grph" style={{ marginTop: 8 }}>
            <span className="gt">Pacote mensal — repete todo ciclo</span>
            <span className="gc">{BASE_MENSAL.length}</span>
            <span className="gl" />
          </div>
          <div className="hx-glass" style={{ borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 6 }}>
              {BASE_MENSAL.map((b) => (
                <div key={b} style={{ fontSize: 12.5, color: "var(--mut)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--accent)", fontSize: 16, lineHeight: 1 }}>·</span> {b}
                </div>
              ))}
            </div>
          </div>

          <div className="ex-grph" style={{ marginTop: 8 }}>
            <span className="gt">Marcos estratégicos — 12 meses do contrato PIDE</span>
            <span className="gl" />
          </div>
          <div className="ex-meses">
            {MESES.map((m) => (
              <div key={m.m} className="ex-mes hx-glass hx-glass-hover">
                <div className="mn">Mês {m.m}</div>
                <div className="mtit">{m.nm}</div>
                <div className="mfoco">{m.foco}</div>
                <span className="mmk">◆ {m.mk}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
