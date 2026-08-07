// Métricas de produtividade por pessoa, derivadas das etapas (expand_etapas).
// Alimenta o heatmap do perfil e o balanceamento de squad do PMO.

export type EtapaProd = {
  responsavel: string | null;
  responsavel_atual: string | null;
  status: string;
  area: string | null;
  sla: string | null;
  duracao_min: number | null;
  data_prevista: string | null;
  concluida_em: string | null;
  bloqueado: boolean;
};

export function slaMin(sla: string | null): number | null {
  if (!sla) return null;
  const d = sla.toLowerCase().match(/(\d+)\s*dia/); if (d) return Number(d[1]) * 1440;
  const h = sla.toLowerCase().match(/(\d+)\s*h/); if (h) return Number(h[1]) * 60;
  return null;
}

// A pessoa "dona" da etapa é o responsável atual (ou o base). Casa exato ou dentro de composto ("Ana + Adriane").
export function ehDaPessoa(e: EtapaProd, nome: string): boolean {
  const r = (e.responsavel_atual ?? e.responsavel ?? "").toLowerCase();
  const n = nome.toLowerCase();
  return r === n || r.split(/[+,/]/).map((s) => s.trim()).includes(n);
}

export type MetricasPessoa = {
  concluidas: number;
  abertas: number;
  bloqueadas: number;
  comTempo: number;
  noPrazo: number;
  foraPrazo: number;
  taxaPrazo: number | null;       // 0..1 (só sobre as que têm tempo + SLA)
  tempoMedioMin: number | null;
  porArea: { area: string; total: number; concluidas: number; noPrazo: number; taxa: number | null }[];
  eficiencia: number;             // 0..100 — mistura volume + prazo, para ranquear no squad
};

export function metricasPessoa(nome: string, etapas: EtapaProd[]): MetricasPessoa {
  const minhas = etapas.filter((e) => ehDaPessoa(e, nome));
  const concluidas = minhas.filter((e) => e.status === "done").length;
  const abertas = minhas.filter((e) => e.status !== "done").length;
  const bloqueadas = minhas.filter((e) => e.bloqueado).length;

  let comTempo = 0, noPrazo = 0, foraPrazo = 0, somaTempo = 0;
  for (const e of minhas) {
    const sm = slaMin(e.sla);
    if (e.duracao_min != null && sm != null) {
      comTempo++; somaTempo += e.duracao_min;
      if (e.duracao_min <= sm) noPrazo++; else foraPrazo++;
    }
  }
  const taxaPrazo = comTempo ? noPrazo / comTempo : null;
  const tempoMedioMin = comTempo ? Math.round(somaTempo / comTempo) : null;

  const areas = new Map<string, { total: number; concluidas: number; noPrazo: number; comTempo: number }>();
  for (const e of minhas) {
    const a = e.area ?? "—";
    const g = areas.get(a) ?? { total: 0, concluidas: 0, noPrazo: 0, comTempo: 0 };
    g.total++;
    if (e.status === "done") g.concluidas++;
    const sm = slaMin(e.sla);
    if (e.duracao_min != null && sm != null) { g.comTempo++; if (e.duracao_min <= sm) g.noPrazo++; }
    areas.set(a, g);
  }
  const porArea = [...areas.entries()].map(([area, g]) => ({
    area, total: g.total, concluidas: g.concluidas, noPrazo: g.noPrazo,
    taxa: g.comTempo ? g.noPrazo / g.comTempo : null,
  })).sort((a, b) => b.total - a.total);

  // eficiência: volume entregue (log) ponderado pela taxa de prazo (default 0.7 quando sem dado).
  const volume = Math.min(1, Math.log10(concluidas + 1) / 2); // ~0..1 (100 tarefas ≈ 1)
  const prazo = taxaPrazo ?? 0.7;
  const eficiencia = Math.round((volume * 0.5 + prazo * 0.5) * 100);

  return { concluidas, abertas, bloqueadas, comTempo, noPrazo, foraPrazo, taxaPrazo, tempoMedioMin, porArea, eficiencia };
}

// Grade do heatmap: últimas `semanas` semanas (colunas) × 7 dias (linhas seg→dom),
// contando tarefas concluídas por dia (concluida_em).
export type HeatCell = { date: string; count: number };
export function heatmap(nome: string, etapas: EtapaProd[], semanas = 14): { cols: HeatCell[][]; max: number; total: number } {
  const cont = new Map<string, number>();
  let total = 0;
  for (const e of etapas) {
    if (e.status !== "done" || !e.concluida_em || !ehDaPessoa(e, nome)) continue;
    const d = new Date(e.concluida_em); if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    cont.set(key, (cont.get(key) ?? 0) + 1); total++;
  }
  // começa na segunda-feira, `semanas` atrás
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diaSemana = (hoje.getDay() + 6) % 7; // 0=seg
  const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - diaSemana - (semanas - 1) * 7);
  const cols: HeatCell[][] = [];
  let max = 0;
  for (let w = 0; w < semanas; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(inicio); cur.setDate(inicio.getDate() + w * 7 + d);
      const key = cur.toISOString().slice(0, 10);
      const count = cur > hoje ? -1 : (cont.get(key) ?? 0); // -1 = futuro (não pinta)
      if (count > max) max = count;
      col.push({ date: key, count });
    }
    cols.push(col);
  }
  return { cols, max, total };
}
