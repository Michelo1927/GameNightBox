import type { Game } from '../../hub/games';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Board from './pages/Board';
import Creator from './creator/Creator';
import ImportPage from './creator/ImportPage';
import ClaudePage from './creator/ClaudePage';
import { findQuiz } from './quiz/load';

// Routes (kept as they were before the hub, so old links and shared codes still work):
//   #/jeopardy         list of quizzes
//   #/q/<slug>/setup   teams
//   #/q/<slug>/play    board
//   #/crea[/...]       quiz creator for phones (see creator/Creator.tsx)
//   #/carica[/<code>]  load a quiz from a shared code or link
//   #/claude           prompt for claude.ai + paste its answer
// The full editor is a separate page (editor.html), available only with `npm run dev`.
const jeopardy: Game = {
  id: 'jeopardy',
  name: 'Jeopardy',
  icon: '🏆',
  tagline: 'Tabellone 5×5 di domande da 100 a 500 punti, con caselle a sorpresa e domanda finale.',
  tags: ['A squadre', 'Serve un host', 'Quiz da creare'],
  href: '#/jeopardy',
  route([section, slug, view]) {
    if (section === 'jeopardy') return <Home />;
    if (section === 'crea') return <Creator sub={slug ?? ''} />;
    if (section === 'claude') return <ClaudePage />;
    if (section === 'carica') return <ImportPage key={slug ?? ''} code={slug || undefined} />;
    if (section !== 'q') return null;

    const loaded = slug ? findQuiz(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length) return <Home />;
    if (view === 'play') return <Board key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} loaded={loaded} />;
  },
};

export default jeopardy;
