
export default function MEmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 24px',
      textAlign: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--dim)', maxWidth: 280, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="hx-btn hx-btn-ghost"
          style={{ marginTop: 8, fontSize: 13, padding: '8px 16px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
