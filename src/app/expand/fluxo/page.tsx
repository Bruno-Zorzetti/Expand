"use client";

import { useState } from "react";
import { FASES, AREAS, AG_COR, AG_NOME, AG_APROVA, GATES, TOTAL_ETAPAS } from "@/lib/expand-esteira";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

const AG_DESC: Record<string, string> = {
  lara: "Inteligência de mercado e de público + Dossiê Estratégico (Apify, tendências).",
  sofia: "Auditoria de redes, bio/posicionamento e calendário editorial.",
  alan: "Roteiros, legendas/copys de apoio e relatório mensal.",
  nina: "Capas e thumbnails dos vídeos com foco em CTR.",
};

export default function Fluxo() {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  let n = 0;

  return (
    <>
      <p className="hx-eyebrow">{TOTAL_ETAPAS} etapas · na ordem</p>
      <h1 className="ex-h1">Fluxograma da <span className="hx-accent-text">Entrega</span></h1>
      <p className="ex-sub">
        Todo o PIDE, da assinatura ao ciclo recorrente. Cada etapa tem um dono e um critério de pronto.
        Clique numa etapa para abrir o detalhe. Onde há ⚡, um agente de IA rascunha e o humano aprova (QC).
      </p>

      <div className="ex-grph"><span className="gt">A força de IA — executa ao lado da equipe<Ajuda t={AJUDA.agenteIA} /></span><span className="gl" /></div>
      <div className="ex-cards" style={{ marginBottom: 8 }}>
        {Object.keys(AG_NOME).map((k) => (
          <div key={k} className="ex-agc hx-glass" style={{ ["--ac" as string]: AG_COR[k] }}>
            <div className="agh">
              <div className="agav" style={{ background: `linear-gradient(135deg, ${AG_COR[k]}, color-mix(in srgb, ${AG_COR[k]} 60%, #8a6a2f))` }}>⚡</div>
              <div><div className="agn">{AG_NOME[k]}</div><div className="agr">IA · {AG_APROVA[k]}</div></div>
            </div>
            <div className="agf">{AG_DESC[k]}</div>
          </div>
        ))}
      </div>

      {FASES.map((f) => (
        <div key={f.id} style={{ marginTop: 22 }}>
          <div className="ex-grph"><span className="gt"><span style={{ color: "var(--accent)" }}>Fase {f.id}</span> · {f.nome}</span><span className="gc">{f.janela}</span><span className="gl" /></div>
          <p style={{ color: "var(--dim)", fontSize: 12, margin: "-6px 0 10px" }}>{f.obj}</p>
          {f.tasks.map((t, i) => {
            n++;
            const key = `${f.id}-${i}`;
            const isOpen = !!open[key];
            const ar = AREAS[t.a];
            return (
              <div key={key} className="hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${ar.cor}`, overflow: "hidden" }}>
                <button className="ex-etrow" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}>
                  <span className="ex-etnum">{n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 650 }}>{t.t}</div>
                    <div className="ex-etmeta">
                      <span style={{ color: ar.cor, fontWeight: 700 }}>{ar.n}</span> · {t.o} · SLA {t.sla}
                      {t.ag ? <span className="ex-agtag" style={{ color: AG_COR[t.ag] }}>⚡ {AG_NOME[t.ag]} rascunha</span> : null}
                      {t.cli === 1 ? <span style={{ color: "#8A9990" }}>◉ visível ao cliente</span> : null}
                    </div>
                  </div>
                  <span className={`ex-chev${isOpen ? " open" : ""}`}>▶</span>
                </button>
                {isOpen ? (
                  <div className="ex-detwrap">
                    <div className="ex-detgrid">
                      <div><div className="ex-dl">Começa quando</div><div className="ex-dv">{t.g}</div></div>
                      <div><div className="ex-dl">Conclui quando</div><div className="ex-dv">{t.d}</div></div>
                      <div><div className="ex-dl">Responsável</div><div className="ex-dv">{t.o}</div></div>
                      {t.ag ? <div><div className="ex-dl">Execução por IA</div><div className="ex-dv"><span style={{ color: AG_COR[t.ag], fontWeight: 700 }}>⚡ {AG_NOME[t.ag]}</span> — {AG_APROVA[t.ag]}</div></div> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      <div className="ex-grph" style={{ marginTop: 26 }}><span className="gt">Os 5 portões de qualidade<Ajuda t={AJUDA.portao} /></span><span className="gl" /></div>
      <div className="ex-cards">
        {GATES.map((g, i) => (
          <div key={i} className="hx-glass" style={{ padding: "15px 17px", borderLeft: "3px solid var(--accent)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{g.h}</div>
            <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}>{g.p}</div>
          </div>
        ))}
      </div>
    </>
  );
}
