import type { ReactNode } from 'react';
import type { GameTag } from './components/GameTags';

/** Name shown on the hub's home page. */
export const HUB_NAME = { main: 'GAME NIGHT', accent: 'BOX' };

/** A game of the hub. Each game lives in src/games/<id>/ and is listed in src/games/index.ts. */
export interface Game {
  id: string;
  name: string;
  icon: ReactNode;
  /** One line on the home card. */
  tagline: string;
  /** Short facts shown as icons in the corner of the home card (see components/GameTags.tsx). */
  tags: GameTag[];
  /** Where the home card leads (the game's own first page). */
  href: string;
  /**
   * The page for a hash route, split on "/" (e.g. "#/jeopardy/natale/play" → ["jeopardy", "natale", "play"]),
   * or null when the route is not this game's.
   */
  route: (parts: string[]) => ReactNode | null;
}
