import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { HUB_NAME, type Game } from './games';
import GameTags from './components/GameTags';
import TutorialButton from './components/Tutorial';
import { HUB_TUTORIAL } from './tutorials';
import LangSwitch from './components/LangSwitch';
import { tr } from './i18n';

/** Games that fit on a TV in three rows of three; from the tenth on, rows of four. */
const ROW_OF_THREE_MAX = 9;

/** The cards still below the bottom of the screen: what the "more games" pill counts and scrolls to. */
function useHiddenCards(grid: RefObject<HTMLDivElement | null>) {
  const [hidden, setHidden] = useState<Element[]>([]);
  useEffect(() => {
    const cards = [...(grid.current?.children ?? [])];
    const below = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Only the cards cut by the bottom edge or under it: the ones above were already seen.
          if (e.intersectionRatio < 0.75 && e.boundingClientRect.top > 0) below.add(e.target);
          else below.delete(e.target);
        }
        setHidden(cards.filter((c) => below.has(c)));
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [grid]);
  return hidden;
}

/** First page of the site: the marquee sign and one card per game. */
export default function HubHome({ games }: { games: Game[] }) {
  const grid = useRef<HTMLDivElement>(null);
  const hidden = useHiddenCards(grid);

  return (
    <div className="page home hub-home">
      <TutorialButton tutorial={HUB_TUTORIAL} look="fab" />
      <LangSwitch />
      <header className="hub-hero">
        <h1 className="marquee">
          <span>{HUB_NAME.main}</span>
          <span className="marquee-accent">{HUB_NAME.accent}</span>
        </h1>
        <p>{tr('Giochi a squadre per la serata: tutti nella stessa stanza, davanti allo stesso schermo.', 'Team games for a night in: everyone in the same room, in front of the same screen.')}</p>
      </header>

      <div className={`game-grid ${games.length > ROW_OF_THREE_MAX ? 'many' : ''}`} ref={grid}>
        {games.map((g) => (
          <a key={g.id} className={`game-card theme-${g.id}`} href={g.href}>
            <span className="game-icon" aria-hidden>{g.icon}</span>
            <span className="game-text" style={{ '--tag-count': g.tags.length } as CSSProperties}>
              <h2>{g.name}</h2>
              <p>{g.tagline}</p>
            </span>
            <GameTags tags={g.tags} />
          </a>
        ))}
      </div>

      {hidden.length > 0 && (
        <div className="more-games">
          <button onClick={() => hidden[0].scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            {hidden.length === 1 ? tr('Un altro gioco ↓', 'One more game ↓') : tr(`Altri ${hidden.length} giochi ↓`, `${hidden.length} more games ↓`)}
          </button>
        </div>
      )}
    </div>
  );
}
