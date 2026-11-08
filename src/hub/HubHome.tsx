import type { CSSProperties } from 'react';
import { games } from '../games';
import { HUB_NAME } from './games';

const HUES = [225, 290, 185, 330, 250, 200];

/** First page of the site: the list of games. */
export default function HubHome() {
  return (
    <div className="page home">
      <header className="home-header">
        <h1 className="logo">
          {HUB_NAME.main}
          <span>{HUB_NAME.accent}</span>
        </h1>
        <p className="muted">Giochi per stare tutti nella stessa stanza, davanti allo stesso schermo. Scegli a cosa giocare</p>
      </header>

      <div className="quiz-grid">
        {games.map((g, i) => (
          <a key={g.id} className="quiz-card" href={g.href} style={{ ['--hue' as string]: HUES[i % HUES.length] } as CSSProperties}>
            <span className="quiz-icon">{g.icon}</span>
            <h2>{g.name}</h2>
            <p className="muted">{g.tagline}</p>
            <div className="tags">
              {g.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
