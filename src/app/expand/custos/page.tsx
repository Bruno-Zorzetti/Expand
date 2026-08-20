import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

type Membro = {
  id: string;
  nome: string;
  papel: string | null;
  custo_hora: number | null;
  horas_semana: number | null;
  tipo_contrato: string | null;
};

async function salvarCusto(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const v = (k: string) => { const s = String(formData.get(k) ?? "").trim(); return s ? Number(s) : null; };
  const t = (k: string) => String(formData.get(k) ?? "").trim() || null;

  await supabase.from("expand_equipe").update({
    custo_hora:     v("custo_hora"),
    horas_semana:   v("horas_semana"),
    tipo_contrato:  t("tipo_contrato"),
  }).eq("id", id);

  revalidatePath("/expand/custos");
}

function brl(n: number | null) {
  if (n == null) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CustosPage() {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("expand_equipe")
    .select("id, nome, papel, custo_hora, horas_semana, tipo_contrato")
    .order("ordem");
  const membros = (data ?? []) as Membro[];

  return (
    <>
      <p className="hx-eyebrow">Configurações · Admin</p>
      <h1 className="ex-h1">Custos da Equipe</h1>
      <p className="ex-sub">
        Taxa/hora de cada membro para o cálculo de custo real por tarefa.
        Visível somente para admin — a equipe nunca vê esses valores.
      </p>

      <div style={{
        marginTop: 24, background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: 14, padding: "12px 16px",
        fontSize: 12, color: "var(--warn)", display: "flex", gap: 10, alignItems: "flex-start",
        lineHeight: 1.6, marginBottom: 24,
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
        <span>
          <b>Sensível.</b> O custo/hora é usado para calcular quanto custa cada tarefa por pessoa.
          Como PMO, use isso para identificar quem executa determinada demanda com menor custo
          e alocar nos próximos projetos. Nunca compartilhar com a equipe — pode gerar conflito.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {membros.map((m) => {
          const custoSemana = m.custo_hora && m.horas_semana ? m.custo_hora * m.horas_semana : null;
          const custoMes    = custoSemana ? custoSemana * 4.33 : null;
          return (
            <div key={m.id} style={{
              background: "var(--panel-2)", border: "1px solid var(--line)",
              borderRadius: 12, overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid var(--line)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "color-mix(in srgb, var(--accent) 20%, var(--panel-2))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "var(--accent)", flexShrink: 0,
                }}>
                  {m.nome.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nome}</div>
                  {m.papel && <div style={{ fontSize: 11, color: "var(--dim)" }}>{m.papel}</div>}
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  {m.custo_hora != null
                    ? <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{brl(m.custo_hora)}/h</div>
                    : <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>taxa não configurada</div>
                  }
                  {custoMes != null && (
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>≈ {brl(custoMes)}/mês</div>
                  )}
                </div>
              </div>

              <form action={salvarCusto} style={{ padding: "14px 16px" }}>
                <input type="hidden" name="id" value={m.id} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
                      Custo / hora (R$)
                    </span>
                    <input
                      name="custo_hora" type="number" step="0.01" min="0"
                      defaultValue={m.custo_hora ?? undefined}
                      placeholder="ex: 35.00"
                      style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit", width: "100%" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
                      Horas / semana
                    </span>
                    <input
                      name="horas_semana" type="number" step="0.5" min="0"
                      defaultValue={m.horas_semana ?? undefined}
                      placeholder="ex: 20"
                      style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit", width: "100%" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
                      Tipo de contrato
                    </span>
                    <select
                      name="tipo_contrato"
                      defaultValue={m.tipo_contrato ?? ""}
                      style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit", width: "100%" }}
                    >
                      <option value="">—</option>
                      <option value="pj">PJ</option>
                      <option value="clt">CLT</option>
                      <option value="freela">Freela</option>
                      <option value="socio">Sócio</option>
                      <option value="estagio">Estágio</option>
                    </select>
                  </label>

                  <button type="submit" style={{
                    background: "none", border: "1px solid var(--accent)", color: "var(--accent)",
                    borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          );
        })}
      </div>

      {membros.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--dim)" }}>
          Nenhum membro em expand_equipe.
        </div>
      )}
    </>
  );
}
