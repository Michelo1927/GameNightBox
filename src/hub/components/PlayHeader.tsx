import { useEffect, type ReactNode } from 'react';
import { toggleFullscreen } from '../keys';
import SoundButtons from './SoundButtons';

interface Props {
  back: string;
  title: string;
  /** Middle of the bar: progress, whose turn it is... */
  children?: ReactNode;
  undo: () => void;
  canUndo: boolean;
  onRanking: () => void;
  onSetup: () => void;
}

/** Top bar of a game screen. Ctrl+Z undoes, F toggles full screen. */
export default function PlayHeader({ back, title, children, undo, canUndo, onRanking, onSetup }: Props) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.('input, textarea')) return;
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
      <a className="back" href={back}>←</a>
      <h1 className="title">{title}</h1>
      <div className="play-info">{children}</div>
      <div className="header-actions">
        <button className="btn ghost icon" onClick={undo} disabled={!canUndo} title="Annulla l'ultima azione (Ctrl+Z)">
          ↶ Annulla
        </button>
        <SoundButtons />
        <button className="btn ghost icon" onClick={toggleFullscreen} title="Schermo intero (F)">⛶</button>
        <button className="btn ghost icon" onClick={onSetup} title="Squadre e opzioni">👥</button>
        <button className="btn primary" onClick={onRanking}>Classifica</button>
      </div>
    </header>
  );
}
