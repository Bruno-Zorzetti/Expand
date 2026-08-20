
export type MPriority = 'urgente' | 'alta' | 'normal' | 'baixa';

const P: Record<MPriority, { c: string; label: string }> = {
  urgente: { c: 'var(--red)',    label: 'Urgente' },
  alta:    { c: 'var(--warn)',   label: 'Alta' },
  normal:  { c: 'var(--accent)', label: 'Normal' },
  baixa:   { c: 'var(--dim)',    label: 'Baixa' },
};

export default function MPriorityDot({
  priority,
  showLabel = false,
  size = 8,
}: {
  priority: MPriority;
  showLabel?: boolean;
  size?: number;
}) {
  const p = P[priority] ?? P.normal;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: p.c, fontWeight: 700 }}>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: p.c, flexShrink: 0,
        boxShadow: `0 0 6px ${p.c}80`,
      }} />
      {showLabel && p.label}
    </span>
  );
}
