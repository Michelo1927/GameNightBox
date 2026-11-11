import { useCallback, useEffect, useState } from 'react';
import { games } from './games';
import HubHome from './hub/HubHome';
import Intro, { shouldPlayIntro } from './hub/components/Intro';
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
  const [intro, setIntro] = useState(shouldPlayIntro);
  const [opened, setOpened] = useState(false);
  const openIntro = useCallback(() => setOpened(true), []);
  const endIntro = useCallback(() => setIntro(false), []);
  // La pagina uscita dalla scatola è già entrata in scena: le animazioni d'ingresso (hub/motion.css)
  // valgono dalla pagina successiva in poi.
  const [introHash, setIntroHash] = useState<string | null>(() => (intro ? location.hash : null));
  useEffect(() => {
    if (introHash !== null && hash !== introHash) setIntroHash(null);
  }, [hash, introHash]);
  const enter = introHash === null || hash !== introHash ? ' enter-on' : '';
  const shell = `app-shell${enter}${intro ? ` app-intro${opened ? '' : ' app-waiting'}` : ''}`;
  return (
    <>
      <div className={shell}>
        {page ?? <HubHome games={games} />}
        <SoundDock />
      </div>
      {intro && <Intro onOpen={openIntro} onDone={endIntro} />}
    </>
  );
}
