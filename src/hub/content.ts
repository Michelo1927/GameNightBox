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

/**
 * True on the pages of a tournament game (#/torneo/<game>/...): there a content has its own save, apart from the
 * game played on its own, so leaving the tournament and playing the same content does not touch the tournament's.
 */
export const inTournamentPage = () => typeof location !== 'undefined' && /^#\/torneo\/(?!nuovo(\/|$))[^/]+/.test(location.hash);

/**
 * Several games on the same content, each with its own teams: #/<game>/<slug>~<n>/... is game n (2, 3, ...),
 * #/<game>/<slug>/... is the first one (0 here). Not inside the tournament, which has one game per content.
 */
export function slotOfPage(): number {
  if (typeof location === 'undefined' || inTournamentPage()) return 0;
  const m = /^#\/[^/]+\/[^/]*?~(\d+)(\/|$)/.exec(location.hash);
  return m ? Number(m[1]) : 0;
}

/** The save of game `slot` from the save of the first game on a content. */
export const withSlot = (key: string, slot: number) => (slot > 0 ? `${key}~${slot}` : key);

/** Where a game on a content is saved (a separate save inside the tournament, one more for every other game). */
export const gameKey = (game: string, slug: string, slot = slotOfPage()) =>
  withSlot(`gnb:${game}:${inTournamentPage() ? 'torneo' : 'game'}:${slug}`, slot);

/** The saved games on a content, from the key of the first one: [slot, key], first game first. */
export function savedSlots(key: string): [number, string][] {
  const out: [number, string][] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === key) out.push([0, k]);
      else if (k?.startsWith(`${key}~`) && /^\d+$/.test(k.slice(key.length + 1))) out.push([Number(k.slice(key.length + 1)), k]);
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort((a, b) => a[0] - b[0]);
}

// --- small validation helpers ---

export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
