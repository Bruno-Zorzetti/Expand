import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import { getAcesso } from "@/lib/expand-acesso";
import { criarCliente } from "@/app/expand/actions";
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

export default async function Carteira({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();
  const sp = await searchParams;
  const mostraNovo = sp.novo === "1" && isAdmin;

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p className="hx-eyebrow">Visão geral · {clientes.length} contas ativas</p>
          <h1 className="ex-h1">A <span className="hx-accent-text">Carteira</span></h1>
          <p className="ex-sub">Todas as contas ativas com saúde operacional em tempo real. Contas com atrasos aparecem primeiro.</p>
        </div>
        {isAdmin && (
          <Link href="/expand/carteira?novo=1" className="hx-btn hx-btn-primary" style={{ padding: "9px 16px", textDecoration: "none", fontSize: 12.5, flexShrink: 0 }}>
            + Novo cliente
          </Link>
        )}
      </div>

      {/* Formulário: novo cliente */}
      {mostraNovo && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Novo cliente</p>
          <form action={criarCliente} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <input name="nome" placeholder="Nome do cliente *" required style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, minWidth: 200 }} />
            <input name="segmento" placeholder="Segmento (ex: E-commerce)" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, minWidth: 160 }} />
            <select name="maturidade" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit" }}>
              <option value="">Maturidade</option>
              <option value="Estruturação">Estruturação</option>
              <option value="Validação">Validação</option>
              <option value="Otimização">Otimização</option>
              <option value="Escala">Escala</option>
            </select>
            <select name="contrato" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit" }}>
              <option value="">Contrato</option>
              <option value="Anual">Anual</option>
              <option value="Semestral">Semestral</option>
              <option value="Mensal">Mensal</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "9px 16px", fontSize: 12.5 }}>Criar</button>
              <Link href="/expand/carteira" className="hx-btn" style={{ padding: "9px 16px", fontSize: 12.5, textDecoration: "none" }}>Cancelar</Link>
            </div>
          </form>
        </div>
      )}

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
            <div key={c.id} className="ex-cc hx-glass" style={{ color: "inherit" }}>
              <Link href={`/expand/clientes/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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

              {/* Quick actions */}
              <div style={{ display: "flex", gap: 6, padding: "8px 12px 10px", borderTop: "1px solid var(--line)" }}>
                <Link href={`/expand/clientes/${c.id}`} style={{ fontSize: 11, color: "var(--dim)", textDecoration: "none", padding: "4px 8px", borderRadius: 6, background: "var(--panel-2)" }}>
                  Editar
                </Link>
                <Link href={`/expand/clientes/${c.id}?t=diagnosticos`} style={{ fontSize: 11, color: "var(--dim)", textDecoration: "none", padding: "4px 8px", borderRadius: 6, background: "var(--panel-2)" }}>
                  Diagnósticos
                </Link>
                {isAdmin && (
                  <Link href={`/expand/clientes/${c.id}?t=acesso`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", padding: "4px 8px", borderRadius: 6, background: "color-mix(in srgb,var(--accent) 12%,transparent)" }}>
                    Acesso
                  </Link>
                )}
              </div>
            </div>
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
