'use client';
import { useState } from 'react';

type Tab = { id: string; label: string; embedUrl?: string };

export default function MPlaylistPlayer({
  tabs,
  defaultTab,
}: {
  tabs?: Tab[];
  defaultTab?: string;
}) {
  const defaultTabs: Tab[] = tabs ?? [
    { id: 'empresa', label: 'Empresa' },
    { id: 'cliente', label: 'Cliente' },
    { id: 'propria', label: 'Própria' },
  ];
  const [active, setActive] = useState(defaultTab ?? defaultTabs[0]?.id ?? '');
  const cur = defaultTabs.find((t) => t.id === active);

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--line)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {defaultTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              flex: 1, padding: '9px 6px', fontSize: 11.5, fontWeight: 700,
              background: active === t.id
                ? 'color-mix(in srgb,var(--accent) 10%,transparent)'
                : 'transparent',
              color: active === t.id ? 'var(--accent)' : 'var(--dim)',
              border: 'none', cursor: 'pointer',
              borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              transition: '.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '12px 14px', minHeight: 80 }}>
        {cur?.embedUrl ? (
          <iframe
            src={cur.embedUrl}
            width="100%" height="80"
            style={{ border: 'none', borderRadius: 8 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <button style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              border: 'none', cursor: 'pointer', fontSize: 14, color: '#0A1512',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>▶</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, color: 'var(--txt)', fontWeight: 600,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                Playlist {cur?.label ?? '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 2 }}>
                Sem URL configurada
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
