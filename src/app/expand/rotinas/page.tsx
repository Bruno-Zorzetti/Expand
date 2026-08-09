import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarRotina, ajustarIntervalo, rodarRotinaResumo } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Rotina = { chave: string; nome: string; descricao: string | null; ativa: boolean; intervalo_min: number; ultima_exec: string | null; tokens_total: number; custo_total: number };

export default async function Rotinas() {
  const supabase = await createClient();
  const { data: rData } = await supabase.from("expand_rotina").select("chave, nome, descricao, ativa, intervalo_min, ultima_exec, tokens_total, custo_total").order("nome");
  const rotinas = (rData ?? []) as Rotina[];

  // Tokens/custo por cliente (dos resumos)
  const { data: rz } = await supabase.from("expand_cliente_resumo").select("cliente_id, tokens_in, tokens_out, custo");
  const { data: cl } = await supabase.from("expand_clientes").select("id, nome");
  const nome = new Map((cl ?? []).map((c) => [c.id as string, c.nome as string]));
  const agg = new Map<string, { tokens: number; custo: number; n: number }>();
  for (const r of (rz ?? []) as { cliente_id: string; tokens_in: number; tokens_out: number; custo: number }[]) {
    const a = agg.get(r.cliente_id) ?? { tokens: 0, custo: 0, n: 0 };
    a.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0); a.custo += Number(r.custo ?? 0); a.n += 1;
    agg.set(r.cliente_id, a);
  }
  const porCliente = [...agg.entries()].map(([id, a]) => ({ id, nome: nome.get(id) ?? id, ...a })).sort((a, b) => b.tokens - a.tokens);
  const totalTokens = porCliente.reduce((s, c) => s + c.tokens, 0);
  const totalCusto = porCliente.reduce((s, c) => s + c.custo, 0);

  const inp: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", width: 80 };

  return (
    <>
      <p className="hx-eyebrow">Gestão · automações</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Rotinas</span></h1>
      <p className="ex-sub">As automações que rodam sozinhas. Ligue/pause, ajuste o intervalo e acompanhe os tokens e o custo — inclusive por cliente. O resumo diário depende do WhatsApp conectado e da chave da IA.</p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Rotinas ativas</div><div className="val hx-accent-text">{rotinas.filter((r) => r.ativa).length}/{rotinas.length}</div><div className="foot">Ligadas</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Tokens (total)</div><div className="val" style={{ fontSize: 18 }}>{totalTokens.toLocaleString("pt-BR")}</div><div className="foot">Resumos gerados</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Custo estimado</div><div className="val" style={{ fontSize: 18 }}>US$ {totalCusto.toFixed(4)}</div><div className="foot">Acumulado</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes com resumo</div><div className="val">{porCliente.length}</div><div className="foot">Grupos lidos</div></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {rotinas.map((r) => (
          <div key={r.chave} className="hx-glass" style={{ borderRadius: 14, padding: 16, borderLeft: `3px solid ${r.ativa ? "var(--green)" : "var(--dim)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{r.nome} <span style={{ fontSize: 11, fontWeight: 600, color: r.ativa ? "var(--green)" : "var(--dim)" }}>· {r.ativa ? "ativa" : "pausada"}</span></div>
                <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5, marginTop: 2 }}>{r.descricao}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>Última execução: {r.ultima_exec ? new Date(r.ultima_exec).toLocaleString("pt-BR") : "nunca"} · {r.tokens_total.toLocaleString("pt-BR")} tokens · US$ {Number(r.custo_total).toFixed(4)}</div>
              </div>
              <form action={alternarRotina}>
                <input type="hidden" name="chave" value={r.chave} />
                <button className={`hx-btn ${r.ativa ? "hx-btn-ghost" : "hx-btn-primary"}`} type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>{r.ativa ? "⏸ Pausar" : "▶ Ativar"}</button>
              </form>
              <form action={ajustarIntervalo} style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                <input type="hidden" name="chave" value={r.chave} />
                <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Intervalo (min)</span>
                  <input name="intervalo_min" type="number" min={5} defaultValue={r.intervalo_min} style={inp} />
                </label>
                <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 12px", fontSize: 12 }}>Salvar</button>
              </form>
              {r.chave === "resumo-diario" ? (
                <form action={rodarRotinaResumo}>
                  <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>🧠 Rodar agora</button>
                </form>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="ex-grph"><span className="gt">Tokens por cliente</span><span className="gc">{porCliente.length}</span><span className="gl" /></div>
      {porCliente.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {porCliente.map((c) => (
            <Link key={c.id} href={`/expand/clientes/${c.id}?t=grupo`} className="hx-glass hx-glass-hover" style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{c.nome}</span>
              <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.n} resumo(s)</span>
              <span style={{ fontSize: 12, color: "var(--mut)", fontVariantNumeric: "tabular-nums", minWidth: 90, textAlign: "right" }}>{c.tokens.toLocaleString("pt-BR")} tok</span>
              <span style={{ fontSize: 12, color: "var(--accent)", fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}>US$ {c.custo.toFixed(4)}</span>
            </Link>
          ))}
        </div>
      ) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum resumo gerado ainda. Rode a rotina ou o resumo de um cliente para ver o consumo aqui.</p>}
    </>
  );
}
