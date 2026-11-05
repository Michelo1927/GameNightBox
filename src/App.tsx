import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Board from './pages/Board';
import { findQuiz } from './quiz/load';

// Hash routes (work on GitHub Pages without server config):
//   #/                 home
//   #/q/<slug>/setup   teams
//   #/q/<slug>/play    board
// The editor is a separate page (editor.html), available only with `npm run dev`.
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
  const [, , slug, view] = hash.replace(/^#/, '').split('/');
  const loaded = slug ? findQuiz(decodeURIComponent(slug)) : undefined;

  if (!loaded || loaded.errors.length) return <Home />;
  if (view === 'play') return <Board key={loaded.slug} loaded={loaded} />;
  return <Setup key={loaded.slug} loaded={loaded} />;
}
