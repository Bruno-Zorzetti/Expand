
export type MStatus = 'idle' | 'run' | 'done' | 'late' | 'wait';

const STYLE: Record<MStatus, { label: string; c: string; bg: string }> = {
  idle: { label: 'A fazer',      c: 'var(--dim)',    bg: 'var(--panel-2)' },
  run:  { label: 'Em andamento', c: 'var(--accent)', bg: 'color-mix(in srgb,var(--accent) 12%,transparent)' },
  done: { label: 'Concluída',    c: 'var(--green)',  bg: 'color-mix(in srgb,var(--green) 12%,transparent)' },
  late: { label: 'Atrasada',     c: 'var(--red)',    bg: 'color-mix(in srgb,var(--red) 12%,transparent)' },
  wait: { label: 'Em revisão',   c: 'var(--warn)',   bg: 'color-mix(in srgb,var(--warn) 12%,transparent)' },
};

export default function MStatusBadge({
  status,
  label,
  size = 'md',
}: {
  status: MStatus;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const s = STYLE[status] ?? STYLE.idle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: 99,
      fontSize: size === 'sm' ? 10 : 11,
      fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
      background: s.bg, color: s.c,
      border: `1px solid color-mix(in srgb, ${s.c} 28%, transparent)`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
      {label ?? s.label}
    </span>
  );
}
