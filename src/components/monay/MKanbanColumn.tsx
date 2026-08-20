import type { ReactNode } from 'react';

export default function MKanbanColumn({
  title,
  count,
  color = 'var(--accent)',
  children,
  footer,
}: {
  title: string;
  count: number;
  color?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minWidth: 240,
      background: 'var(--panel-2)',
      borderRadius: 14,
      border: '1px solid var(--line)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 9,
        background: `linear-gradient(90deg, color-mix(in srgb, ${color} 8%, transparent), transparent)`,
        borderTop: `2px solid ${color}`,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0,
          boxShadow: `0 0 8px ${color}80`,
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)', flex: 1 }}>{title}</span>
        <span style={{
          fontSize: 10, fontWeight: 800,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color, padding: '1px 7px', borderRadius: 99,
        }}>{count}</span>
      </div>

      <div style={{
        flex: 1, padding: '10px 10px 4px',
        display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto', minHeight: 80,
      }}>
        {children}
      </div>

      {footer && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--line)' }}>
          {footer}
        </div>
      )}
    </div>
  );
}
