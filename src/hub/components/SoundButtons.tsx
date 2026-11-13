import { useMusicOn } from '../music';
import { useMuted } from '../sounds';
import { tr } from '../i18n';

/** Two switches: background music (🎵) and sound effects (🔊), each on its own. */
export default function SoundButtons() {
  const [music, setMusic] = useMusicOn();
  const [muted, setMuted] = useMuted();
  return (
    <>
      <button
        className={`btn ghost icon sound-btn ${music ? '' : 'off'}`}
        onClick={() => setMusic(!music)}
        title={music ? tr('Spegni la musica', 'Turn the music off') : tr('Accendi la musica', 'Turn the music on')}
        aria-pressed={music}
      >
        🎵
      </button>
      <button
        className="btn ghost icon sound-btn"
        onClick={() => setMuted(!muted)}
        title={muted ? tr('Attiva gli effetti sonori', 'Turn sound effects on') : tr('Disattiva gli effetti sonori', 'Turn sound effects off')}
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
