
export default function MClientHero({
  clienteName,
  imageUrl,
  taskTitle,
  datePrevista,
}: {
  clienteName: string;
  imageUrl?: string | null;
  taskTitle?: string;
  datePrevista?: string | null;
}) {
  const bg = imageUrl
    ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, var(--panel-2), var(--bg-deep, var(--bg)))' };

  const daysUntil = datePrevista
    ? Math.round((new Date(datePrevista + 'T00:00:00').getTime() - Date.now()) / 864e5)
    : null;

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 180, ...bg }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg,rgba(6,12,10,.3) 0%,rgba(6,12,10,.75) 60%,rgba(6,12,10,.92) 100%)',
      }} />
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column',
        height: '100%', minHeight: 180,
        justifyContent: 'flex-end', gap: 6,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
          color: 'var(--accent)', fontWeight: 700,
        }}>
          Tarefa prioritária · {clienteName}
        </div>
        {taskTitle && (
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            {taskTitle}
          </div>
        )}
        {daysUntil !== null && (
          <div style={{
            fontSize: 11.5, fontWeight: 600,
            color: daysUntil < 0 ? 'var(--red)' : daysUntil <= 2 ? 'var(--warn)' : 'var(--mut)',
          }}>
            {daysUntil < 0
              ? `${Math.abs(daysUntil)}d atrasada`
              : daysUntil === 0
              ? 'Vence hoje'
              : `${daysUntil}d restantes`}
          </div>
        )}
      </div>
    </div>
  );
}
