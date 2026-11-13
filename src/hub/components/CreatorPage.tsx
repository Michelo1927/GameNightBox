import type { ReactNode } from 'react';
import type { Validation } from '../content';
import { ask } from '../ask';
import { BackPill } from './BackButton';
import TutorialButton from './Tutorial';
import { CREATOR_TUTORIAL } from '../tutorials';
import { tr } from '../i18n';

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
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>{title}</h1>
        <TutorialButton tutorial={CREATOR_TUTORIAL} />
      </header>
      <p className="cr-tip">{tip}</p>
      {full && <p className="cr-warning">{tr('Spazio esaurito su questo dispositivo: le ultime modifiche non sono salvate.', 'This device is out of space: the latest changes are not saved.')}</p>}

      {children}

      <div className="cr-secondary">
        <a className="btn ghost" href={`#/${game}/carica`}>📥 {tr('Modifica da un codice', 'Edit from a code')}</a>
        <button className="btn ghost" onClick={async () => (await ask(tr('Cancellare tutto e ricominciare da zero?', 'Delete everything and start from scratch?'), tr('Cancella tutto', 'Delete everything'))) && onReset()}>🗑 {tr('Ricomincia da zero', 'Start from scratch')}</button>
      </div>

      <div className="cr-bar">
        {progress && (
          <div className="cr-progress">
            <div style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
        )}
        {ok ? (
          <a className="btn primary big" href={`#/${game}/crea/codice`}>✨ {tr('Genera il codice', 'Make the code')}</a>
        ) : (
          <>
            {progress && (
              <p className="cr-missing">
                {progress.done}/{progress.total} {progress.label}
              </p>
            )}
            <details className="cr-errors">
              <summary>
                {validation.errors.length === 1
                  ? tr('Manca ancora 1 cosa', 'Still missing: 1 thing')
                  : tr(`Mancano ancora ${validation.errors.length} cose`, `Still missing: ${validation.errors.length} things`)}
              </summary>
              <ul>
                {validation.errors.slice(0, 12).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {validation.errors.length > 12 && <li>{tr(`…e altre ${validation.errors.length - 12}`, `…and ${validation.errors.length - 12} more`)}</li>}
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
