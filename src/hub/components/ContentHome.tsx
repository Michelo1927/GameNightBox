import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { Loaded } from '../content';
import { loadSaved } from '../useSaved';
import { gameKey } from '../content';
import { startDraft } from '../draft';
import { go } from '../nav';
import { ask } from '../ask';
import BackButton from './BackButton';

interface Props<T> {
  game: string;
  name: string;
  icon: string;
  intro: string;
  /** "Come si gioca", shown folded. */
  rules: ReactNode;
  items: () => Loaded<T>[];
  onRemove: (slug: string) => void;
  title: (d: T) => string;
  description: (d: T) => string | undefined;
  tags: (d: T) => string[];
  hue: number;
}

/** First page of a game: what to play (from the site or made with Claude on this device). */
export default function ContentHome<T>({ game, name, icon, intro, rules, items, onRemove, title, description, tags, hue }: Props<T>) {
  const [list, setList] = useState(items);
  const remove = async (e: MouseEvent, c: Loaded<T>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(await ask(`Togliere "${title(c.data)}" da questo dispositivo?`, 'Togli'))) return;
    onRemove(c.slug);
    setList(items());
  };
  const edit = async (e: MouseEvent, c: Loaded<T>) => {
    e.preventDefault();
    e.stopPropagation();
    // A copy from the site becomes a new one on this device; one made here is replaced when its code is generated again.
    if (await startDraft(game, c.data, c.local ? c.slug : undefined)) go(`/${game}/crea`);
  };
  const local = list.filter((c) => c.local);
  const site = list.filter((c) => !c.local);

  const card = (c: Loaded<T>) => (
    <a
      key={c.slug}
      className={`quiz-card ${c.errors.length ? 'broken' : ''}`}
      href={c.errors.length ? undefined : `#/${game}/${c.slug}/setup`}
      style={c.errors.length ? undefined : ({ ['--hue' as string]: hue } as CSSProperties)}
    >
      <span className="quiz-icon">{icon}</span>
      <h2>{title(c.data) || c.slug}</h2>
      {description(c.data) && <p className="muted">{description(c.data)}</p>}
      {c.errors.length > 0 ? (
        <ul className="errors">
          {c.errors.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : (
        <div className="tags">
          {tags(c.data).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
      {!c.errors.length && hasGame(game, c.slug) && <span className="badge">Partita in corso</span>}
      {!c.errors.length && (
        <span className="card-actions">
          <button title="Modifica" onClick={(e) => edit(e, c)}>
            ✏️
          </button>
          {c.local && (
            <button title="Togli da questo dispositivo" onClick={(e) => remove(e, c)}>
              🗑
            </button>
          )}
        </span>
      )}
    </a>
  );

  return (
    <div className={`page home theme-${game}`}>
      <BackButton label="Tutti i giochi" />
      <header className="home-header">
        <h1 className="logo">
          {icon} {name.toUpperCase()}
        </h1>
        <p className="muted">{intro}</p>
        <div className="home-actions">
          <a className="btn primary" href={`#/${game}/crea/nuovo`}>✏️ Crea</a>
          <a className="btn primary" href={`#/${game}/claude`}>🤖 Crea con Claude</a>
          <a className="btn ghost" href={`#/${game}/carica`}>📥 Carica</a>
        </div>
      </header>

      <details className="rules-box">
        <summary>📖 Come si gioca</summary>
        {rules}
      </details>

      {local.length > 0 && (
        <>
          <h3>Creati su questo dispositivo</h3>
          <div className="quiz-grid">{local.map(card)}</div>
          {site.length > 0 && <h3>Del sito</h3>}
        </>
      )}
      <div className="quiz-grid">
        {site.map(card)}
        {list.length === 0 && <p className="muted">Ancora niente: creane uno.</p>}
      </div>
    </div>
  );
}

function hasGame(game: string, slug: string) {
  const g = loadSaved<{ started?: boolean }>(gameKey(game, slug));
  return !!g?.started;
}
