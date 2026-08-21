'use client';
import MPomodoroTimer from './MPomodoroTimer';
import FocoPlayer from '@/components/expand/FocoPlayer';

export default function MonayFoco() {
  return (
    <>
      <div>
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
          color: 'var(--dim)', fontWeight: 700, marginBottom: 8,
        }}>
          Sessão de foco
        </div>
        <MPomodoroTimer defaultMinutes={45} />
      </div>
      <div style={{ marginTop: 16 }}>
        <FocoPlayer />
      </div>
    </>
  );
}
