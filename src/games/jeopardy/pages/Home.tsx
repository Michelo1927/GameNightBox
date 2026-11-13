import { useState } from 'react';
import { hasSavedGame } from '../state';
import { replaceDraft } from '../creator/draft';
import { go } from '../../../hub/nav';
import { archivedSlugs, setArchived } from '../quiz/archive';
import { importedQuizzes, removeImported } from '../quiz/imported';
import { quizzes, type LoadedQuiz } from '../quiz/load';
import { ask } from '../../../hub/ask';
import BackButton from '../../../hub/components/BackButton';
import EntryList, { EntryRows, type Entry } from '../../../hub/components/EntryList';
import { playedSlugs, setPlayed } from '../../../hub/played';
import { IconDisk } from '../../../hub/components/GameIcon';
import gameIcon from '../icon';
import TutorialButton from '../../../hub/components/Tutorial';
import { HOME_TUTORIAL } from '../creator/tutorials';

export default function Home() {
  const [imported, setImported] = useState(importedQuizzes);
  const [archived, setArchivedList] = useState(archivedSlugs);
  const remove = async (slug: string, title: string) => {
    if (!(await ask(`Togliere "${title}" da questo dispositivo?`, 'Togli'))) return;
    removeImported(slug);
    setArchivedList(setArchived(slug, false));
    setImported(importedQuizzes());
  };
  const archive = (slug: string, on: boolean) => setArchivedList(setArchived(slug, on));

  const [played, setPlayedSet] = useState(() => playedSlugs('jeopardy'));
  const isArchived = (q: LoadedQuiz) => archived.includes(q.slug);
  const entry = (q: LoadedQuiz, inArchive = false): Entry => ({
    slug: q.slug,
    title: q.quiz.title ?? q.slug,
    description: q.quiz.description || (q.quiz.author ? `di ${q.quiz.author}` : q.quiz.categories?.map((c) => c.name).join(' · ')),
    info: q.errors.length ? [] : [`${q.quiz.categories.length} categorie`],
    date: q.date,
    mine: q.imported,
    href: `#/jeopardy/${q.slug}/setup`,
    errors: q.errors,
    playing: !q.errors.length && hasSavedGame(q.slug),
    icon: <span className="icon-disk entry-emoji">{icon(q.quiz.title ?? q.slug)}</span>,
    actions: [
      ...(q.imported && !q.errors.length
        ? [{ icon: '✏️', title: 'Apri nel creatore di quiz', onClick: async () => (await replaceDraft(q.quiz, q.slug)) && go('/jeopardy/crea') }]
        : []),
      inArchive
        ? { icon: '📤', title: 'Rimetti nella lista', onClick: () => archive(q.slug, false) }
        : { icon: '📦', title: 'Sposta in archivio', onClick: () => archive(q.slug, true) },
      ...(q.imported ? [{ icon: '🗑', title: 'Togli da questo dispositivo', onClick: () => remove(q.slug, q.quiz.title) }] : []),
    ],
  });
  const all = [...imported, ...quizzes];
  const shown = all.filter((q) => !isArchived(q)).map((q) => entry(q));
  const inArchive = all.filter(isArchived).map((q) => entry(q, true));

  return (
    <div className="page home theme-jeopardy">
      <BackButton label="Tutti i giochi" />
      <TutorialButton tutorial={HOME_TUTORIAL} look="fab" />
      <header className="home-header">
        <h1 className="logo">
          <IconDisk className="logo-icon" icon={gameIcon} />
          JEOPARDY<span>QUIZ</span>
        </h1>
        <p className="muted">Scegli un quiz per iniziare</p>
        <div className="home-actions">
          <a className="btn primary" href="#/jeopardy/crea/nuovo">✏️ Crea un quiz</a>
          <a className="btn ghost" href="#/jeopardy/claude">🤖 Crea con l'IA</a>
          <a className="btn ghost" href="#/jeopardy/carica">📥 Carica un quiz</a>
          {import.meta.env.DEV && <a className="btn ghost" href="/editor.html">🛠 Editor (locale)</a>}
        </div>
      </header>

      <EntryList
        game="jeopardy"
        entries={shown}
        masculine
        emptyMine="Non hai ancora quiz tuoi: creane uno con i pulsanti in alto."
        emptySite={quizzes.length ? 'Tutti i quiz del sito sono in archivio: li trovi qui sotto.' : 'Nessun quiz trovato in quizzes/.'}
      />

      {inArchive.length > 0 && (
        <details className="archive">
          <summary>
            📦 Archivio ({inArchive.length}) <span className="muted">· solo su questo dispositivo</span>
          </summary>
          <EntryRows masculine entries={inArchive} played={played} onToggle={(slug) => setPlayedSet(setPlayed('jeopardy', slug, !played.has(slug)))} />
        </details>
      )}
    </div>
  );
}

// An icon guessed from the title; a generic one otherwise.
const ICONS: [RegExp, string][] = [
  [/natal|xmas|babbo/i, '🎄'],
  [/halloween|horror|paura/i, '🎃'],
  [/music|canzon|sanremo/i, '🎵'],
  [/calcio|sport|olimpi/i, '⚽'],
  [/cine|film|serie/i, '🎬'],
  [/cucina|cibo|cena|food/i, '🍝'],
  [/viagg|geograf|mondo/i, '🌍'],
  [/scuola|maturit|esame|storia/i, '📚'],
  [/compleann|festa|party/i, '🎉'],
  [/esempio/i, '🧪'],
];
const icon = (title: string) => ICONS.find(([re]) => re.test(title))?.[1] ?? '❓';
