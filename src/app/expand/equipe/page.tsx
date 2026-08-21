import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { convidarMembro, criarPerfil } from "@/app/expand/actions";
import ConvidarMembro from "@/components/expand/ConvidarMembro";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

type EtapaRow = {
  responsavel: string | null; responsavel_atual: string | null;
  status: string; data_prevista: string | null; iniciada_em: string | null; sla: string | null;
};

function slaDias(sla: string | null): number | null {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/);   if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}

type Load = { total: number; run: number; late: number; done: number; idle: number };

function buildLoadMap(etapas: EtapaRow[]): Map<string, Load> {
  const hoje = new Date().toISOString().slice(0, 10);
  const m = new Map<string, Load>();

  function bump(nome: string, e: EtapaRow) {
    if (!nome) return;
    const key = nome.trim().toLowerCase();
    if (!m.has(key)) m.set(key, { total: 0, run: 0, late: 0, done: 0, idle: 0 });
    const l = m.get(key)!;
    l.total++;
    if (e.status === "done") { l.done++; return; }
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
    if (isLate) { l.late++; return; }
    if (e.status === "run") { l.run++; return; }
    l.idle++;
  }

  etapas.forEach(e => {
    const resp = e.responsavel_atual ?? e.responsavel;
    if (resp) bump(resp, e);
  });

  return m;
}

export default async function Equipe() {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const [{ data: profData }, { data: etData }] = await Promise.all([
    supabase.from("expand_perfis").select("*").order("ordem"),
    supabase.from("expand_etapas").select("responsavel,responsavel_atual,status,data_prevista,iniciada_em,sla").limit(2000),
  ]);

  const perfis = (profData ?? []) as Perfil[];
  const etapas = (etData ?? []) as EtapaRow[];
  const loadMap = buildLoadMap(etapas);

  function load(nome: string): Load {
    return loadMap.get(nome.trim().toLowerCase()) ?? { total: 0, run: 0, late: 0, done: 0, idle: 0 };
  }

  const totalAberto = etapas.filter(e => e.status !== "done").length;
  const membrosHumanos = perfis.filter(p => p.tipo === "humano");
  const membrosAI = perfis.filter(p => p.tipo === "agente");

  // Team health signals
  const hoje = new Date().toISOString().slice(0, 10);
  const lateTotal = etapas.filter(e => e.status !== "done" && e.data_prevista && e.data_prevista < hoje).length;
  const runTotal  = etapas.filter(e => e.status === "run").length;
  const doneTotal = etapas.filter(e => e.status === "done").length;
  const pct = etapas.length ? Math.round(doneTotal / etapas.length * 100) : 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p className="hx-eyebrow">O time · {perfis.length} membros</p>
          <h1 className="ex-h1">A <span className="hx-accent-text">Equipe</span></h1>
          <p className="ex-sub">Humanos e agentes de IA medidos pelo mesmo padrão. Carga operacional em tempo real.</p>
        </div>
        {isAdmin && (
          <details style={{ position: "relative" }}>
            <summary className="hx-btn hx-btn-primary" style={{ padding: "9px 16px", cursor: "pointer", listStyle: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              + Novo membro
            </summary>
            <div className="hx-glass" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20, borderRadius: 12, padding: 16, minWidth: 280 }}>
              <form action={criarPerfil} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input name="nome" placeholder="Nome *" required style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }} />
                <input name="cargo" placeholder="Cargo" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }} />
                <select name="tipo" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
                  <option value="humano">Humano</option>
                  <option value="agente">Agente de IA</option>
                </select>
                <select name="area" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">— Área —</option>
                  {["comercial","cs","design","marketing","tech","gestao","financeiro","ops"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <input type="color" name="cor" defaultValue="#6366F1" style={{ height: 38, borderRadius: 8, border: "1px solid var(--line-2)", cursor: "pointer", padding: 4, width: "100%" }} />
                <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "9px" }}>Criar e configurar →</button>
              </form>
            </div>
          </details>
        )}
      </div>

      {/* KPI bar */}
      <div className="ex-kpis" style={{ marginBottom: 20 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Membros</div>
          <div className="val">{perfis.length}</div>
          <div className="foot">{membrosHumanos.length} humanos · {membrosAI.length} agentes</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Em execução</div>
          <div className="val" style={{ color: "var(--accent)" }}>{runTotal}</div>
          <div className="foot">tarefas ativas agora</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Atrasadas</div>
          <div className="val" style={{ color: lateTotal ? "var(--red)" : "var(--green)" }}>{lateTotal}</div>
          <div className="foot">fora do SLA</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Progresso geral</div>
          <div className="val hx-accent-text">{pct}%</div>
          <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: 99 }} />
          </div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Tarefas abertas</div>
          <div className="val">{totalAberto}</div>
          <div className="foot">aguardando entrega</div>
        </div>
      </div>

      {isAdmin && <ConvidarMembro convidar={convidarMembro} />}

      {/* Human team */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)" }}>Time Humano</span>
          <span style={{ fontSize: 11, color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 12%,transparent)", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>{membrosHumanos.length}</span>
        </div>
        <div className="ex-cards">
          {membrosHumanos.map((p) => {
            const l = load(p.nome);
            const openPct = l.total ? Math.round(l.done / l.total * 100) : 0;
            const barClr = l.late > 0 ? "var(--red)" : l.run > 0 ? "var(--accent)" : "var(--green)";
            return (
              <Link key={p.id} href={`/expand/equipe/${p.id}`} className="ex-cc hx-glass hx-glass-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="ex-cch">
                  <PerfilAvatar p={p} size={46} radius={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ex-ccn">{p.nome}</div>
                    <div className="ex-ccs">{p.cargo}</div>
                  </div>
                  {l.late > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--red)", background: "color-mix(in srgb,var(--red) 12%,transparent)", borderRadius: 20, padding: "2px 8px" }}>
                      ⚠ {l.late}
                    </span>
                  )}
                  {l.late === 0 && l.run > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 12%,transparent)", borderRadius: 20, padding: "2px 8px" }}>
                      ▶ {l.run}
                    </span>
                  )}
                </div>
                <div className="ex-ccb">
                  <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.4, marginBottom: 10, minHeight: 36 }}>{p.bio}</div>

                  {/* Load bar */}
                  {l.total > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 10.5, color: "var(--dim)" }}>
                          {l.run > 0 && <><span style={{ color: "var(--accent)" }}>▶ {l.run}</span> · </>}
                          {l.late > 0 && <><span style={{ color: "var(--red)" }}>⚠ {l.late}</span> · </>}
                          {l.idle} fila
                        </span>
                        <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{l.done}/{l.total} · {openPct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${openPct}%`, background: barClr, borderRadius: 99, transition: "width .3s" }} />
                      </div>
                    </div>
                  )}

                  <div className="ex-ccrow">
                    <span className="k">Ranking</span>
                    <span className="v" style={{ color: "var(--accent)" }}>★ {p.nota ?? "—"}</span>
                  </div>
                  <div className="ex-ccrow">
                    <span className="k">Carga aberta</span>
                    <span className="v">{l.total - l.done} tarefas</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI agents */}
      {membrosAI.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)" }}>Agentes de IA</span>
            <span style={{ fontSize: 11, color: "#C89B5E", background: "color-mix(in srgb,#C89B5E 12%,transparent)", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>{membrosAI.length}</span>
          </div>
          <div className="ex-cards">
            {membrosAI.map((p) => {
              const l = load(p.nome);
              const openPct = l.total ? Math.round(l.done / l.total * 100) : 0;
              return (
                <Link key={p.id} href={`/expand/equipe/${p.id}`} className="ex-cc hx-glass hx-glass-hover" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="ex-cch">
                    <PerfilAvatar p={p} size={46} radius={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ex-ccn">{p.nome}</div>
                      <div className="ex-ccs">{p.cargo}</div>
                    </div>
                    <span className="ex-pill" style={{ background: "color-mix(in srgb,#C89B5E 14%,transparent)", color: "#C89B5E" }}>
                      <i className="ex-dot" />IA
                    </span>
                  </div>
                  <div className="ex-ccb">
                    <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.4, marginBottom: 10, minHeight: 36 }}>{p.bio}</div>
                    {l.total > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10.5, color: "var(--dim)" }}>
                            {l.run > 0 && <><span style={{ color: "#C89B5E" }}>▶ {l.run} ativas</span> · </>}
                            {l.idle} fila
                          </span>
                          <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{l.done}/{l.total}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${openPct}%`, background: "#C89B5E", borderRadius: 99 }} />
                        </div>
                      </div>
                    )}
                    <div className="ex-ccrow">
                      <span className="k">Tarefas abertas</span>
                      <span className="v">{l.total - l.done}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Workload table (admin) */}
      {isAdmin && (
        <div className="hx-glass" style={{ borderRadius: 14, marginTop: 28, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Tabela de carga</span>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>tarefas abertas por membro</span>
            <Link href="/expand/v2?v=dash&s=all" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--accent)", textDecoration: "none" }}>Ver dashboard →</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
                  <td style={{ padding: "8px 16px" }}>Membro</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>Total</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>Em exec.</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>Atrasadas</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>Concluídas</td>
                  <td style={{ padding: "8px 18px" }}>Progresso</td>
                </tr>
              </thead>
              <tbody>
                {[...loadMap.entries()]
                  .sort((a, b) => (b[1].total - b[1].done) - (a[1].total - a[1].done))
                  .map(([nome, l]) => {
                    const pctRow = l.total ? Math.round(l.done / l.total * 100) : 0;
                    const barC = l.late > 0 ? "var(--red)" : pctRow >= 70 ? "var(--green)" : "var(--accent)";
                    return (
                      <tr key={nome} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--txt)", textTransform: "capitalize" }}>
                          <Link href={`/expand/v2?v=lista&s=all&r=${encodeURIComponent(nome)}`} style={{ color: "inherit", textDecoration: "none" }}>
                            {nome}
                          </Link>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--dim)" }}>{l.total}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: l.run > 0 ? "var(--accent)" : "var(--dim)" }}>{l.run}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: l.late > 0 ? "var(--red)" : "var(--dim)" }}>{l.late > 0 ? `⚠ ${l.late}` : "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--green)" }}>{l.done}</td>
                        <td style={{ padding: "10px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pctRow}%`, background: barC, borderRadius: 99 }} />
                            </div>
                            <span style={{ fontSize: 10.5, color: "var(--dim)", minWidth: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pctRow}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
