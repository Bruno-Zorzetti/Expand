"use client";

import { useState } from "react";
import { ETAPAS } from "@/lib/expand-comercial";

export default function Playbook() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "01": true });
  return (
    <>
      <p className="hx-eyebrow">Método 3F · Henrique Toledo</p>
      <h1 className="ex-h1">Playbook da <span className="hx-accent-text">reunião</span></h1>
      <p className="ex-sub">A reunião de vendas em quatro etapas. Quem pergunta conduz — se o cliente está perguntando mais que respondendo, virou apresentação. E onde o script diz &quot;mentoria&quot;, você diz &quot;implementação&quot;: a equipe faz junto.</p>
      {ETAPAS.map((e) => {
        const isOpen = !!open[e.n];
        return (
          <div key={e.n} className="ex-acc hx-glass">
            <button className="ex-acch" onClick={() => setOpen((o) => ({ ...o, [e.n]: !o[e.n] }))}>
              <span className="ex-accn">{e.n}</span>
              <span className="ex-acct"><span className="nm">{e.nome}</span><span className="mt2">{e.meta}</span></span>
              <span className={`ex-chev${isOpen ? " open" : ""}`}>▶</span>
            </button>
            {isOpen ? (
              <div>
                {e.movs.map((m, i) => (
                  <div key={i} className="ex-mv">
                    <div className="ex-mvl"><div className="mn"><i>{m.i}</i>{m.mn}</div><div className="md">{m.md}</div></div>
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
