"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

type Review = { cliente: string; texto: string; nota: number };
const field = "w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-[var(--accent)]";

export default function AgenteEditor({
  slug, nome, cor, rankingInicial, notaInicial, reviewsIniciais,
}: {
  slug: string; nome: string; cor: string; rankingInicial: string; notaInicial: number; reviewsIniciais: Review[];
}) {
  const supabase = createClient();
  const [ranking, setRanking] = useState(rankingInicial);
  const [nota, setNota] = useState(String(notaInicial));
  const [reviews, setReviews] = useState<Review[]>(reviewsIniciais);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upd = (i: number, p: Partial<Review>) => setReviews((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const add = () => setReviews((r) => [...r, { cliente: "", texto: "", nota: 5 }]);
  const rm = (i: number) => setReviews((r) => r.filter((_, j) => j !== i));

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const limpo = reviews.filter((r) => r.cliente.trim() && r.texto.trim());
    const { error } = await supabase.from("agente_config").upsert({ slug, ranking, nota: Number(nota) || null, reviews: limpo, updated_at: new Date().toISOString() });
    setSalvando(false);
    setMsg(error ? `Erro: ${error.message}` : "Salvo.");
  }

  return (
    <div className="hx-glass p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: cor }} />
        <p className="text-lg font-bold">{nome}</p>
        <button onClick={salvar} disabled={salvando} className="hx-btn hx-btn-primary ml-auto px-4 py-1.5 text-sm disabled:opacity-60">
          {salvando ? "..." : "Salvar"}
        </button>
        {msg && <span className="text-xs text-[var(--mut)]">{msg}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="mb-1 block text-xs text-[var(--mut)]">Ranking / selo</label><input value={ranking} onChange={(e) => setRanking(e.target.value)} className={field} /></div>
        <div><label className="mb-1 block text-xs text-[var(--mut)]">Nota média</label><input type="number" step="0.1" min="0" max="5" value={nota} onChange={(e) => setNota(e.target.value)} className={field} /></div>
      </div>
      <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-[var(--dim)]">Avaliações reais</p>
      <div className="space-y-2">
        {reviews.map((r, i) => (
          <div key={i} className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-2">
            <div className="flex gap-2">
              <input value={r.cliente} onChange={(e) => upd(i, { cliente: e.target.value })} placeholder="Cliente" className={`${field} flex-1`} />
              <input type="number" min="1" max="5" value={r.nota} onChange={(e) => upd(i, { nota: Number(e.target.value) })} className={`${field} w-16`} />
              <button onClick={() => rm(i)} className="text-[var(--red)]" aria-label="Remover"><Icon name="alert" size={16} /></button>
            </div>
            <input value={r.texto} onChange={(e) => upd(i, { texto: e.target.value })} placeholder="Depoimento" className={`${field} mt-2`} />
          </div>
        ))}
      </div>
      <button onClick={add} className="hx-btn hx-btn-ghost mt-3 text-sm">+ Adicionar avaliação</button>
    </div>
  );
}
