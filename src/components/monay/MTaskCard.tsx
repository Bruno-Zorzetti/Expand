import MStatusBadge, { type MStatus } from './MStatusBadge';
import MPriorityDot, { type MPriority } from './MPriorityDot';
import MAgentAvatar from './MAgentAvatar';

export default function MTaskCard({
  title,
  status = 'idle',
  priority = 'normal',
  clienteName,
  datePrevista,
  sla,
  responsaveis = [],
  agent,
  tags = [],
  commentCount,
  attachCount,
  onClick,
  compact = false,
}: {
  title: string;
  status?: MStatus;
  priority?: MPriority;
  clienteName?: string;
  datePrevista?: string | null;
  sla?: string | null;
  responsaveis?: { name: string; type?: 'human' | 'ai' }[];
  agent?: string | null;
  tags?: string[];
  commentCount?: number;
  attachCount?: number;
  onClick?: () => void;
  compact?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isLate = status !== 'done' && datePrevista != null && datePrevista < today;
  const borderColor = status === 'run'
    ? 'var(--accent)'
    : status === 'done'
    ? 'var(--green)'
    : isLate
    ? 'var(--red)'
    : 'var(--line)';

  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--panel)',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 10,
        padding: compact ? '10px 12px' : '12px 14px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {/* Row 1: priority dot + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <MPriorityDot priority={priority} />
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 13.5, fontWeight: 700, color: 'var(--txt)',
          lineHeight: 1.35, wordBreak: 'break-word',
        }}>
          {title}
        </div>
      </div>

      {/* Row 2: client + date */}
      {(clienteName || datePrevista || sla) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {clienteName && (
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
              {clienteName}
            </span>
          )}
          {datePrevista && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, marginLeft: clienteName ? 'auto' : 0,
              color: isLate ? 'var(--red)' : 'var(--dim)',
            }}>
              📅 {fmt(datePrevista)}
            </span>
          )}
          {sla && !datePrevista && (
            <span style={{ fontSize: 10.5, color: 'var(--dim)', marginLeft: 'auto' }}>
              ⏱ {sla}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 5,
              background: 'var(--panel-2)', color: 'var(--dim)',
              border: '1px solid var(--line)',
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* Row 3: status + agent badge + avatars + meta */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <MStatusBadge status={status} size="sm" />
          {agent && (
            <span style={{
              fontSize: 9.5, padding: '1px 6px', borderRadius: 5,
              background: 'color-mix(in srgb,var(--green) 12%,transparent)',
              color: 'var(--green)', fontWeight: 700, letterSpacing: '.04em',
            }}>IA</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {responsaveis.slice(0, 3).map((r, i) => (
              <div key={r.name} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }}>
                <MAgentAvatar name={r.name} type={r.type ?? 'human'} size={22} />
              </div>
            ))}
            {responsaveis.length > 3 && (
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                fontSize: 9, background: 'var(--panel-2)',
                border: '1px solid var(--line)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--dim)', fontWeight: 700, marginLeft: -8,
              }}>
                +{responsaveis.length - 3}
              </span>
            )}
          </div>
          {(commentCount !== undefined || attachCount !== undefined) && (
            <div style={{ display: 'flex', gap: 8, color: 'var(--dim)', fontSize: 11 }}>
              {commentCount !== undefined && <span>💬 {commentCount}</span>}
              {attachCount !== undefined && <span>📎 {attachCount}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
