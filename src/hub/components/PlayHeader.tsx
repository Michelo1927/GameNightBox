import { useEffect, type ReactNode } from 'react';
import { toggleFullscreen } from '../keys';
import SoundButtons from './SoundButtons';
import { BackPill } from './BackButton';
import { tr } from '../i18n';

interface Props {
  title: string;
  /** Middle of the bar: progress, whose turn it is... */
  children?: ReactNode;
  undo: () => void;
  canUndo: boolean;
  onRanking: () => void;
  onSetup: () => void;
}

/** Top bar of a game screen. Ctrl+Z undoes, F toggles full screen. */
export default function PlayHeader({ title, children, undo, canUndo, onRanking, onSetup }: Props) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const field = (e.target as HTMLElement).closest?.('input, textarea') as HTMLInputElement | null;
      // In a text field Ctrl+Z undoes the typing; only an empty field (e.g. the answer box, always focused) undoes the game.
      if (field && (field.value || !(e.ctrlKey || e.metaKey))) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFullscreen();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [undo]);

  return (
    <header className="board-header play-header">
      <BackPill label={tr('Esci', 'Exit')} />
      <h1 className="title">{title}</h1>
      <div className="play-info">{children}</div>
      <div className="header-actions">
        <button className="btn ghost icon" onClick={undo} disabled={!canUndo} title={tr("Annulla l'ultima azione (Ctrl+Z)", 'Undo the last action (Ctrl+Z)')}>
          ↶ {tr('Annulla', 'Undo')}
        </button>
        <SoundButtons />
        <button className="btn ghost icon" onClick={toggleFullscreen} title={tr('Schermo intero (F)', 'Full screen (F)')}>⛶</button>
        <button className="btn ghost icon" onClick={onSetup} title={tr('Squadre e opzioni', 'Teams and options')}>👥</button>
        <button className="btn primary" onClick={onRanking}>{tr('Classifica', 'Scores')}</button>
      </div>
    </header>
  );
}
