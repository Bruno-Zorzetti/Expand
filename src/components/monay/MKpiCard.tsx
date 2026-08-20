import MProgressBar from './MProgressBar';

export default function MKpiCard({
  label,
  value,
  sub,
  trend,
  color = 'var(--accent)',
  progress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: string;
  progress?: number;
}) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '→' : null;
  const trendColor = trend === 'up' ? 'var(--green)' : trend === 'down' ? 'var(--red)' : 'var(--dim)';

  return (
    <div className="hx-glass" style={{ padding: '15px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: 2,
        background: `linear-gradient(90deg, ${color}, transparent 70%)`,
      }} />
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
        color: 'var(--dim)', fontWeight: 700, marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: '-1px',
          color: 'var(--txt)', lineHeight: 1,
        }}>
          {value}
        </div>
        {trendIcon && (
          <span style={{ fontSize: 13, fontWeight: 700, color: trendColor }}>{trendIcon}</span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 6 }}>{sub}</div>
      )}
      {progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <MProgressBar value={progress} color={color} showLabel height={4} />
        </div>
      )}
    </div>
  );
}
