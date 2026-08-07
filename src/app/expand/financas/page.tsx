import { createClient } from "@/lib/supabase/server";
import { PADRAO, type Plano } from "@/lib/expand-comercial-game";

export const dynamic = "force-dynamic";

const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
const brlk = (n: number) => n >= 1_000_000 ? "R$ " + (n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "M" : "R$ " + Math.round(n / 1000) + "k";

// Premissas do dossiê no baseline (MRR R$ 52 mil). Escalam com o MRR real da config comercial.
const BASE_MRR = 52000;
const CUSTOS = [
  { nome: "Equipe (humanos + freelas)", base: 26000, tag: "56%" },
  { nome: "Ferramentas + IA (infra, API, uazapi)", base: 2800, tag: "6%" },
  { nome: "Comercial (tráfego próprio, ferramentas)", base: 3000, tag: "6%" },
  { nome: "Overhead (admin, contábil)", base: 2500, tag: "5%" },
];

export default async function Financas() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((data?.plano as Partial<Plano>) ?? {}) } as Plano;

  const mrr = plano.carteiraMRR || BASE_MRR;
  const fator = mrr / BASE_MRR;
  const imposto = mrr * 0.1;
  const recLiq = mrr - imposto;
  const custos = CUSTOS.map((c) => ({ ...c, valor: c.base * fator }));
  const totalCusto = custos.reduce((s, c) => s + c.valor, 0);
  const ebitda = recLiq - totalCusto;
  const margem = recLiq > 0 ? Math.round((ebitda / recLiq) * 100) : 0;
  const pct = (v: number) => recLiq > 0 ? Math.round((v / recLiq) * 100) + "%" : "—";

  const arr = mrr * 12;
  const ebitdaAno = ebitda * 12;
  const arrProj = arr + plano.metaACV * 0.85; // meta batida, retenção ~90%

  const metodos = [
    { nome: "Agência tradicional (receita)", mult: "0,8–1,5× ARR", lo: arr * 0.8, hi: arr * 1.5 },
    { nome: `Resultado (EBITDA ~${brlk(ebitdaAno)}/ano)`, mult: "3–5× EBITDA", lo: ebitdaAno * 3, hi: ebitdaAno * 5 },
    { nome: "Tech-enabled c/ plataforma e IP", mult: "2–3× ARR", lo: arr * 2, hi: arr * 3, dest: true },
  ];

  return (
    <>
      <p className="hx-eyebrow">Finanças · agente financeiro</p>
      <h1 className="ex-h1">Mini DRE e <span className="hx-accent-text">valuation</span></h1>
      <p className="ex-sub">
        Leitura do agente de finanças, viva sobre a carteira. Os custos são premissas ancoradas no que o sistema já tem
        — carteira de <b style={{ color: "var(--txt)" }}>{brl(mrr)}/mês</b> de MRR e meta de <b style={{ color: "var(--txt)" }}>{brl(plano.metaACV)}</b> em novos contratos.
        Mude o MRR ou a meta na <a href="/expand/comercial/meta" style={{ color: "var(--accent)", textDecoration: "none" }}>calculadora comercial</a> e este painel recalcula. Nada aqui é dado fechado — é modelo.
      </p>

      {/* KPIs */}
      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">MRR (carteira)</div><div className="val hx-accent-text">{brlk(mrr)}</div><div className="foot">Recorrência mensal</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">EBITDA / mês</div><div className="val">{brlk(ebitda)}</div><div className="foot">Margem {margem}%</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">ARR atual</div><div className="val">{brlk(arr)}</div><div className="foot">MRR × 12</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Valuation tech-enabled</div><div className="val" style={{ fontSize: 16 }}>{brlk(arr * 2)}–{brlk(arr * 3)}</div><div className="foot">2–3× ARR</div></div>
      </div>

      {/* DRE */}
      <div className="ex-grph" style={{ marginTop: 20 }}><span className="gt">Mini DRE · mês</span><span className="gc">premissa</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <th style={{ padding: "10px 16px", fontWeight: 600 }}>Linha</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>Valor</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>% rec. líq.</th>
            </tr>
          </thead>
          <tbody>
            <Row nome="Receita bruta (MRR da carteira)" valor={brl(mrr)} pct="—" />
            <Row nome="Impostos (Simples ~10%)" valor={"− " + brl(imposto)} pct="—" neg />
            <Row nome="Receita líquida" valor={brl(recLiq)} pct="100%" total />
            {custos.map((c) => <Row key={c.nome} nome={c.nome} valor={"− " + brl(c.valor)} pct={pct(c.valor)} neg />)}
            <Row nome="EBITDA (resultado operacional)" valor={brl(ebitda)} pct={margem + "%"} total pos />
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.55, marginBottom: 4 }}>
        ARR de referência ≈ <b style={{ color: "var(--mut)" }}>{brlk(arr)}</b> (MRR × 12). Margem saudável para agência tech-enabled;
        a alavanca é reduzir horas humanas com os agentes e subir a recorrência.
      </p>

      {/* Valuation */}
      <div className="ex-grph" style={{ marginTop: 22 }}><span className="gt">Projeção de valuation</span><span className="gc">3 lentes</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <th style={{ padding: "10px 16px", fontWeight: 600 }}>Método</th>
              <th style={{ padding: "10px 16px", fontWeight: 600 }}>Múltiplo</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right" }}>Valuation</th>
            </tr>
          </thead>
          <tbody>
            {metodos.map((m) => (
              <tr key={m.nome} style={{ borderTop: "1px solid var(--line)", background: m.dest ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent" }}>
                <td style={{ padding: "11px 16px", color: m.dest ? "var(--txt)" : "var(--mut)", fontWeight: m.dest ? 700 : 400 }}>{m.nome}</td>
                <td style={{ padding: "11px 16px", color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{m.mult}</td>
                <td style={{ padding: "11px 16px", textAlign: "right", color: m.dest ? "var(--accent)" : "var(--txt)", fontWeight: m.dest ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>{brlk(m.lo)} – {brlk(m.hi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hx-glass" style={{ padding: "13px 16px", borderRadius: 12, borderLeft: "3px solid var(--accent)", marginBottom: 4 }}>
        <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>
          Com a meta batida (+{brl(plano.metaACV)} em novos contratos no ano e retenção acima de 90%), o ARR caminha para
          <b style={{ color: "var(--txt)" }}> ~{brlk(arrProj)}</b> em 12 meses. Na lente tech-enabled (2×), isso projeta um valuation na casa de
          <b style={{ color: "var(--accent)" }}> ~{brlk(arrProj * 2)}</b>. Se a <a href="/expand/roadmap?v=startup" style={{ color: "var(--accent)", textDecoration: "none" }}>Fase 4 (SaaS)</a> vingar,
          o múltiplo de SaaS recorrente (4–8× ARR) muda o jogo — é aí que a plataforma deixa de ser custo e vira o ativo.
        </p>
      </div>

      {/* Recomendações do agente */}
      <div className="ex-grph" style={{ marginTop: 22 }}><span className="gt">O que o agente de finanças recomenda</span><span className="gc">4</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
        {[
          { t: "Corte onde sangra sem dó", d: "A maior linha é equipe (56%); cada processo que um agente executa no lugar de horas humanas melhora a margem direto." },
          { t: "Recorrência acima de tudo", d: "Valuation de agência é baixo; de recorrência previsível é alto. Priorize renovação e o Semestral como degrau, não como desconto." },
          { t: "Meça o custo de IA", d: "A chave Anthropic é custo variável — modelo por tarefa (Haiku no volume, Sonnet na qualidade) e cache mantêm o gasto sob controle." },
          { t: "DRE vivo, não planilha", d: "Este painel já lê a carteira da config comercial. Evolução: custos e receitas reais por conta e margem por produto, atualizando sozinhos." },
        ].map((r) => (
          <div key={r.t} className="hx-glass" style={{ padding: "13px 15px", borderRadius: 12, borderLeft: "3px solid var(--green)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 5 }}>{r.t}</div>
            <div style={{ fontSize: 11.8, color: "var(--mut)", lineHeight: 1.5 }}>{r.d}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.55 }}>
        Modelo de premissas — o time substitui os percentuais pelos números reais quando fecharem o mês. Estratégia completa no dossiê do sistema e no <a href="/expand/roadmap?v=startup" style={{ color: "var(--accent)", textDecoration: "none" }}>roadmap de startup</a>.
      </p>
    </>
  );
}

function Row({ nome, valor, pct, neg, pos, total }: { nome: string; valor: string; pct: string; neg?: boolean; pos?: boolean; total?: boolean }) {
  return (
    <tr style={{ borderTop: "1px solid var(--line)", background: total ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent" }}>
      <td style={{ padding: "10px 16px", color: total ? "var(--txt)" : "var(--mut)", fontWeight: total ? 700 : 400 }}>{nome}</td>
      <td style={{ padding: "10px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: total ? 700 : 500, color: pos ? "var(--green)" : neg ? "var(--c-out, #CE6A5F)" : "var(--txt)" }}>{valor}</td>
      <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{pct}</td>
    </tr>
  );
}
