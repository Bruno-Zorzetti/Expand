import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { alternarPlanoAcao, novaAcaoPlano } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Acao = { id: string; titulo: string; responsaveis: string[] | null; data_limite: string | null; hora: string | null; status: string; origem: string | null };

const DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function PlanoAcao() {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();
  const { data } = await supabase.from("expand_plano_acao").select("id, titulo, responsaveis, data_limite, hora, status, origem").order("data_limite", { nullsFirst: false });
  const acoes = (data ?? []) as Acao[];
  const { data: ps } = await supabase.from("expand_perfis").select("id, nome, cor").eq("tipo", "humano");
  const pessoa = new Map((ps ?? []).map((p) => [p.id as string, { nome: p.nome as string, cor: (p.cor as string) ?? "var(--accent)" }]));

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const feitas = acoes.filter((a) => a.status === "done").length;
  const atrasadas = acoes.filter((a) => a.status !== "done" && a.data_limite && new Date(a.data_limite + "T12:00") < hoje).length;

  // agrupa por data
  const grupos = new Map<string, Acao[]>();
  for (const a of acoes) { const k = a.data_limite ?? "sem-data"; const arr = grupos.get(k) ?? []; arr.push(a); grupos.set(k, arr); }

  const fld: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit" };
  const lab: React.CSSProperties = { fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 };

  return (
    <>
      <p className="hx-eyebrow">Gestão · reunião de líderes</p>
      <h1 className="ex-h1">Plano de <span className="hx-accent-text">ação</span></h1>
      <p className="ex-sub">As ações do Grupo Expand com responsável e data limite. Marque como concluída ao entregar — o que passou do prazo aparece em vermelho.</p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Ações</div><div className="val">{acoes.length}</div><div className="foot">no plano</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Concluídas</div><div className="val" style={{ color: "var(--green)" }}>{feitas}</div><div className="foot">{acoes.length ? Math.round((feitas / acoes.length) * 100) : 0}% do plano</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Em atraso</div><div className="val" style={{ color: atrasadas ? "var(--red)" : "var(--dim)" }}>{atrasadas}</div><div className="foot">passou da data</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Pessoas envolvidas</div><div className="val">{new Set(acoes.flatMap((a) => a.responsaveis ?? [])).size}</div><div className="foot">responsáveis</div></div>
      </div>

      {isAdmin ? (
        <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <summary style={{ listStyle: "none", cursor: "pointer", padding: "11px 15px", fontWeight: 700, fontSize: 13 }}>＋ Nova ação</summary>
          <form action={novaAcaoPlano} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", padding: "0 15px 15px", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 240 }}><span style={lab}>O que</span><input name="titulo" required placeholder="Ação" style={fld} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lab}>Quem (ids, vírgula)</span><input name="responsaveis" placeholder="pedro, ana" style={fld} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}><span style={lab}>Data limite</span><input name="data_limite" type="date" style={fld} /></label>
            <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Adicionar</button>
          </form>
        </details>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {[...grupos.entries()].map(([dia, itens]) => {
          const d = dia === "sem-data" ? null : new Date(dia + "T12:00");
          const atrasado = d ? d < hoje : false;
          return (
            <div key={dia}>
              <div className="ex-grph">
                <span className="gt" style={{ color: atrasado ? "var(--warn)" : undefined }}>{d ? `${DIA[d.getDay()]} · ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}` : "Sem data"}</span>
                <span className="gc">{itens.length}</span><span className="gl" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {itens.map((a) => {
                  const done = a.status === "done";
                  const late = !done && d && d < hoje;
                  return (
                    <form key={a.id} action={alternarPlanoAcao} className="hx-glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, borderLeft: `3px solid ${done ? "var(--green)" : late ? "var(--red)" : "var(--line-2)"}`, opacity: done ? 0.62 : 1 }}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" aria-label={done ? "Reabrir" : "Concluir"} style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${done ? "var(--green)" : "var(--line-2)"}`, background: done ? "var(--green)" : "transparent", color: "#0A1512", cursor: "pointer", fontSize: 12, lineHeight: 1, display: "grid", placeItems: "center", flexShrink: 0, padding: 0 }}>{done ? "✓" : ""}</button>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{a.titulo}</span>
                      {a.hora ? <span style={{ fontSize: 11, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{a.hora}</span> : null}
                      <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {(a.responsaveis ?? []).map((r) => {
                          const p = pessoa.get(r);
                          return <span key={r} className="ex-pill" style={{ background: `color-mix(in srgb, ${p?.cor ?? "var(--accent)"} 16%, transparent)`, color: p?.cor ?? "var(--accent)", fontSize: 10.5 }}>{p?.nome ?? r}</span>;
                        })}
                      </span>
                    </form>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
