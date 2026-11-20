import type { ReactNode } from 'react';
import type { GameTag } from './components/GameTags';
import type { Field, Form } from './components/ClaudeCreate';
import type { Validation } from './content';

/** Name shown on the hub's home page. */
export const HUB_NAME = { main: 'GAME NIGHT', accent: 'BOX' };

/** How a game's content is made with an AI chat: the same for its "Crea con l'IA" page and for a pack (hub/pack.ts). */
export interface AiSpec<T> {
  fields: Field[];
  initial: Form;
  prompt: (form: Form) => string;
  validate: (data: unknown) => Validation;
  /** What was read, before playing. `update` lets the preview fix things (e.g. a YouTube link). */
  preview: (data: T, update: (data: T) => void) => ReactNode;
}

/** A content of a game, from the site or saved on this device. */
export interface ContentItem<T> {
  slug: string;
  data: T;
  errors: string[];
  /** Saved on this device, not part of the site. */
  local?: boolean;
}

/** What a pack (several games in one file, hub/pack.ts) needs to know about a game's contents. */
export interface GameContent<T = any> {
  ai: AiSpec<T>;
  title: (data: T) => string;
  summary: (data: T) => string;
  /** Saves on this device and returns the slug (the same content saved twice keeps the same slug). */
  save: (data: T) => string;
  all: () => ContentItem<T>[];
  /**
   * Names already used in a content (categories, themes, answers…): a later prompt for the same game in the same pack
   * asks the AI not to use them again.
   */
  used: (data: T) => string[];
}

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
  content: GameContent;
}
