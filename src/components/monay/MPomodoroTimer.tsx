'use client';
import { useState, useEffect, useCallback } from 'react';
import MProgressBar from './MProgressBar';

type Phase = 'idle' | 'focus' | 'focus_paused' | 'focus_done' | 'break' | 'break_paused' | 'break_done';

export default function MPomodoroTimer({
  defaultMinutes = 45,
  defaultBreakMinutes = 10,
  onSessionComplete,
}: {
  defaultMinutes?: number;
  defaultBreakMinutes?: number;
  onSessionComplete?: (durationMin: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [focusMin, setFocusMin] = useState(defaultMinutes);
  const [breakMin, setBreakMin] = useState(defaultBreakMinutes);
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [totalSecs, setTotalSecs] = useState(defaultMinutes * 60);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  const isRunning = phase === 'focus' || phase === 'break';

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (phase === 'focus') setPhase('focus_done');
          else setPhase('break_done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, phase]);

  const startFocus = useCallback(() => {
    const secs = focusMin * 60;
    setTotalSecs(secs);
    setSecondsLeft(secs);
    setSessionStart(Date.now());
    setPhase('focus');
  }, [focusMin]);

  const startBreak = useCallback(() => {
    const secs = breakMin * 60;
    setTotalSecs(secs);
    setSecondsLeft(secs);
    setPhase('break');
  }, [breakMin]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSecondsLeft(focusMin * 60);
    setTotalSecs(focusMin * 60);
    setSessionStart(null);
  }, [focusMin]);

  const handleFocusDone = useCallback(() => {
    if (sessionStart) onSessionComplete?.(Math.round((Date.now() - sessionStart) / 60000));
    startBreak();
  }, [sessionStart, onSessionComplete, startBreak]);

  const handleBreakDone = useCallback(() => {
    reset();
  }, [reset]);

  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  const pct = totalSecs > 0 ? ((totalSecs - secondsLeft) / totalSecs) * 100 : 0;

  const isFocusPhase = phase === 'focus' || phase === 'focus_paused' || phase === 'focus_done';
  const isBreakPhase = phase === 'break' || phase === 'break_paused' || phase === 'break_done';
  const accent = phase === 'focus_done' || phase === 'break_done'
    ? 'var(--green)'
    : isFocusPhase
    ? 'var(--accent)'
    : isBreakPhase
    ? 'var(--warn)'
    : 'var(--dim)';

  if (phase === 'idle') {
    return (
      <div style={{
        padding: '16px 18px', background: 'var(--panel)',
        border: '1px solid var(--line)', borderRadius: 14,
      }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Configurar sessão
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--mut)', width: 42, flexShrink: 0 }}>Foco</span>
            <input
              type="number" min={5} max={120} value={focusMin}
              onChange={e => setFocusMin(Math.max(5, Math.min(120, Number(e.target.value))))}
              style={{
                width: 56, padding: '5px 8px', borderRadius: 8,
                border: '1px solid var(--line-2)', background: 'var(--panel-2)',
                color: 'var(--txt)', fontSize: 14, fontWeight: 700, textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>min</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--mut)', width: 42, flexShrink: 0 }}>Pausa</span>
            <input
              type="number" min={1} max={60} value={breakMin}
              onChange={e => setBreakMin(Math.max(1, Math.min(60, Number(e.target.value))))}
              style={{
                width: 56, padding: '5px 8px', borderRadius: 8,
                border: '1px solid var(--line-2)', background: 'var(--panel-2)',
                color: 'var(--warn)', fontSize: 14, fontWeight: 700, textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--dim)' }}>min</span>
          </div>
          <button
            onClick={startFocus}
            className="hx-btn hx-btn-primary"
            style={{ padding: '8px 16px', fontSize: 12.5, marginTop: 4 }}
          >
            ▶ Iniciar foco
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 18px', background: 'var(--panel)',
      border: `1px solid ${isRunning ? `color-mix(in srgb,${accent} 35%,transparent)` : 'var(--line)'}`,
      borderRadius: 14, transition: 'border-color .3s',
    }}>
      {/* Phase badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em',
          padding: '3px 9px', borderRadius: 20,
          background: `color-mix(in srgb,${accent} 16%,transparent)`,
          color: accent,
        }}>
          {isFocusPhase ? '🧠 Foco' : '☕ Pausa'}
        </span>
        {phase === 'focus_paused' || phase === 'break_paused' ? (
          <span style={{ fontSize: 10, color: 'var(--dim)', fontStyle: 'italic' }}>pausado</span>
        ) : null}
      </div>

      {/* Clock */}
      <div style={{
        fontFamily: 'var(--serif, Georgia, serif)',
        fontSize: 42, fontWeight: 700, letterSpacing: '-1px',
        color: accent, textAlign: 'center', lineHeight: 1, marginBottom: 10,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
      </div>

      <MProgressBar value={pct} color={accent} height={4} />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {phase === 'focus_done' && (
          <>
            <span style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 700 }}>✓ Foco concluído!</span>
            <button onClick={handleFocusDone} className="hx-btn hx-btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
              ☕ Iniciar pausa ({breakMin}min)
            </button>
            <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ padding: '7px 12px', fontSize: 11.5, color: 'var(--dim)' }}>
              ✕
            </button>
          </>
        )}
        {phase === 'break_done' && (
          <>
            <span style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 700 }}>✓ Pausa concluída!</span>
            <button onClick={handleBreakDone} className="hx-btn hx-btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
              ▶ Novo foco
            </button>
          </>
        )}
        {phase === 'focus' && (
          <>
            <button onClick={() => setPhase('focus_paused')} className="hx-btn hx-btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>
              ⏸ Pausar
            </button>
            <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ padding: '7px 14px', fontSize: 12, color: 'var(--dim)' }}>
              ✕
            </button>
          </>
        )}
        {phase === 'focus_paused' && (
          <>
            <button onClick={() => setPhase('focus')} className="hx-btn hx-btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
              ▶ Retomar
            </button>
            <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ padding: '7px 14px', fontSize: 12, color: 'var(--dim)' }}>
              ✕
            </button>
          </>
        )}
        {phase === 'break' && (
          <>
            <button onClick={() => setPhase('break_paused')} className="hx-btn hx-btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}>
              ⏸ Pausar pausa
            </button>
            <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ padding: '7px 14px', fontSize: 12, color: 'var(--dim)' }}>
              ✕ Encerrar
            </button>
          </>
        )}
        {phase === 'break_paused' && (
          <>
            <button onClick={() => setPhase('break')} className="hx-btn hx-btn-primary" style={{ padding: '7px 16px', fontSize: 12 }}>
              ▶ Retomar pausa
            </button>
            <button onClick={reset} className="hx-btn hx-btn-ghost" style={{ padding: '7px 14px', fontSize: 12, color: 'var(--dim)' }}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
