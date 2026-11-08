import { HUB_NAME, type Game } from './games';

/** First page of the site: the marquee sign and one card per game. */
export default function HubHome({ games }: { games: Game[] }) {
  return (
    <div className="page home hub-home">
      <header className="hub-hero">
        <h1 className="marquee">
          <span>{HUB_NAME.main}</span>
          <span className="marquee-accent">{HUB_NAME.accent}</span>
        </h1>
        <p>Giochi a squadre per la serata: tutti nella stessa stanza, davanti allo stesso schermo.</p>
      </header>

      <div className="game-grid">
        {games.map((g) => (
          <a key={g.id} className={`game-card theme-${g.id}`} href={g.href}>
            <span className="game-icon" aria-hidden>{g.icon}</span>
            <span className="game-text">
              <h2>{g.name}</h2>
              <p>{g.tagline}</p>
              <span className="tags">
                {g.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
