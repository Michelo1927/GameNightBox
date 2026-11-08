import type { ReactNode } from 'react';

/** Name shown on the hub's home page. */
export const HUB_NAME = { main: 'GAME NIGHT', accent: 'BOX' };

/** A game of the hub. Each game lives in src/games/<id>/ and is listed in src/games/index.ts. */
export interface Game {
  id: string;
  name: string;
  icon: string;
  /** One line on the home card. */
  tagline: string;
  /** Short facts shown as tags on the home card (e.g. "2-10 squadre"). */
  tags: string[];
  /** Where the home card leads (the game's own first page). */
  href: string;
  /**
   * The page for a hash route, split on "/" (e.g. "#/q/natale/play" → ["q", "natale", "play"]),
   * or null when the route is not this game's.
   */
  route: (parts: string[]) => ReactNode | null;
}
