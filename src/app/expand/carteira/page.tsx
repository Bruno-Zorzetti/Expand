import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

const RISCO_COR: Record<string, string> = {
  churn: "var(--red)", execucao: "var(--warn)", relacao: "var(--warn)", ok: "var(--green)",
};

export default async function Carteira() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true).order("nome");
  const clientes = ((data ?? []) as ClienteRow[]).map(derive);

  const relMed = (clientes.reduce((a, c) => a + (c.rel ?? 0), 0) / (clientes.length || 1)).toFixed(1);
  const comExec = clientes.filter((c) => c.exec != null);
  const execMed = (comExec.reduce((a, c) => a + (c.exec ?? 0), 0) / (comExec.length || 1)).toFixed(1);
  const churn = clientes.filter((c) => c.risco === "churn").length;
  const porMat = (m: string) => clientes.filter((c) => c.maturidade === m).length;

  return (
    <>
      <p className="hx-eyebrow">Visão geral</p>
      <h1 className="ex-h1">A <span className="hx-accent-text">Carteira</span></h1>
      <p className="ex-sub">Todas as contas ativas e onde cada uma está na jornada. Cada conta corre no próprio calendário.</p>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Contas ativas</div><div className="val">{clientes.length}</div><div className="foot">{porMat("Estruturação")} Estrut · {porMat("Validação")} Valid · {porMat("Otimização")} Otim</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Relacionamento médio<Ajuda t={AJUDA.relacao} /></div><div className="val" style={{ color: "var(--green)" }}>{relMed}</div><div className="foot">Health da planilha</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Execução média<Ajuda t={AJUDA.execucao} /></div><div className="val hx-accent-text">{execMed}</div><div className="foot">Derivada do dossiê de CS</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Risco de churn oculto<Ajuda t={AJUDA.churn} /></div><div className="val" style={{ color: churn ? "var(--red)" : "var(--green)" }}>{churn}</div><div className="foot">Relação alta, execução baixa</div></div>
      </div>

      <div className="ex-cards">
        {clientes.map((c) => (
          <div key={c.id} className="ex-cc hx-glass hx-glass-hover">
            <div className="ex-cch">
              <div className="ex-cci" style={{ background: `color-mix(in srgb, ${MAT_COR[c.maturidade ?? ""] ?? "var(--accent)"} 18%, transparent)`, color: MAT_COR[c.maturidade ?? ""] ?? "var(--accent)" }}>{c.nome[0]}</div>
              <div style={{ flex: 1 }}><div className="ex-ccn">{c.nome}</div><div className="ex-ccs">{c.segmento}</div></div>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${RISCO_COR[c.risco]} 16%, transparent)`, color: RISCO_COR[c.risco] }}><i className="ex-dot" />{c.risco === "ok" ? c.maturidade : RISCO_ROTULO[c.risco]}</span>
            </div>
            <div className="ex-ccb">
              <div className="ex-ccrow"><span className="k">Contrato</span><span className="v">{c.contrato_tipo ?? "—"}{c.contrato_dur ? ` · ${c.contrato_dur} meses` : ""}</span></div>
              <div className="ex-ccrow"><span className="k">Relação / Execução <Ajuda t={AJUDA.execucao} /></span><span className="v">{c.rel ?? "—"} / <span style={{ color: c.exec != null && c.exec <= 4 ? "var(--red)" : "var(--txt)" }}>{c.exec ?? "—"}</span></span></div>
              <div className="ex-ccrow"><span className="k">Pendência hoje</span><span className="v">{c.pendencia}</span></div>
              <div className="ex-ccrow"><span className="k">Depende de</span><span className="v">{c.depende_de}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
