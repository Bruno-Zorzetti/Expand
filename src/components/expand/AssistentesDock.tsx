"use client";

import { useState, useEffect } from "react";
import AgenteChat from "@/components/expand/AgenteChat";

export default function AssistentesDock({ pessoaId, pessoaNome }: { pessoaId: string; pessoaNome: string }) {
  const [menu, setMenu] = useState(false);
  const [ativo, setAtivo] = useState<{ id: string; nome: string; cor: string } | null>(null);

  useEffect(() => {
    function onOpenChat(e: Event) {
      const { id, nome, cor } = (e as CustomEvent).detail as { id: string; nome: string; cor: string };
      setAtivo({ id, nome, cor });
      setMenu(false);
    }
    window.addEventListener("expand:chat", onOpenChat);
    return () => window.removeEventListener("expand:chat", onOpenChat);
  }, []);

  const AGS = [
    { id: pessoaId, nome: `Meu assistente`, cor: "var(--accent)", desc: `copiloto de ${pessoaNome}` },
    { id: "gerente-projetos", nome: "PMO · Gerente de Projetos", cor: "var(--accent)", desc: "prazos, SLA, gargalos" },
    { id: "henrique", nome: "Mentor · Henrique", cor: "#E0BC85", desc: "método 3F, comercial" },
    { id: "humberto", nome: "Mediador · Humberto", cor: "#9B8CCB", desc: "1x1, cultura, feedback" },
    { id: "agente-produtos", nome: "Agente de Produtos", cor: "#5FA8D3", desc: "oferta, processo, margem" },
  ];

  return (
    <>
      <button className="ex-fab" title="Assistentes" onClick={() => setMenu((m) => !m)}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0A1512" strokeWidth="2.4" strokeLinecap="round" style={{ transition: ".2s", transform: menu ? "rotate(45deg)" : "none" }}><path d="M12 5v14M5 12h14" /></svg>
      </button>

      {menu ? (
        <div style={{ position: "fixed", right: 24, bottom: 86, zIndex: 60, width: 260, background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.4)", overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", borderBottom: "1px solid var(--line)" }}>Falar com um assistente</div>
          {AGS.map((a) => (
            <button key={a.id} onClick={() => { setAtivo(a); setMenu(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: a.cor, flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{a.nome}</span><span style={{ display: "block", fontSize: 10.5, color: "var(--mut)" }}>{a.desc}</span></span>
            </button>
          ))}
        </div>
      ) : null}

      {ativo ? (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 94vw)", zIndex: 70, background: "var(--bg)", borderLeft: "1px solid var(--line-2)", boxShadow: "-8px 0 40px rgba(0,0,0,.4)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: ativo.cor }} />
            <b style={{ fontSize: 14 }}>{ativo.nome}</b>
            <button onClick={() => setAtivo(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--mut)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
            <AgenteChat key={ativo.id} id={ativo.id} nome={ativo.nome} cor={ativo.cor} tipo="agente" memoriaHref={`/expand/equipe/${ativo.id}/conhecimento`} />
          </div>
        </div>
      ) : null}
    </>
  );
}
