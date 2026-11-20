import type { AiSpec, Game } from '../../hub/games';
import icon from './icon';
import { addAlias } from '../../hub/nav';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Board from './pages/Board';
import Creator from './creator/Creator';
import ImportPage from './creator/ImportPage';
import ClaudePage, { buildPrompt } from './creator/ClaudePage';
import { findQuiz, quizzes } from './quiz/load';
import { importedQuizzes, saveImported } from './quiz/imported';
import { validateQuiz, type Quiz } from './quiz/schema';
import { tr } from '../../hub/i18n';

// Routes, in the tree of hub/nav.ts:
//   #/jeopardy                  list of quizzes
//   #/jeopardy/<slug>/setup     teams
//   #/jeopardy/<slug>/play      board
//   #/jeopardy/crea[/...]       quiz creator for phones (see creator/Creator.tsx)
//   #/jeopardy/carica[/<code>]  load a quiz from a shared code or link
//   #/jeopardy/claude           prompt for an AI chat + paste its answer
// The full editor is a separate page (editor.html), available only with `npm run dev`.

// Before the hub the quiz pages were at the top (#/q/<slug>/…, #/crea, #/carica/<code>, #/claude): links and codes
// shared back then still work, moved to their place in the tree.
addAlias(([first, ...rest]) => {
  if (first === 'q') return ['jeopardy', ...rest];
  if (first === 'crea' || first === 'carica' || first === 'claude') return ['jeopardy', first, ...rest];
  return null;
});
// The AI form of the pack page (hub/pack.ts); the quiz's own "Crea con l'IA" page is creator/ClaudePage.tsx.
const ai: AiSpec<Quiz> = {
  fields: [
    { key: 'topic', label: tr('Tema', 'Theme'), placeholder: tr('Es. cena di Natale, anni 90, Harry Potter…', 'E.g. Christmas dinner, the 90s, Harry Potter…') },
    { key: 'categories', label: tr('Oppure le tue 5 categorie (facoltativo)', 'Or your own 5 categories (optional)'), placeholder: tr('Es. Musica, Calcio, Cinema, Cucina, Geografia', 'E.g. Music, Football, Movies, Food, Geography') },
    { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con nonni e ragazzi', 'E.g. family with grandparents and teenagers') },
    { key: 'final', label: tr('Con domanda finale (le squadre scommettono i punti)', 'With a final question (teams bet their points)'), type: 'check' },
  ],
  initial: { topic: '', categories: '', audience: '', final: true },
  prompt: (f) => buildPrompt({ topic: String(f.topic ?? ''), categories: String(f.categories ?? ''), audience: String(f.audience ?? ''), final: !!f.final }),
  validate: validateQuiz,
  preview: (q) => (
    <>
      <b>{q.title}</b>
      <div className="tags">
        {(Array.isArray(q.categories) ? q.categories : []).map((c, i) => (
          <span key={i}>{c?.name}</span>
        ))}
      </div>
      {q.final && <p className="muted" style={{ margin: 0 }}>🏆 {tr('Con domanda finale', 'With a final question')}</p>}
    </>
  ),
};

const jeopardy: Game = {
  id: 'jeopardy',
  name: 'Jeopardy!',
  icon,
  tagline: tr(
    'Tabellone 5×5 di domande da 100 a 500 punti, con caselle a sorpresa e domanda finale.',
    'A 5×5 board of questions worth 100 to 500 points, with surprise squares and a final question.',
  ),
  tags: ['turno'],
  href: '#/jeopardy',
  content: {
    ai,
    title: (q: Quiz) => q.title,
    summary: (q: Quiz) =>
      tr(
        `${q.categories.length} categorie, ${q.categories.reduce((n, c) => n + c.questions.length, 0)} domande${q.final ? ' + finale' : ''}`,
        `${q.categories.length} categories, ${q.categories.reduce((n, c) => n + c.questions.length, 0)} questions${q.final ? ' + final' : ''}`,
      ),
    save: (q: Quiz) => saveImported(q),
    all: () => [...importedQuizzes(), ...quizzes].map((q) => ({ slug: q.slug, data: q.quiz, errors: q.errors, local: q.imported })),
    used: (q: Quiz) => q.categories.map((c) => c.name),
  },
  route([section, slug, view]) {
    if (section !== 'jeopardy') return null;
    if (!slug) return <Home />;
    if (slug === 'crea') return <Creator sub={view ?? ''} />;
    if (slug === 'claude') return <ClaudePage />;
    if (slug === 'carica') return <ImportPage key={view ?? ''} code={view || undefined} />;

    const loaded = findQuiz(decodeURIComponent(slug));
    if (!loaded || loaded.errors.length) return <Home />;
    if (view === 'play') return <Board key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} loaded={loaded} />;
  },
};

export default jeopardy;
