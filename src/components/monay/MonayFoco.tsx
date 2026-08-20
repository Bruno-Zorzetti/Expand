'use client';
import MPomodoroTimer from './MPomodoroTimer';
import MPlaylistPlayer from './MPlaylistPlayer';

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
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
          color: 'var(--dim)', fontWeight: 700, marginBottom: 8,
        }}>
          Ambiente
        </div>
        <MPlaylistPlayer />
      </div>
    </>
  );
}
