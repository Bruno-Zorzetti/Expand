import { createClient } from "@/lib/supabase/server";
import { derive, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";

export const dynamic = "force-dynamic";

const RISCO_COR: Record<string, string> = {
  churn: "var(--red)", execucao: "var(--warn)", relacao: "var(--warn)", ok: "var(--green)",
};
const PASSO_ST = ["pendente", "feito", "em preparação"];
const PASSO_BG = ["var(--panel-2)", "var(--green)", "color-mix(in srgb, var(--accent) 30%, transparent)"];
const PASSO_IC = ["○", "✓", "◐"];

export default async function Perfis() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true).order("nome");
  const clientes = ((data ?? []) as ClienteRow[]).map(derive);

  return (
    <>
      <p className="hx-eyebrow">Dossiê comportamental</p>
      <h1 className="ex-h1">Perfis de <span className="hx-accent-text">Cliente</span></h1>
      <p className="ex-sub">Como cada pessoa responde, o que trava, o que já foi feito e o que fazer a seguir. Consulte antes de abrir a conversa — é o que separa uma cobrança que funciona de uma que queima a relação.</p>

      <div className="ex-cards">
        {clientes.map((c) => {
          const p = c.perfil;
          const temDossie = p && p.temp;
          return (
            <div key={c.id} className="ex-cc hx-glass">
              <div className="ex-cch">
                <div className="ex-cci" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>{c.nome[0]}</div>
                <div style={{ flex: 1 }}><div className="ex-ccn">{c.nome}</div><div className="ex-ccs">{c.segmento} · {c.maturidade}</div></div>
                <span className="ex-pill" style={{ background: `color-mix(in srgb, ${RISCO_COR[c.risco]} 16%, transparent)`, color: RISCO_COR[c.risco] }}><i className="ex-dot" />{RISCO_ROTULO[c.risco]}</span>
              </div>
              <div className="ex-ccb" style={{ gap: 0 }}>
                {temDossie ? (
                  <>
                    <div className="ex-grp" style={{ paddingTop: 0 }}><div className="gh">Temperamento</div><div className="gtx">{p!.temp}</div></div>
                    <div className="ex-grp"><div className="gh">Objetivo do cliente</div><div className="gtx">{p!.obj}</div></div>
                    <div className="ex-grp"><div className="gh">Situação atual</div><div className="gtx">{p!.sit}</div></div>
                    {p!.garg ? (
                      <div className="ex-grp"><div className="gh" style={{ color: p!.crit ? "var(--red)" : "var(--dim)" }}>Gargalo{p!.crit ? " — crítico" : ""}</div><div className="gtx" style={{ color: p!.crit ? "var(--txt)" : "var(--mut)" }}>{p!.garg}</div></div>
                    ) : null}
                    {p!.passos && p!.passos.length ? (
                      <div className="ex-grp"><div className="gh">Próximos passos</div>
                        {p!.passos.map((s, i) => (
                          <div key={i} className="ex-passo">
                            <span className="pb" style={{ background: PASSO_BG[s[1]] ?? "var(--panel-2)", color: s[1] === 1 ? "#0A1512" : "var(--accent)" }}>{PASSO_IC[s[1]] ?? "○"}</span>
                            <span style={{ color: s[1] === 1 ? "var(--mut)" : "var(--txt)" }}>{s[0]} <span style={{ color: "var(--dim)", fontSize: 11 }}>· {PASSO_ST[s[1]] ?? ""}</span></span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="ex-grp"><div className="gh" style={{ color: "var(--accent)" }}>Como falar com ele</div><div className="gtx" style={{ color: "var(--txt)" }}>{p!.resp}</div></div>
                  </>
                ) : (
                  <div className="ex-grp" style={{ paddingTop: 0 }}><div className="gh" style={{ color: "var(--warn)" }}>Perfil não mapeado</div><div className="gtx">{p?.alerta ?? "Sem dossiê comportamental. Vale mapear antes que vire ponto cego."}</div></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
