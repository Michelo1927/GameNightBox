import { useState, type ReactNode } from 'react';
import type { Loaded } from '../content';
import { loadSaved } from '../useSaved';
import { gameKey } from '../content';
import { startDraft } from '../draft';
import { go } from '../nav';
import { ask } from '../ask';
import BackButton from './BackButton';
import EntryList, { type Entry } from './EntryList';
import { IconDisk } from './GameIcon';
import TutorialButton from './Tutorial';
import { GAME_TUTORIAL } from '../tutorials';
import { contentLang, tr } from '../i18n';

interface Props<T> {
  game: string;
  name: string;
  icon: ReactNode;
  intro: string;
  /** "Come si gioca", shown folded. */
  rules: ReactNode;
  items: () => Loaded<T>[];
  onRemove: (slug: string) => void;
  title: (d: T) => string;
  description: (d: T) => string | undefined;
  tags: (d: T) => string[];
}

/** First page of a game: what to play, from the site or saved on this device (made here, with an AI or loaded from a code). */
export default function ContentHome<T>({ game, name, icon, intro, rules, items, onRemove, title, description, tags }: Props<T>) {
  const [list, setList] = useState(items);
  const remove = async (c: Loaded<T>) => {
    if (!(await ask(tr(`Togliere "${title(c.data)}" da questo dispositivo?`, `Remove "${title(c.data)}" from this device?`), tr('Togli', 'Remove')))) return;
    onRemove(c.slug);
    setList(items());
  };
  const edit = async (c: Loaded<T>) => {
    // A copy from the site becomes a new one on this device; one made here is replaced when its code is generated again.
    if (await startDraft(game, c.data, c.local ? c.slug : undefined)) go(`/${game}/crea`);
  };
  const entries: Entry[] = list.map((c) => ({
    slug: c.slug,
    title: title(c.data) || c.slug,
    description: description(c.data),
    info: c.errors.length ? [] : tags(c.data),
    date: c.date,
    mine: c.local,
    lang: contentLang(c.data),
    href: `#/${game}/${c.slug}/setup`,
    errors: c.errors,
    playing: hasGame(game, c.slug),
    icon: <IconDisk icon={icon} />,
    actions: [
      ...(c.errors.length ? [] : [{ icon: '✏️', title: c.local ? tr('Modifica', 'Edit') : tr('Modifica una copia', 'Edit a copy'), onClick: () => edit(c) }]),
      ...(c.local ? [{ icon: '🗑', title: tr('Togli da questo dispositivo', 'Remove from this device'), onClick: () => remove(c) }] : []),
    ],
  }));

  return (
    <div className={`page home theme-${game}`}>
      <BackButton label={tr('Tutti i giochi', 'All games')} />
      <TutorialButton tutorial={GAME_TUTORIAL} look="fab" />
      <header className="home-header">
        <h1 className="logo">
          <IconDisk className="logo-icon" icon={icon} />
          {name.toUpperCase()}
        </h1>
        <p className="muted">{intro}</p>
        <div className="home-actions">
          <a className="btn primary" href={`#/${game}/crea/nuovo`}>✏️ {tr('Crea', 'Create')}</a>
          <a className="btn primary" href={`#/${game}/claude`}>🤖 {tr("Crea con l'IA", 'Create with AI')}</a>
          <a className="btn ghost" href={`#/${game}/carica`}>📥 {tr('Carica', 'Load')}</a>
        </div>
      </header>

      <details className="rules-box">
        <summary>📖 {tr('Come si gioca', 'How to play')}</summary>
        {rules}
      </details>

      <EntryList game={game} entries={entries} />
    </div>
  );
}

function hasGame(game: string, slug: string) {
  const g = loadSaved<{ started?: boolean }>(gameKey(game, slug));
  return !!g?.started;
}
