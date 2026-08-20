
export default function MProgressBar({
  value,
  color = 'var(--accent)',
  showLabel = false,
  height = 6,
  rounded = true,
}: {
  value: number;
  color?: string;
  showLabel?: boolean;
  height?: number;
  rounded?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height,
        background: 'var(--line)',
        borderRadius: rounded ? 99 : 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, white))`,
          borderRadius: rounded ? 99 : 2,
          transition: 'width .4s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontSize: 10, color: 'var(--dim)', fontWeight: 700,
          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
        }}>
          {pct}%
        </span>
      )}
    </div>
  );
}
