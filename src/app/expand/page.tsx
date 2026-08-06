import { createClient } from "@/lib/supabase/server";
import { derive, contasDe, type ClienteRow, type Derived } from "@/lib/expand";
import { getPessoa } from "@/lib/expand-user";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

function Bar({ v, cor }: { v: number | null; cor: string }) {
  if (v == null) return <span style={{ color: "var(--dim)" }}>—</span>;
  return (
    <span className="ex-bar">
      <i><b style={{ width: `${v * 10}%`, background: cor }} /></i>
      {v}
    </span>
  );
}

const URG: Record<string, { t: string; c: string }> = {
  critico: { t: "Resolver primeiro — conta em risco", c: "var(--red)" },
  atencao: { t: "Atenção — cliente com gargalo crítico", c: "var(--warn)" },
  normal: { t: "Fluxo normal", c: "var(--dim)" },
};

export default async function MeuDia() {
  const { pessoa } = await getPessoa();
  const supabase = await createClient();
  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true);
  const clientes = ((data ?? []) as ClienteRow[]).map(derive);
  const { minhas, esperando } = contasDe(pessoa.id, clientes);

  const crit = minhas.filter((c) => c.urgencia === "critico");
  const aten = minhas.filter((c) => c.urgencia === "atencao");
  const norm = minhas.filter((c) => c.urgencia === "normal");
  const churn = minhas.filter((c) => c.risco === "churn").length;
  const grupos: [string, Derived[]][] = [["critico", crit], ["atencao", aten], ["normal", norm]];

  return (
    <>
      <p className="hx-eyebrow">Terça · 28 de julho de 2026 · {pessoa.papel}</p>
      <h1 className="ex-h1">Bom dia, <span className="hx-accent-text">{pessoa.nome}</span></h1>
      <p className="ex-sub">
        Suas pendências de hoje na carteira, na ordem em que devem ser resolvidas. As contas em risco vêm primeiro.
      </p>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Pendências suas<span className="ex-help" title="Contas da carteira que estão na sua mão hoje — dependem de você. Sai do campo 'depende de quem' de cada conta, cruzado com o seu papel.">?</span></div><div className="val hx-accent-text">{minhas.length}</div><div className="foot">Contas na sua mão</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Em risco agora<span className="ex-help" title="Dessas, quantas estão críticas: risco de churn (gosta mas não executa) ou execução travada. Aparecem primeiro na lista.">?</span></div><div className="val" style={{ color: crit.length ? "var(--red)" : "var(--green)" }}>{crit.length}</div><div className="foot">Prioridade máxima</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Gargalo do cliente<span className="ex-help" title="Contas com um gargalo comportamental crítico no dossiê do cliente — exigem uma abordagem específica na conversa.">?</span></div><div className="val" style={{ color: aten.length ? "var(--warn)" : "var(--dim)" }}>{aten.length}</div><div className="foot">Exigem abordagem específica</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Esperando o cliente<span className="ex-help" title="Contas paradas aguardando o cliente (aprovar, enviar acesso, gravar). A cobrança é sua se você é PM ou CS.">?</span></div><div className="val">{esperando.length}</div><div className="foot">{esperando.length ? "Cobrança é sua" : "—"}</div></div>
      </div>

      <div className="ex-dash">
        <div>
          {minhas.length === 0 ? (
            <div className="hx-glass" style={{ padding: "20px 22px", color: "var(--mut)" }}>Nada atribuído a {pessoa.nome} hoje na carteira.</div>
          ) : null}
          {grupos.map(([q, arr]) =>
            arr.length === 0 ? null : (
              <div key={q}>
                <div className="ex-grph"><span className="gt" style={{ color: URG[q].c }}>{URG[q].t}</span><span className="gc">{arr.length}</span><span className="gl" /></div>
                {arr.map((c) => {
                  const dica = c.perfil?.resp ?? null;
                  return (
                    <div key={c.id} className="ex-tk hx-glass hx-glass-hover" style={{ ["--tc" as string]: URG[q].c }}>
                      <div className="tkc"><div className="tkcn">{c.nome}</div><div className="tkcm">{c.maturidade} · {c.segmento}</div></div>
                      <div className="tkm">
                        <div className="tkt">{c.pendencia}</div>
                        <div className="tkd">{dica ? <><b>Como falar</b><Ajuda t={AJUDA.comoFalar} />: {dica}</> : <b>Perfil comportamental ainda não mapeado.</b>}</div>
                      </div>
                      <div className="tkr">
                        Relação <Ajuda t={AJUDA.relacao} /> <Bar v={c.rel} cor="var(--green)" /><br />
                        Execução <Ajuda t={AJUDA.execucao} /> <Bar v={c.exec} cor={c.exec != null && c.exec <= 4 ? "var(--red)" : "var(--accent)"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          )}
        </div>

        <aside>
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Contas críticas</span><span className="pc">{crit.length}</span></div>
            <div className="pb">
              {crit.length ? crit.map((c) => (
                <div key={c.id} className="ex-mini"><span className="ml"><b>{c.nome}</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>{c.pendencia}</span></span><span className="mv" style={{ color: "var(--red)" }}>{c.exec ?? "—"}/10</span></div>
              )) : <span style={{ color: "var(--dim)", fontSize: 12 }}>Nenhuma conta crítica agora.</span>}
            </div>
          </div>
          {esperando.length ? (
            <div className="ex-panel hx-glass">
              <div className="ph"><span className="pt">Esperando o cliente</span><span className="pc">{esperando.length}</span></div>
              <div className="pb">
                {esperando.map((c) => (
                  <div key={c.id} className="ex-mini"><span className="ml"><b>{c.nome}</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>{c.pendencia}</span></span></div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Na sua mão, num olhar</span></div>
            <div className="pb">
              <div className="ex-mini"><span className="ml">Contas suas</span><span className="mv">{minhas.length}</span></div>
              <div className="ex-mini"><span className="ml">Em risco</span><span className="mv" style={{ color: crit.length ? "var(--red)" : "var(--green)" }}>{crit.length}</span></div>
              <div className="ex-mini"><span className="ml">Risco de churn</span><span className="mv" style={{ color: churn ? "var(--red)" : "var(--green)" }}>{churn}</span></div>
              <div className="ex-mini"><span className="ml">Esperando cliente</span><span className="mv">{esperando.length}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
