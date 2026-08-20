import MAgentAvatar from './MAgentAvatar';

export default function MChatBubble({
  author,
  content,
  type = 'human',
  time,
  actions,
}: {
  author: string;
  content: string;
  type?: 'human' | 'ai';
  time?: string;
  actions?: { icon: string; label: string; onClick: () => void }[];
}) {
  const isAI = type === 'ai';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
      <MAgentAvatar name={author} type={type} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)' }}>{author}</span>
          {isAI && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.06em', padding: '1px 6px', borderRadius: 4,
              background: 'color-mix(in srgb,var(--green) 15%,transparent)',
              color: 'var(--green)',
            }}>IA</span>
          )}
          {time && (
            <span style={{ fontSize: 10.5, color: 'var(--dim)', marginLeft: 'auto' }}>{time}</span>
          )}
        </div>
        <div style={{
          fontSize: 13.5, color: 'var(--txt)', lineHeight: 1.6,
          background: 'var(--panel-2)',
          border: '1px solid var(--line)',
          borderRadius: isAI ? '4px 14px 14px 14px' : '14px 14px 14px 4px',
          padding: '9px 13px',
        }}>
          {content}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  background: 'var(--panel)', border: '1px solid var(--line)',
                  color: 'var(--mut)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
