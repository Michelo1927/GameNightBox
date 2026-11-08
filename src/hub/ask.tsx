// Yes/no question in a dialog of the app. The browser's confirm() is not used: some browsers
// (embedded panes, some TV and in-app browsers) never show it and answer "no" by themselves.
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface Props {
  message: string;
  yes: string;
  done: (ok: boolean) => void;
}

function Dialog({ message, yes, done }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done(false);
      else if (e.key === 'Enter') done(true);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    // Capture phase: the game's own keys (Enter, Escape…) must not react while the question is open.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [done]);
  return (
    <div className="ask-backdrop" onClick={() => done(false)}>
      <div className="ask" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="ask-buttons">
          <button className="btn ghost" onClick={() => done(false)}>Annulla</button>
          <button className="btn primary" autoFocus onClick={() => done(true)}>{yes}</button>
        </div>
      </div>
    </div>
  );
}

/** Resolves true if the user confirms. `yes` is the label of the confirm button. */
export function ask(message: string, yes = 'Sì'): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let closed = false;
    const done = (ok: boolean) => {
      if (closed) return;
      closed = true;
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(<Dialog message={message} yes={yes} done={done} />);
  });
}
