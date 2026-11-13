import { useState, type CSSProperties, type MouseEvent } from 'react';
import { hasSavedGame } from '../state';
import { replaceDraft } from '../creator/draft';
import { go } from '../../../hub/nav';
import { archivedSlugs, setArchived } from '../quiz/archive';
import { importedQuizzes, removeImported } from '../quiz/imported';
import { quizzes, type LoadedQuiz } from '../quiz/load';
import { ask } from '../../../hub/ask';
import BackButton from '../../../hub/components/BackButton';
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

  const isArchived = (q: LoadedQuiz) => archived.includes(q.slug);
  const shownImported = imported.filter((q) => !isArchived(q));
  const shownSite = quizzes.filter((q) => !isArchived(q));
  const inArchive = [...imported, ...quizzes].filter(isArchived);
  const card = (q: LoadedQuiz, inArchive = false) => (
    <QuizCard
      key={q.slug}
      loaded={q}
      archived={inArchive}
      onArchive={() => archive(q.slug, !inArchive)}
      onRemove={q.imported ? () => remove(q.slug, q.quiz.title) : undefined}
      onEdit={q.imported && !q.errors.length ? async () => (await replaceDraft(q.quiz, q.slug)) && go('/jeopardy/crea') : undefined}
    />
  );

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

      {shownImported.length > 0 && (
        <>
          <h3>Caricati su questo dispositivo</h3>
          <div className="quiz-grid">{shownImported.map((q) => card(q))}</div>
          {shownSite.length > 0 && <h3>Quiz del sito</h3>}
        </>
      )}
      <div className="quiz-grid">
        {shownSite.map((q) => card(q))}
        {quizzes.length === 0 && <p className="muted">Nessun quiz trovato in quizzes/.</p>}
        {quizzes.length > 0 && shownSite.length === 0 && shownImported.length === 0 && (
          <p className="muted">Tutti i quiz sono in archivio: li trovi qui sotto.</p>
        )}
      </div>

      {inArchive.length > 0 && (
        <details className="archive">
          <summary>
            📦 Archivio ({inArchive.length}) <span className="muted">· solo su questo dispositivo</span>
          </summary>
          <div className="quiz-grid">{inArchive.map((q) => card(q, true))}</div>
        </details>
      )}
    </div>
  );
}

interface CardProps {
  loaded: LoadedQuiz;
  archived?: boolean;
  onArchive: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
}

function QuizCard({ loaded: { slug, quiz, errors }, archived, onArchive, onRemove, onEdit }: CardProps) {
  // Buttons inside the card link: they must not open the quiz.
  const action = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <a
      className={`quiz-card ${errors.length ? 'broken' : ''} ${archived ? 'archived' : ''}`}
      href={errors.length ? undefined : `#/jeopardy/${slug}/setup`}
      style={errors.length ? undefined : ({ ['--hue' as string]: hue(slug) } as CSSProperties)}
    >
      <span className="quiz-icon">{icon(quiz.title ?? slug)}</span>
      <h2>{quiz.title ?? slug}</h2>
      {(quiz.description || quiz.author) && <p className="muted">{quiz.description || `di ${quiz.author}`}</p>}
      {errors.length > 0 ? (
        <ul className="errors">
          {errors.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : (
        <div className="tags">
          {quiz.categories.map((c) => (
            <span key={c.name}>{c.name}</span>
          ))}
        </div>
      )}
      {!errors.length && hasSavedGame(slug) && <span className="badge">Partita in corso</span>}
      <span className="card-actions">
        {onEdit && (
          <button title="Apri nel creatore di quiz" onClick={action(onEdit)}>
            ✏️ Modifica
          </button>
        )}
        <button title={archived ? 'Rimetti nella prima schermata' : 'Sposta in archivio'} onClick={action(onArchive)}>
          {archived ? '📤 Ripristina' : '📦 Archivia'}
        </button>
        {onRemove && (
          <button title="Togli da questo dispositivo" onClick={action(onRemove)}>
            🗑
          </button>
        )}
      </span>
    </a>
  );
}

/** Stable color per quiz, in the blue-violet-teal range so cards stay readable with gold/white text. */
function hue(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [225, 250, 270, 290, 200, 185, 330, 210][h % 8];
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
