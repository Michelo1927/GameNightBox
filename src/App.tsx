import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Board from './pages/Board';
import Creator from './creator/Creator';
import ImportPage from './creator/ImportPage';
import ClaudePage from './creator/ClaudePage';
import { findQuiz } from './quiz/load';

// Hash routes (work on GitHub Pages without server config):
//   #/                 home
//   #/q/<slug>/setup   teams
//   #/q/<slug>/play    board
//   #/crea[/...]       quiz creator for phones (see creator/Creator.tsx)
//   #/carica[/<code>]  load a quiz from a shared code or link
//   #/claude           prompt for claude.ai + paste its answer
// The full editor is a separate page (editor.html), available only with `npm run dev`.
function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const [, section, slug, view] = hash.replace(/^#/, '').split('/');
  if (section === 'crea') return <Creator sub={slug ?? ''} />;
  if (section === 'claude') return <ClaudePage />;
  if (section === 'carica') return <ImportPage key={slug ?? ''} code={slug || undefined} />;

  const loaded = section === 'q' && slug ? findQuiz(decodeURIComponent(slug)) : undefined;

  if (!loaded || loaded.errors.length) return <Home />;
  if (view === 'play') return <Board key={loaded.slug} loaded={loaded} />;
  return <Setup key={loaded.slug} loaded={loaded} />;
}
