import { useEffect, useState } from 'react';
import { games } from './games';
import HubHome from './hub/HubHome';
import { SoundDock } from './hub/components/SoundButtons';

// Hash routes (they work on GitHub Pages without server config).
// "#/" is the hub's home with the list of games; every other route belongs to a game (see src/games/*/index.tsx).
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
  const parts = hash.replace(/^#\/?/, '').split('/');
  let page = null;
  for (const game of games) {
    page = game.route(parts);
    if (page) break;
  }
  return (
    <>
      {page ?? <HubHome games={games} />}
      <SoundDock />
    </>
  );
}
