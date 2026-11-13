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
import { contentLang, tr } from '../../../hub/i18n';

export default function Home() {
  const [imported, setImported] = useState(importedQuizzes);
  const [archived, setArchivedList] = useState(archivedSlugs);
  const remove = async (slug: string, title: string) => {
    if (!(await ask(tr(`Togliere "${title}" da questo dispositivo?`, `Remove "${title}" from this device?`), tr('Togli', 'Remove')))) return;
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
    description: q.quiz.description || (q.quiz.author ? `${tr('di', 'by')} ${q.quiz.author}` : q.quiz.categories?.map((c) => c.name).join(' · ')),
    info: q.errors.length ? [] : [tr(`${q.quiz.categories.length} categorie`, `${q.quiz.categories.length} categories`)],
    date: q.date,
    mine: q.imported,
    lang: contentLang(q.quiz),
    href: `#/jeopardy/${q.slug}/setup`,
    errors: q.errors,
    playing: !q.errors.length && hasSavedGame(q.slug),
    icon: <span className="icon-disk entry-emoji">{icon(q.quiz.title ?? q.slug)}</span>,
    actions: [
      ...(q.imported && !q.errors.length
        ? [{ icon: '✏️', title: tr('Apri nel creatore di quiz', 'Open in the quiz creator'), onClick: async () => (await replaceDraft(q.quiz, q.slug)) && go('/jeopardy/crea') }]
        : []),
      inArchive
        ? { icon: '📤', title: tr('Rimetti nella lista', 'Put back in the list'), onClick: () => archive(q.slug, false) }
        : { icon: '📦', title: tr('Sposta in archivio', 'Move to the archive'), onClick: () => archive(q.slug, true) },
      ...(q.imported ? [{ icon: '🗑', title: tr('Togli da questo dispositivo', 'Remove from this device'), onClick: () => remove(q.slug, q.quiz.title) }] : []),
    ],
  });
  const all = [...imported, ...quizzes];
  const shown = all.filter((q) => !isArchived(q)).map((q) => entry(q));
  const inArchive = all.filter(isArchived).map((q) => entry(q, true));

  return (
    <div className="page home theme-jeopardy">
      <BackButton label={tr('Tutti i giochi', 'All games')} />
      <TutorialButton tutorial={HOME_TUTORIAL} look="fab" />
      <header className="home-header">
        <h1 className="logo">
          <IconDisk className="logo-icon" icon={gameIcon} />
          JEOPARDY<span>QUIZ</span>
        </h1>
        <p className="muted">{tr('Scegli un quiz per iniziare', 'Choose a quiz to start')}</p>
        <div className="home-actions">
          <a className="btn primary" href="#/jeopardy/crea/nuovo">✏️ {tr('Crea un quiz', 'Create a quiz')}</a>
          <a className="btn ghost" href="#/jeopardy/claude">🤖 {tr("Crea con l'IA", 'Create with AI')}</a>
          <a className="btn ghost" href="#/jeopardy/carica">📥 {tr('Carica un quiz', 'Load a quiz')}</a>
          {import.meta.env.DEV && <a className="btn ghost" href="/editor.html">🛠 {tr('Editor (locale)', 'Editor (local)')}</a>}
        </div>
      </header>

      <EntryList
        game="jeopardy"
        entries={shown}
        masculine
        emptyMine={tr('Non hai ancora quiz tuoi: creane uno con i pulsanti in alto.', "You don't have quizzes of your own yet: make one with the buttons at the top.")}
        emptySite={
          quizzes.length
            ? tr('Tutti i quiz del sito sono in archivio: li trovi qui sotto.', "All the site's quizzes are in the archive: you'll find them below.")
            : tr('Nessun quiz trovato in quizzes/.', 'No quiz found in quizzes/.')
        }
      />

      {inArchive.length > 0 && (
        <details className="archive">
          <summary>
            📦 {tr('Archivio', 'Archive')} ({inArchive.length}) <span className="muted">· {tr('solo su questo dispositivo', 'only on this device')}</span>
          </summary>
          <EntryRows masculine entries={inArchive} played={played} onToggle={(slug) => setPlayedSet(setPlayed('jeopardy', slug, !played.has(slug)))} />
        </details>
      )}
    </div>
  );
}

// An icon guessed from the title; a generic one otherwise.
const ICONS: [RegExp, string][] = [
  [/natal|xmas|babbo|christmas/i, '🎄'],
  [/halloween|horror|paura|scary/i, '🎃'],
  [/music|canzon|sanremo|song/i, '🎵'],
  [/calcio|sport|olimpi|football|soccer|olympic/i, '⚽'],
  [/cine|film|serie|movie/i, '🎬'],
  [/cucina|cibo|cena|food/i, '🍝'],
  [/viagg|geograf|mondo|travel|world/i, '🌍'],
  [/scuola|maturit|esame|storia|school|exam|history/i, '📚'],
  [/compleann|festa|party|birthday/i, '🎉'],
  [/esempio|example|sample/i, '🧪'],
];
const icon = (title: string) => ICONS.find(([re]) => re.test(title))?.[1] ?? '❓';
