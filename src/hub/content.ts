// Content of the games other than Jeopardy: content/<game>/<slug>.json in the repo,
// plus what was made with an AI on this device (kept in localStorage). The library itself is in library.ts;
// this file has only types and helpers, so the Node scripts (validate, import) can use it too.

export interface Validation {
  errors: string[];
  warnings: string[];
}

export interface Loaded<T> {
  slug: string;
  data: T;
  errors: string[];
  /** Saved on this device (made with an AI), not part of the site. */
  local?: boolean;
  /** When it was added to the site, or saved on this device (ms); missing when unknown. */
  date?: number;
}

export interface Library<T> {
  all: () => Loaded<T>[];
  find: (slug: string) => Loaded<T> | undefined;
  /** Saves on this device and returns the slug; `replace` is the old copy being edited (removed if the slug changes). */
  saveLocal: (data: T & { title: string }, replace?: string) => string;
  removeLocal: (slug: string) => void;
}

/** Where a game in progress is saved. */
export const gameKey = (game: string, slug: string) => `gnb:${game}:game:${slug}`;

// --- small validation helpers ---

export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
