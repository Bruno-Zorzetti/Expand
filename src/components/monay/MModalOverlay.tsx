'use client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export default function MModalOverlay({
  open,
  onClose,
  children,
  maxWidth = 1100,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(6,12,10,.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth,
          background: 'var(--panel)',
          border: '1px solid var(--line-2)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
          position: 'relative', minHeight: 400,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--panel-2)', border: '1px solid var(--line)',
            color: 'var(--mut)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Fechar (Esc)"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
