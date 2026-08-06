import Link from "next/link";
import { Fragment } from "react";
import { AG_GRID, AG_COLS, AG_LEG, LARA } from "@/lib/expand-comercial";

export const dynamic = "force-dynamic";

export default function Cockpit() {
  const wd = new Date().getDay();
  const col = wd >= 1 && wd <= 5 ? wd - 1 : 0;
  const hoje = AG_COLS[col];
  const blocos = AG_GRID.map((r) => ({ h: r.h, cell: r.b[col] }));

  return (
    <>
      <p className="hx-eyebrow">Comercial · Hoje</p>
      <h1 className="ex-h1">Cockpit <span className="hx-accent-text">comercial</span></h1>
      <p className="ex-sub">A manhã é inviolável: das 9h às 11h é prospecção, todo dia. O resto se move; esse bloco não. Se ele cair três dias seguidos, o funil de 45 dias à frente já está furado.</p>

      <div className="ex-dash">
        <div>
          <div className="ex-grph"><span className="gt">Sua {hoje.toLowerCase()}</span><span className="gl" /></div>
          <div className="ex-panel hx-glass">
            <div className="pb" style={{ gap: 0 }}>
              {blocos.map((b, i) => (
                <div key={i} className="ex-arq" style={{ borderLeft: `3px solid ${b.cell.c}` }}>
                  <div style={{ width: 50, fontWeight: 700, fontSize: 12, color: "var(--dim)" }}>{b.h}</div>
                  <div className="an">{b.cell.t}<div className="am">{b.cell.s}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="ex-grph" style={{ marginTop: 22 }}><span className="gt">A semana comercial</span><span className="gl" /></div>
          <div className="ex-agwrap hx-glass" style={{ borderRadius: "var(--radius)" }}>
            <div className="ex-ag">
              <div className="ex-agh" style={{ textAlign: "left", paddingLeft: 12 }}>Hora</div>
              {AG_COLS.map((c, i) => <div key={c} className={`ex-agh${i === col ? " hoje" : ""}`}>{c}</div>)}
              {AG_GRID.map((r) => (
                <Fragment key={r.h}>
                  <div className="ex-agtime">{r.h}</div>
                  {r.b.map((cell, i) => (
                    <div key={r.h + i} className={`ex-agcell${i === col ? " hoje" : ""}`}>
                      <div className="ex-agb" style={{ ["--bc" as string]: cell.c }}>{cell.t}<small>{cell.s}</small></div>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 15, flexWrap: "wrap", marginTop: 12, fontSize: 11.5, color: "var(--mut)" }}>
            {AG_LEG.map(([l, c]) => <span key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: c, display: "block" }} />{l}</span>)}
          </div>
        </div>

        <aside>
          <div className="ex-agc hx-glass" style={{ ["--ac" as string]: LARA.cor }}>
            <div className="agh"><div className="agav" style={{ background: `linear-gradient(135deg, ${LARA.cor}, color-mix(in srgb, ${LARA.cor} 60%, #8a6a2f))` }}>⚡</div><div><div className="agn">{LARA.nome}</div><div className="agr">{LARA.papel}</div></div></div>
            <div className="agf">{LARA.resumo}</div>
          </div>
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Lara entrega</span></div>
            <div className="pb">
              {LARA.entregas.map((e) => (<div key={e.t} className="ex-mini"><span className="ml"><b>{e.t}</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>{e.d}</span></span></div>))}
              <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2, borderTop: "1px solid var(--line)", paddingTop: 10 }}>{LARA.aprova}</div>
            </div>
          </div>
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Playbook</span></div>
            <div className="pb">
              <Link href="/expand/comercial/playbook" className="ex-mini" style={{ textDecoration: "none", color: "inherit" }}><span className="ml"><b>Método 3F</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>Os 4 passos da reunião</span></span></Link>
              <Link href="/expand/comercial/funis" className="ex-mini" style={{ textDecoration: "none", color: "inherit" }}><span className="ml"><b>Funis</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>Como conseguir a reunião</span></span></Link>
              <Link href="/expand/comercial/objecoes" className="ex-mini" style={{ textDecoration: "none", color: "inherit" }}><span className="ml"><b>Objeções</b><br /><span style={{ color: "var(--dim)", fontSize: 11 }}>Quando ele diz não</span></span></Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
