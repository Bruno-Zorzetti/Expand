"use client";

import { useState } from "react";
import { FUNIS } from "@/lib/expand-comercial";

export default function Funis() {
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  return (
    <>
      <p className="hx-eyebrow">Prospecção</p>
      <h1 className="ex-h1">Como conseguir a <span className="hx-accent-text">reunião</span></h1>
      <p className="ex-sub">Os funis, do inbound à indicação. No Outbound, a Lara monta e enriquece a lista do ICP; o vendedor roda os áudios. A indicação é a melhor conversão da casa — e quem pede é o CS, não o comercial.</p>
      {FUNIS.map((f, idx) => {
        const isOpen = !!open[idx];
        return (
          <div key={idx} className="ex-acc hx-glass">
            <button className="ex-acch" onClick={() => setOpen((o) => ({ ...o, [idx]: !o[idx] }))}>
              <span className="ex-accn" style={{ color: f.cor }}>{idx + 1}</span>
              <span className="ex-acct">
                <span className="nm">{f.nome} <span style={{ fontSize: 10.5, fontWeight: 700, color: f.cor, marginLeft: 6 }}>{f.tag}</span></span>
                <span className="mt2">{f.fluxo}</span>
              </span>
              <span className={`ex-chev${isOpen ? " open" : ""}`}>▶</span>
            </button>
            {isOpen ? (
              <div>
                {f.msgs.map((m, i) => (
                  <div key={i} className="ex-mv">
                    <div className="ex-mvl"><div className="mn"><i>›</i>{m.n}</div><div className="md">{m.t}</div></div>
                    <div className="ex-mvr"><div className="ex-sc" dangerouslySetInnerHTML={{ __html: m.s }} /></div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
