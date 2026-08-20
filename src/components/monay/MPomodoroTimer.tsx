'use client';
import { useState, useEffect, useCallback } from 'react';
import MProgressBar from './MProgressBar';

type PomState = 'idle' | 'running' | 'paused' | 'done';

export default function MPomodoroTimer({
  defaultMinutes = 45,
  onSessionComplete,
}: {
  defaultMinutes?: number;
  onSessionComplete?: (durationMin: number) => void;
}) {
  const [state, setState] = useState<PomState>('idle');
  const [targetMin, setTargetMin] = useState(defaultMinutes);
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  useEffect(() => {
    if (state !== 'running') return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { setState('done'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  const start = useCallback(() => {
    setSecondsLeft(targetMin * 60);
    setSessionStart(Date.now());
    setState('running');
  }, [targetMin]);

  const reset = useCallback(() => {
    setState('idle');
    setSecondsLeft(targetMin * 60);
    setSessionStart(null);
  }, [targetMin]);

  const handleDone = useCallback(() => {
    if (sessionStart) onSessionComplete?.(Math.round((Date.now() - sessionStart) / 60000));
    reset();
  }, [sessionStart, onSessionComplete, reset]);

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const pct = state === 'idle' ? 0 : ((targetMin * 60 - secondsLeft) / (targetMin * 60)) * 100;
  const accent = state === 'done' ? 'var(--green)' : state === 'running' ? 'var(--accent)' : 'var(--dim)';

  return (
    <div style={{
      padding: '16px 18px', background: 'var(--panel)',
      border: `1px solid ${state === 'running' ? 'color-mix(in srgb,var(--accent) 30%,transparent)' : 'var(--line)'}`,
      borderRadius: 14, transition: 'border-color .3s',
    }}>
      {state === 'idle' ? (
        <>
          <div style={{
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
            color: 'var(--dim)', fontWeight: 700, marginBottom: 12,
          }}>
            Iniciar foco
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min={5} max={120} value={targetMin}
              onChange={(e) => setTargetMin(Math.max(5, Math.min(120, Number(e.target.value))))}
              style={{
                width: 60, padding: '6px 10px', borderRadius: 8,
                border: '1px solid var(--line-2)', background: 'var(--panel-2)',
                color: 'var(--txt)', fontSize: 15, fontWeight: 700, textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--dim)' }}>minutos</span>
            <button onClick={start} className="hx-btn hx-btn-primary"
              style={{ padding: '7px 16px', fontSize: 12.5, marginLeft: 'auto' }}>
              ▶ Iniciar
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontFamily: 'var(--serif, Georgia, serif)',
            fontSize: 38, fontWeight: 700, letterSpacing: '-1px',
            color: accent, textAlign: 'center', lineHeight: 1, marginBottom: 8,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
          </div>
          <MProgressBar value={pct} color={accent} height={4} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {state === 'done' ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
                  ✓ Foco concluído!
                </span>
                <button onClick={handleDone} className="hx-btn hx-btn-primary"
                  style={{ padding: '7px 16px', fontSize: 12.5 }}>
                  Registrar sessão
                </button>
              </>
            ) : state === 'running' ? (
              <>
                <button onClick={() => setState('paused')} className="hx-btn hx-btn-ghost"
                  style={{ padding: '7px 16px', fontSize: 12.5 }}>
                  ⏸ Pausar
                </button>
                <button onClick={reset} className="hx-btn hx-btn-ghost"
                  style={{ padding: '7px 16px', fontSize: 12, color: 'var(--dim)' }}>
                  ✕ Cancelar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setState('running')} className="hx-btn hx-btn-primary"
                  style={{ padding: '7px 16px', fontSize: 12.5 }}>
                  ▶ Retomar
                </button>
                <button onClick={reset} className="hx-btn hx-btn-ghost"
                  style={{ padding: '7px 16px', fontSize: 12, color: 'var(--dim)' }}>
                  ✕ Cancelar
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
