import type { Game } from '../../hub/games';
import icon from './icon';
import { addAlias } from '../../hub/nav';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Board from './pages/Board';
import Creator from './creator/Creator';
import ImportPage from './creator/ImportPage';
import ClaudePage from './creator/ClaudePage';
import { findQuiz } from './quiz/load';

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
const jeopardy: Game = {
  id: 'jeopardy',
  name: 'Jeopardy',
  icon,
  tagline: 'Tabellone 5×5 di domande da 100 a 500 punti, con caselle a sorpresa e domanda finale.',
  tags: ['host'],
  href: '#/jeopardy',
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
