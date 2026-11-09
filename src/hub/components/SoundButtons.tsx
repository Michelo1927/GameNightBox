import { useMusicOn } from '../music';
import { useMuted } from '../sounds';

/** Two switches: background music (🎵) and sound effects (🔊), each on its own. */
export default function SoundButtons() {
  const [music, setMusic] = useMusicOn();
  const [muted, setMuted] = useMuted();
  return (
    <>
      <button
        className={`btn ghost icon sound-btn ${music ? '' : 'off'}`}
        onClick={() => setMusic(!music)}
        title={music ? 'Spegni la musica' : 'Accendi la musica'}
        aria-pressed={music}
      >
        🎵
      </button>
      <button
        className="btn ghost icon sound-btn"
        onClick={() => setMuted(!muted)}
        title={muted ? 'Attiva gli effetti sonori' : 'Disattiva gli effetti sonori'}
        aria-pressed={!muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  );
}

/** Fixed corner with the two switches, on pages without a game bar (it hides when one is shown). */
export function SoundDock() {
  return (
    <div className="sound-dock">
      <SoundButtons />
    </div>
  );
}
