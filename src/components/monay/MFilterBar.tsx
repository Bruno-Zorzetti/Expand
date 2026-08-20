'use client';
import { useState } from 'react';

export type MFilterDef = {
  key: string;
  placeholder: string;
  options: { value: string; label: string }[];
};

export default function MFilterBar({
  filters = [],
  onFilter,
  view = 'kanban',
  onViewChange,
  searchPlaceholder = 'Buscar tarefas…',
  onSearch,
}: {
  filters?: MFilterDef[];
  onFilter?: (key: string, value: string) => void;
  view?: 'kanban' | 'lista';
  onViewChange?: (v: 'kanban' | 'lista') => void;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}) {
  const [search, setSearch] = useState('');

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      flexWrap: 'wrap', marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--panel)', border: '1px solid var(--line-2)',
        borderRadius: 10, padding: '7px 12px',
        minWidth: 200, flex: 1, maxWidth: 280,
      }}>
        <span style={{ color: 'var(--dim)', fontSize: 13, flexShrink: 0 }}>🔍</span>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); onSearch?.(e.target.value); }}
          placeholder={searchPlaceholder}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--txt)', fontSize: 13, width: '100%',
          }}
        />
      </div>

      {filters.map((f) => (
        <select
          key={f.key}
          onChange={(e) => onFilter?.(f.key, e.target.value)}
          style={{
            background: 'var(--panel)', border: '1px solid var(--line-2)',
            borderRadius: 10, padding: '7px 12px', fontSize: 12.5,
            color: 'var(--txt)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">{f.placeholder}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {onViewChange && (
        <div style={{
          display: 'flex', background: 'var(--panel)',
          border: '1px solid var(--line-2)', borderRadius: 10,
          overflow: 'hidden', marginLeft: 'auto', flexShrink: 0,
        }}>
          {(['kanban', 'lista'] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                background: view === v
                  ? 'color-mix(in srgb,var(--accent) 15%,transparent)'
                  : 'transparent',
                color: view === v ? 'var(--accent)' : 'var(--dim)',
                border: 'none', cursor: 'pointer', transition: '.15s',
              }}
            >
              {v === 'kanban' ? '⊞ Kanban' : '≡ Lista'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
