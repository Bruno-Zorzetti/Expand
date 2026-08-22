import type { HeatCell } from "@/lib/expand-produtividade";

// Heatmap de produtividade (estilo calendário): colunas = semanas, linhas = seg→dom.
export default function Heatmap({ cols, max, cor = "var(--accent)" }: { cols: HeatCell[][]; max: number; cor?: string }) {
  const cell = 14, gap = 2, W = cols.length * (cell + gap), H = 7 * (cell + gap) + 20;
  const nivel = (c: number) => {
    if (c < 0) return "transparent";                       // futuro
    if (c === 0) return "var(--panel-2)";
    const t = max > 0 ? c / max : 0;
    return `color-mix(in srgb, ${cor} ${18 + Math.round(t * 72)}%, transparent)`;
  };
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  return (
    <svg viewBox={`0 0 ${W + 30} ${H}`} style={{ width: "100%", display: "block" }} suppressHydrationWarning>
      {dias.map((d, i) => <text key={i} x={0} y={i * (cell + gap) + cell - 1} fontSize={7.5} fill="var(--dim)">{d}</text>)}
      <g transform="translate(28 0)">
        {cols.map((col, w) => col.map((c, d) => (
          <rect key={`${w}-${d}`} x={w * (cell + gap)} y={d * (cell + gap)} width={cell} height={cell} rx={3}
            fill={nivel(c.count)} stroke={c.count > 0 ? "transparent" : "var(--line)"} strokeWidth={0.5}
            suppressHydrationWarning>
            {c.count >= 0 ? <title suppressHydrationWarning>{c.date}: {c.count} {c.count === 1 ? "tarefa" : "tarefas"}</title> : null}
          </rect>
        )))}
      </g>
      <g transform={`translate(28 ${7 * (cell + gap) + 12})`}>
        <text x={0} y={4} fontSize={8} fill="var(--dim)">menos</text>
        {[0, 0.3, 0.6, 1].map((t, i) => <rect key={i} x={34 + i * 12} y={-4} width={9} height={9} rx={2} fill={t === 0 ? "var(--panel-2)" : `color-mix(in srgb, ${cor} ${18 + Math.round(t * 72)}%, transparent)`} />)}
        <text x={34 + 4 * 12 + 4} y={4} fontSize={8} fill="var(--dim)">mais</text>
      </g>
    </svg>
  );
}
