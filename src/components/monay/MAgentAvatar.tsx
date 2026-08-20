
export default function MAgentAvatar({
  name,
  type = 'human',
  size = 28,
  color,
}: {
  name: string;
  type?: 'human' | 'ai';
  size?: number;
  color?: string;
}) {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const bg = color ?? (type === 'ai' ? 'var(--green)' : 'var(--accent)');
  const textColor = type === 'ai' ? 'var(--bg)' : '#0A1512';

  return (
    <span
      title={name}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg}, color-mix(in srgb, ${bg} 70%, white))`,
        color: textColor,
        fontSize: Math.round(size * 0.38),
        fontWeight: 800,
        fontFamily: 'var(--serif, Georgia, serif)',
        flexShrink: 0,
        border: `1.5px solid color-mix(in srgb, ${bg} 40%, transparent)`,
        position: 'relative',
      }}
    >
      {ini}
      {type === 'ai' && (
        <span style={{
          position: 'absolute', bottom: -2, right: -2,
          width: Math.round(size * 0.38), height: Math.round(size * 0.38),
          borderRadius: '50%',
          background: 'var(--green)',
          border: '1.5px solid var(--panel)',
          fontSize: Math.round(size * 0.22),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--bg)',
        }}>
          ✦
        </span>
      )}
    </span>
  );
}
