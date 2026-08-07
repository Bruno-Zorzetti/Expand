// Sugestão de squad do PMO: casa as áreas das tarefas do cliente com a pessoa mais
// eficiente naquela área, equilibrando a carga (greedy) e evitando quem está de folga.

export type Candidato = {
  id: string;
  nome: string;
  cargo: string | null;
  load: number;                              // tarefas abertas hoje (todos os clientes)
  folgasProximas: number;                    // folgas nos próximos ~30 dias
  eficArea: Record<string, { concluidas: number; taxa: number | null }>;
};

export type Alocacao = {
  area: string;
  tarefas: number;
  escolhido: Candidato | null;
  score: number;
  motivo: string;
  alternativas: { nome: string; score: number }[];
};

// eficiência da pessoa na área em 0..1 (taxa de prazo, ou volume normalizado quando sem tempo)
function efic(c: Candidato, area: string): number {
  const e = c.eficArea[area];
  if (!e) return 0.15; // nunca fez nessa área → baixa, mas não zero
  if (e.taxa != null) return 0.35 + e.taxa * 0.65;         // tem histórico de prazo
  return Math.min(1, 0.3 + e.concluidas / 12);             // só volume
}

export function sugerirSquad(
  areasComPeso: { area: string; tarefas: number }[],
  candidatos: Candidato[]
): Alocacao[] {
  const maxLoad = Math.max(1, ...candidatos.map((c) => c.load));
  const projload = new Map(candidatos.map((c) => [c.id, c.load]));

  // áreas com mais tarefas primeiro (decisões mais impactantes na frente)
  const ordem = [...areasComPeso].sort((a, b) => b.tarefas - a.tarefas);
  const out: Alocacao[] = [];

  for (const { area, tarefas } of ordem) {
    const ranked = candidatos.map((c) => {
      const load = projload.get(c.id) ?? c.load;
      const e = efic(c, area);
      const cargaNorm = load / (maxLoad + tarefas);
      const score = e * 100 - cargaNorm * 45 - c.folgasProximas * 6;
      return { c, e, load, score };
    }).sort((a, b) => b.score - a.score);

    const top = ranked[0] ?? null;
    if (top) projload.set(top.c.id, (projload.get(top.c.id) ?? top.c.load) + tarefas);

    const motivo = top
      ? `${Math.round(top.e * 100)}% de aderência na área · carga atual ${top.load}${top.c.folgasProximas ? ` · ${top.c.folgasProximas} folga(s) à frente` : ""}`
      : "sem candidato";

    out.push({
      area, tarefas,
      escolhido: top?.c ?? null,
      score: top ? Math.round(top.score) : 0,
      motivo,
      alternativas: ranked.slice(1, 4).map((r) => ({ nome: r.c.nome, score: Math.round(r.score) })),
    });
  }
  // volta à ordem original de exibição (por área alfabética)
  return out.sort((a, b) => a.area.localeCompare(b.area));
}
