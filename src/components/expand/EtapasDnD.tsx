"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AREAS, AG_NOME } from "@/lib/expand-esteira";

export type EtapaLite = {
  id: string; ordem: number; titulo: string; area: string | null; responsavel: string | null;
  agente: string | null; sla: string | null; qtd_esperada: number; visivel_cliente: boolean;
  marco: boolean; depende_de: number | null;
};

export default function EtapasDnD({ slug, etapas, depNomes = {} }: { slug: string; etapas: EtapaLite[]; depNomes?: Record<number, string> }) {
  const router = useRouter();
  const [lista, setLista] = useState<EtapaLite[]>(etapas);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function onEnter(i: number) {
    if (drag === null || drag === i) return;
    setLista((s) => {
      const a = [...s];
      const [m] = a.splice(drag, 1);
      a.splice(i, 0, m);
      return a;
    });
    setDrag(i);
  }

  async function persistir() {
    setDrag(null);
    setBusy(true);
    await fetch(`/api/produto/${slug}/processo`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reorder", ids: lista.map((e) => e.id) }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remover(id: string) {
    setBusy(true);
    await fetch(`/api/produto/${slug}/processo`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    setLista((s) => s.filter((e) => e.id !== id));
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ opacity: busy ? 0.6 : 1 }}>
      {lista.map((e, i) => {
        const ar = e.area ? AREAS[e.area] : null;
        return (
          <div key={e.id} draggable onDragStart={() => setDrag(i)} onDragEnter={() => onEnter(i)} onDragEnd={persistir} onDragOver={(ev) => ev.preventDefault()}
            className="ex-arq hx-glass" style={{ marginBottom: 6, borderLeft: `3px solid ${e.marco ? "var(--accent)" : ar ? ar.cor : "var(--line-2)"}`, cursor: "grab", boxShadow: e.marco ? "inset 3px 0 0 var(--accent)" : undefined }}>
            <span style={{ color: "var(--dim)", fontSize: 15, cursor: "grab", userSelect: "none" }} title="Arraste para reordenar">⠿</span>
            <div className="an" style={{ minWidth: 0 }}>
              {e.marco ? <span title="Marco — data crítica" style={{ color: "var(--accent)", marginRight: 5 }}>◆</span> : null}{e.titulo}{e.qtd_esperada > 1 ? <span className="ex-pill" style={{ marginLeft: 6 }}>×{e.qtd_esperada}</span> : null}
              <div className="am">
                {ar ? ar.n : "—"}{e.responsavel ? ` · ${e.responsavel}` : ""}{e.agente ? ` · IA: ${AG_NOME[e.agente] ?? e.agente}` : ""}{e.sla ? ` · SLA ${e.sla}` : ""}{e.visivel_cliente ? " · 👁 cliente" : ""}
                {e.depende_de ? <span style={{ color: "var(--warn)" }}> · ↳ depende de #{e.depende_de}{depNomes[e.depende_de] ? ` (${depNomes[e.depende_de]})` : ""}</span> : null}
              </div>
            </div>
            <a href={`/expand/produtos/${slug}/processo?edit=${e.id}`} className="ex-arqbtn">Editar</a>
            <button className="ex-arqbtn no" type="button" onClick={() => remover(e.id)}>Excluir</button>
          </div>
        );
      })}
    </div>
  );
}
