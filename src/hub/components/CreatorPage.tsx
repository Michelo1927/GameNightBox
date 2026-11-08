import type { ReactNode } from 'react';
import type { Validation } from '../content';
import { ask } from '../ask';

interface Props {
  game: string;
  title: string;
  tip: ReactNode;
  validation: Validation;
  /** Mandatory fields still empty, e.g. "12 lettere su 21": shown in the bottom bar. */
  progress?: { done: number; total: number; label: string };
  full: boolean;
  onReset: () => void;
  children: ReactNode;
}

/** Shell of a game's creator (phone friendly): the form, then a bar to generate the code once everything is right. */
export default function CreatorPage({ game, title, tip, validation, progress, full, onReset, children }: Props) {
  const ok = validation.errors.length === 0;
  return (
    <div className={`creator theme-${game}`}>
      <header className="cr-header">
        <a className="back" href={`#/${game}`}>←</a>
        <h1>{title}</h1>
      </header>
      <p className="cr-tip">{tip}</p>
      {full && <p className="cr-warning">Spazio esaurito su questo dispositivo: le ultime modifiche non sono salvate.</p>}

      {children}

      <div className="cr-secondary">
        <a className="btn ghost" href={`#/${game}/carica`}>📥 Modifica da un codice</a>
        <button className="btn ghost" onClick={async () => (await ask('Cancellare tutto e ricominciare da zero?', 'Cancella tutto')) && onReset()}>🗑 Ricomincia da zero</button>
      </div>

      <div className="cr-bar">
        {progress && (
          <div className="cr-progress">
            <div style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
        )}
        {ok ? (
          <a className="btn primary big" href={`#/${game}/crea/codice`}>✨ Genera il codice</a>
        ) : (
          <>
            {progress && (
              <p className="cr-missing">
                {progress.done}/{progress.total} {progress.label}
              </p>
            )}
            <details className="cr-errors">
              <summary>Mancano ancora {validation.errors.length === 1 ? '1 cosa' : `${validation.errors.length} cose`}</summary>
              <ul>
                {validation.errors.slice(0, 12).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {validation.errors.length > 12 && <li>…e altre {validation.errors.length - 12}</li>}
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
