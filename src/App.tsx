import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { games } from './games';
import { norm, useHash } from './hub/nav';
import HubHome from './hub/HubHome';
import { TournamentRoute } from './hub/TournamentPages';
import Intro, { shouldPlayIntro } from './hub/components/Intro';
import { SoundDock } from './hub/components/SoundButtons';

// Hash routes (they work on GitHub Pages without server config), arranged as a tree of folders (hub/nav.ts).
// "#/" is the hub's home with the list of games; every other route belongs to a game (see src/games/*/index.tsx).

export default function App() {
  const hash = useHash();
  const parts = hash.replace(/^#\/?/, '').split('/');
  let page: ReactNode = null;
  if (parts[0] === 'torneo' && games.some((g) => g.id === parts[1])) {
    // A game inside the tournament: the game's own pages, kept apart from the same pages outside (other React tree,
    // other saves), so nothing played on its own leaks into the tournament or back.
    const inner = games.find((g) => g.id === parts[1])!.route(parts.slice(1));
    page = <div key="torneo" className="trn-scope">{inner}</div>;
  } else if (parts[0] === 'torneo') page = <TournamentRoute games={games} view={parts[1]} />;
  else {
    // Another game on the same content (#/<game>/<slug>~<n>/...): the game's pages for the content, redrawn from
    // scratch for each game (its save is picked from the address, see slotOfPage in hub/content.ts).
    const slot = /^(.+)~(\d+)$/.exec(parts[1] ?? '');
    const inner = slot ? [parts[0], slot[1], ...parts.slice(2)] : parts;
    for (const game of games) {
      page = game.route(inner);
      if (page) break;
    }
    if (slot && page) page = <Fragment key={`slot-${slot[2]}`}>{page}</Fragment>;
  }
  const [intro, setIntro] = useState(shouldPlayIntro);
  const [opened, setOpened] = useState(false);
  const openIntro = useCallback(() => setOpened(true), []);
  const endIntro = useCallback(() => setIntro(false), []);
  // La pagina uscita dalla scatola è già entrata in scena: le animazioni d'ingresso (hub/motion.css)
  // valgono dalla pagina successiva in poi.
  const [introHash, setIntroHash] = useState<string | null>(() => (intro ? norm(location.hash) : null));
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
