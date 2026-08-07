"use client";

import { useState } from "react";
import { calc, brl, up, type Plano } from "@/lib/expand-comercial-game";

const FCOR: Record<string, string> = { in: "var(--c-in)", ind: "var(--c-ind)", out: "var(--c-out)", tf: "var(--c-tf)" };

function Num({ s, set, k, l, suf }: { s: Plano; set: (k: keyof Plano, v: number) => void; k: keyof Plano; l: string; suf?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>{l}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input name={k} type="number" step="any" value={s[k]} onChange={(e) => set(k, Number(e.target.value))}
          style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
        {suf ? <span style={{ fontSize: 11, color: "var(--dim)" }}>{suf}</span> : null}
      </div>
    </label>
  );
}

export default function MetaCalc({ inicial, salvar }: { inicial: Plano; salvar: (fd: FormData) => Promise<void> }) {
  const [s, setS] = useState<Plano>(inicial);
  const set = (k: keyof Plano, v: number) => setS((x) => ({ ...x, [k]: Number.isFinite(v) ? v : 0 }));
  const C = calc(s);

  return (
    <form action={salvar}>
      <div className="ex-kpis" style={{ marginBottom: 16 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Ticket médio (contratado)</div><div className="val hx-accent-text" style={{ fontSize: 20 }}>{brl(C.ticket)}</div><div className="foot">Mix anual/semestral</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Vendas no período</div><div className="val">{Math.ceil(C.vendas)}</div><div className="foot">Para bater {brl(s.metaACV)}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Reuniões / dia</div><div className="val">{C.dia.reunA.toFixed(1)}</div><div className="foot">Agendadas (com no-show)</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Caixa projetado (novo)</div><div className="val" style={{ fontSize: 16 }}>{brl(C.caixaNovo)}</div><div className="foot">+ carteira {brl(C.caixaCarteira)}</div></div>
      </div>

      <div className="ex-two" style={{ marginBottom: 16 }}>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Meta & ticket</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Num s={s} set={set} k="metaACV" l="Meta de contratos (ACV)" suf="R$" />
            <Num s={s} set={set} k="carteiraMRR" l="Carteira atual (MRR)" suf="R$" />
            <Num s={s} set={set} k="mensalAnual" l="Mensal · plano anual" suf="R$" />
            <Num s={s} set={set} k="mensalSem" l="Mensal · plano semestral" suf="R$" />
            <Num s={s} set={set} k="mixAnual" l="% de vendas anuais" suf="%" />
            <Num s={s} set={set} k="noshow" l="No-show" suf="%" />
          </div>
        </div>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Mix de funil (%)</span><span style={{ marginLeft: "auto", fontSize: 11, color: C.soma === 100 ? "var(--green)" : "var(--warn)" }}>soma {Math.round(C.soma)}%</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Num s={s} set={set} k="fInbound" l="Inbound" suf="%" />
            <Num s={s} set={set} k="fIndic" l="Indicação" suf="%" />
            <Num s={s} set={set} k="fOutbound" l="Outbound" suf="%" />
            <Num s={s} set={set} k="fTrafego" l="Tráfego" suf="%" />
            <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--dim)" }}>Não precisa somar 100 — o sistema normaliza.</p>
          </div>
        </div>
      </div>

      <div className="ex-two" style={{ marginBottom: 16 }}>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Conversão (reuniões → venda)</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Num s={s} set={set} k="cInbound" l="Inbound" suf="reun/venda" />
            <Num s={s} set={set} k="cIndic" l="Indicação" suf="reun/venda" />
            <Num s={s} set={set} k="cOutbound" l="Outbound" suf="reun/venda" />
            <Num s={s} set={set} k="cTrafego" l="Tráfego" suf="reun/venda" />
          </div>
        </div>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Convites por reunião</span></div>
          <div className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Num s={s} set={set} k="vInbound" l="Inbound" suf="conv/reun" />
            <Num s={s} set={set} k="vIndic" l="Indicação" suf="conv/reun" />
            <Num s={s} set={set} k="vOutbound" l="Outbound" suf="conv/reun" />
            <Num s={s} set={set} k="vTrafego" l="Tráfego" suf="leads/reun" />
          </div>
        </div>
      </div>

      <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16 }}>
        <div className="ph"><span className="pt">De onde vem cada venda</span></div>
        <div className="pb" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
            <thead><tr style={{ color: "var(--dim)", textAlign: "right" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Funil</th><th style={{ padding: "6px 8px" }}>Mix</th><th style={{ padding: "6px 8px" }}>Vendas</th><th style={{ padding: "6px 8px" }}>Reuniões</th><th style={{ padding: "6px 8px" }}>{"Convites/período"}</th><th style={{ padding: "6px 8px" }}>Receita</th>
            </tr></thead>
            <tbody>
              {C.defs.map((f) => (
                <tr key={f.k} style={{ borderTop: "1px solid var(--line)", textAlign: "right" }}>
                  <td style={{ textAlign: "left", padding: "7px 8px", color: "var(--txt)" }}><span style={{ color: FCOR[f.k], fontWeight: 700 }}>●</span> {f.nome}</td>
                  <td style={{ padding: "7px 8px", color: "var(--mut)" }}>{Math.round(f.mix)}%</td>
                  <td style={{ padding: "7px 8px" }}>{f.vendas.toFixed(1)}</td>
                  <td style={{ padding: "7px 8px", color: "var(--mut)" }}>{Math.ceil(f.reunA)} <small style={{ color: "var(--dim)" }}>ag.</small></td>
                  <td style={{ padding: "7px 8px" }}>{up(f.convites)} {f.un}</td>
                  <td style={{ padding: "7px 8px", color: "var(--accent)" }}>{brl(f.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ex-two" style={{ marginBottom: 16 }}>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Ritmo — por dia</span></div>
          <div className="pb">
            <div className="ex-mini"><span className="ml">Convites outbound</span><span className="mv" style={{ color: "var(--c-out)" }}>{up(C.dia.out)}</span></div>
            <div className="ex-mini"><span className="ml">Convites inbound</span><span className="mv" style={{ color: "var(--c-in)" }}>{up(C.dia.inb)}</span></div>
            <div className="ex-mini"><span className="ml">Reuniões agendadas</span><span className="mv" style={{ color: "var(--accent)" }}>{C.dia.reunA.toFixed(1)}</span></div>
          </div>
        </div>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Ritmo — por semana</span></div>
          <div className="pb">
            <div className="ex-mini"><span className="ml">Reuniões agendadas</span><span className="mv" style={{ color: "var(--accent)" }}>{up(C.sem.reunA)}</span></div>
            <div className="ex-mini"><span className="ml">Convites (total)</span><span className="mv">{up(C.sem.conv)}</span></div>
            <div className="ex-mini"><span className="ml">Pedidos de indicação</span><span className="mv" style={{ color: "var(--c-ind)" }}>{up(C.sem.ind)}</span></div>
          </div>
        </div>
      </div>

      <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16 }}>
        <div className="ph"><span className="pt">Projeção de caixa (contratado × recebido)</span></div>
        <div className="pb">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${C.meses.length},1fr)`, gap: 8, alignItems: "end", height: 120 }}>
            {C.meses.map((m) => {
              const maxAcv = Math.max(...C.meses.map((x) => x.acv));
              return (
                <div key={m.nome} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <span style={{ fontSize: 10, color: "var(--accent)", marginBottom: 3 }}>{brl(m.acv)}</span>
                  <div style={{ width: "70%", height: `${(m.acv / maxAcv) * 82}px`, background: "linear-gradient(180deg, var(--accent), var(--accent-2))", borderRadius: "5px 5px 0 0" }} />
                  <span style={{ fontSize: 9.5, color: "var(--dim)", marginTop: 5 }}>{m.nome.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 12, lineHeight: 1.5, borderTop: "1px solid var(--line)", paddingTop: 10 }}>Contratado ≠ recebido: a venda entra o valor total do contrato (ACV), mas o caixa chega mês a mês. O caixa novo estimado no período é <b style={{ color: "var(--accent)" }}>{brl(C.caixaNovo)}</b>, além da carteira atual.</p>
        </div>
      </div>

      <button className="hx-btn hx-btn-primary" type="submit">Salvar plano</button>
    </form>
  );
}
