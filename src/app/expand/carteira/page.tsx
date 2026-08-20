import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

export const dynamic = "force-dynamic";

const RISCO_COR: Record<string, string> = {
  churn: "var(--red)", execucao: "var(--warn)", relacao: "var(--warn)", ok: "var(--green)",
};

type EtapaMin = {
  cliente_id: string; status: string;
  data_prevista: string | null; iniciada_em: string | null; sla: string | null;
};

function slaDias(sla: string | null): number | null {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/);   if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}

type ClienteHealth = { total: number; done: number; run: number; late: number };

function buildHealthMap(etapas: EtapaMin[]): Map<string, ClienteHealth> {
  const hoje = new Date().toISOString().slice(0, 10);
  const m = new Map<string, ClienteHealth>();

  etapas.forEach(e => {
    if (!m.has(e.cliente_id)) m.set(e.cliente_id, { total: 0, done: 0, run: 0, late: 0 });
    const h = m.get(e.cliente_id)!;
    h.total++;
    if (e.status === "done") { h.done++; return; }
    const isLate = (() => {
      if (e.data_prevista && e.data_prevista < hoje) return true;
      if (e.status === "run") {
        const d = slaDias(e.sla);
        if (d != null && e.iniciada_em) {
          const elapsed = (Date.now() - new Date(e.iniciada_em).getTime()) / 864e5;
          if (elapsed > d) return true;
        }
      }
      return false;
    })();
    if (isLate) { h.late++; return; }
    if (e.status === "run") { h.run++; return; }
  });

  return m;
}

export default async function Carteira() {
  const supabase = await createClient();

  const [{ data }, { data: etData }] = await Promise.all([
    supabase.from("expand_clientes").select("*").eq("ativo", true).order("nome"),
    supabase.from("expand_etapas").select("cliente_id,status,data_prevista,iniciada_em,sla").limit(2000),
  ]);

  const clientes = ((data ?? []) as ClienteRow[]).map(derive);
  const etapas   = (etData ?? []) as EtapaMin[];
  const healthMap = buildHealthMap(etapas);

  const relMed = (clientes.reduce((a, c) => a + (c.rel ?? 0), 0) / (clientes.length || 1)).toFixed(1);
  const comExec = clientes.filter((c) => c.exec != null);
  const execMed = (comExec.reduce((a, c) => a + (c.exec ?? 0), 0) / (comExec.length || 1)).toFixed(1);
  const churn   = clientes.filter((c) => c.risco === "churn").length;
  const porMat  = (m: string) => clientes.filter((c) => c.maturidade === m).length;

  // Task-level KPIs across all clients
  const totalEtapas = etapas.length;
  const doneEtapas  = etapas.filter(e => e.status === "done").length;
  const lateEtapas  = [...healthMap.values()].reduce((acc, h) => acc + h.late, 0);
  const runEtapas   = etapas.filter(e => e.status === "run").length;
  const globalPct   = totalEtapas ? Math.round(doneEtapas / totalEtapas * 100) : 0;

  // Sort: worst health first (most late), then alphabetically
  const sortedClientes = [...clientes].sort((a, b) => {
    const ha = healthMap.get(a.id) ?? { total: 0, done: 0, run: 0, late: 0 };
    const hb = healthMap.get(b.id) ?? { total: 0, done: 0, run: 0, late: 0 };
    if (hb.late !== ha.late) return hb.late - ha.late;
    return a.nome.localeCompare(b.nome);
  });

  return (
    <>
      <p className="hx-eyebrow">Visão geral · {clientes.length} contas ativas</p>
      <h1 className="ex-h1">A <span className="hx-accent-text">Carteira</span></h1>
      <p className="ex-sub">Todas as contas ativas com saúde operacional em tempo real. Contas com atrasos aparecem primeiro.</p>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 20 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Contas ativas</div>
          <div className="val">{clientes.length}</div>
          <div className="foot">{porMat("Estruturação")} Est · {porMat("Validação")} Val · {porMat("Otimização")} Ot</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Relação média<Ajuda t={AJUDA.relacao} /></div>
          <div className="val" style={{ color: "var(--green)" }}>{relMed}</div>
          <div className="foot">saúde do relacionamento</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Execução média<Ajuda t={AJUDA.execucao} /></div>
          <div className="val hx-accent-text">{execMed}</div>
          <div className="foot">qualidade de entrega</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Risco churn<Ajuda t={AJUDA.churn} /></div>
          <div className="val" style={{ color: churn ? "var(--red)" : "var(--green)" }}>{churn}</div>
          <div className="foot">alerta oculto</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Tarefas</div>
          <div className="val hx-accent-text">{globalPct}%</div>
          <div className="foot">
            {runEtapas > 0 && <span style={{ color: "var(--accent)" }}>▶ {runEtapas} · </span>}
            {lateEtapas > 0 && <span style={{ color: "var(--red)" }}>⚠ {lateEtapas} atrasadas</span>}
            {lateEtapas === 0 && <span>tudo no prazo</span>}
          </div>
        </div>
      </div>

      {/* Client cards */}
      <div className="ex-cards">
        {sortedClientes.map((c) => {
          const h = healthMap.get(c.id) ?? { total: 0, done: 0, run: 0, late: 0 };
          const cPct = h.total ? Math.round(h.done / h.total * 100) : 0;
          const barClr = h.late > 0 ? "var(--red)" : cPct >= 80 ? "var(--green)" : "var(--accent)";
          const matCor = MAT_COR[c.maturidade ?? ""] ?? "var(--accent)";

          return (
            <Link key={c.id} href={`/expand/clientes/${c.id}`} className="ex-cc hx-glass hx-glass-hover" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ex-cch">
                <div className="ex-cci" style={{ background: `color-mix(in srgb, ${matCor} 18%, transparent)`, color: matCor }}>
                  {c.nome[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ex-ccn">{c.nome}</div>
                  <div className="ex-ccs">{c.segmento}</div>
                </div>
                {/* Health badge */}
                {h.late > 0 ? (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "color-mix(in srgb,var(--red) 12%,transparent)", borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>
                    ⚠ {h.late}
                  </span>
                ) : (
                  <span className="ex-pill" style={{ background: `color-mix(in srgb, ${RISCO_COR[c.risco]} 16%, transparent)`, color: RISCO_COR[c.risco] }}>
                    <i className="ex-dot" />{c.risco === "ok" ? c.maturidade : RISCO_ROTULO[c.risco]}
                  </span>
                )}
              </div>

              <div className="ex-ccb">
                {/* Task progress bar */}
                {h.total > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, color: "var(--dim)" }}>
                        {h.run > 0 && <><span style={{ color: "var(--accent)" }}>▶ {h.run}</span> · </>}
                        {h.late > 0 && <><span style={{ color: "var(--red)" }}>⚠ {h.late}</span> · </>}
                        {h.total - h.done - h.run - h.late} fila
                      </span>
                      <span style={{ fontSize: 10.5, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{h.done}/{h.total} · {cPct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${cPct}%`, background: barClr, borderRadius: 99 }} />
                    </div>
                  </div>
                )}

                <div className="ex-ccrow">
                  <span className="k">Contrato</span>
                  <span className="v">{c.contrato_tipo ?? "—"}{c.contrato_dur ? ` · ${c.contrato_dur} meses` : ""}</span>
                </div>
                <div className="ex-ccrow">
                  <span className="k">Relação / Execução<Ajuda t={AJUDA.execucao} /></span>
                  <span className="v">{c.rel ?? "—"} / <span style={{ color: c.exec != null && c.exec <= 4 ? "var(--red)" : "var(--txt)" }}>{c.exec ?? "—"}</span></span>
                </div>
                <div className="ex-ccrow">
                  <span className="k">Pendência</span>
                  <span className="v">{c.pendencia}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/expand/v2?v=gantt&s=all" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Ver Gantt por cliente →</Link>
        <Link href="/expand/v2?v=dash&s=all" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Dashboard operacional →</Link>
        <Link href="/expand/v2?v=lista&s=all&st=late" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12, borderColor: "var(--red)", color: "var(--red)" }}>Ver atrasadas →</Link>
      </div>
    </>
  );
}
