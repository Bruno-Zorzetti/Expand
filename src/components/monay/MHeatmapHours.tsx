
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_START = 6;
const HOUR_COUNT = 16;

export default function MHeatmapHours({
  data = [],
  cor = 'var(--accent)',
}: {
  data?: { date: string; hour: number; minutes: number }[];
  cor?: string;
}) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(HOUR_COUNT).fill(0));
  let maxVal = 1;

  for (const d of data) {
    const dayIdx = new Date(d.date).getDay();
    const hourIdx = d.hour - HOUR_START;
    if (hourIdx >= 0 && hourIdx < HOUR_COUNT) {
      grid[dayIdx][hourIdx] += d.minutes;
      if (grid[dayIdx][hourIdx] > maxVal) maxVal = grid[dayIdx][hourIdx];
    }
  }

  const cH = 13, cW = 24, gH = 3, gW = 3;
  const padL = 28, padT = 18;
  const totalW = padL + HOUR_COUNT * (cW + gW);
  const totalH = padT + 7 * (cH + gH) + 18;

  const fill = (val: number) =>
    val === 0
      ? 'var(--panel-2)'
      : `color-mix(in srgb, ${cor} ${16 + Math.round((val / maxVal) * 74)}%, transparent)`;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ width: '100%', minWidth: totalW, display: 'block' }}
      >
        {Array.from({ length: Math.floor(HOUR_COUNT / 3) }, (_, i) => i * 3).map((hi) => (
          <text key={hi}
            x={padL + hi * (cW + gW) + cW / 2}
            y={11} fontSize={8} fill="var(--dim)" textAnchor="middle"
          >
            {HOUR_START + hi}h
          </text>
        ))}

        {DAYS.map((d, di) => (
          <text key={d}
            x={padL - 4}
            y={padT + di * (cH + gH) + cH - 2}
            fontSize={7.5} fill="var(--dim)" textAnchor="end"
          >
            {d}
          </text>
        ))}

        {grid.map((row, di) =>
          row.map((val, hi) => (
            <rect key={`${di}-${hi}`}
              x={padL + hi * (cW + gW)}
              y={padT + di * (cH + gH)}
              width={cW} height={cH} rx={3}
              fill={fill(val)}
              stroke="var(--line)" strokeWidth={0.3}
              aria-label={val > 0 ? `${DAYS[di]} ${HOUR_START + hi}h — ${Math.round(val / 6) / 10}h foco` : undefined}
            />
          ))
        )}

        <text x={padL} y={totalH - 2} fontSize={7.5} fill="var(--dim)">menos</text>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <rect key={i}
            x={padL + 38 + i * 13} y={totalH - 10}
            width={10} height={10} rx={2}
            fill={t === 0 ? 'var(--panel-2)' : `color-mix(in srgb, ${cor} ${16 + Math.round(t * 74)}%, transparent)`}
          />
        ))}
        <text x={padL + 38 + 5 * 13 + 3} y={totalH - 2} fontSize={7.5} fill="var(--dim)">mais</text>
      </svg>
    </div>
  );
}
