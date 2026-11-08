// Content of the games other than Jeopardy: content/<game>/<slug>.json in the repo,
// plus what was made with Claude on this device (kept in localStorage).
import { hash, slugify } from './text';

export interface Validation {
  errors: string[];
  warnings: string[];
}

export interface Loaded<T> {
  slug: string;
  data: T;
  errors: string[];
  /** Saved on this device (made with Claude), not part of the site. */
  local?: boolean;
}

export interface Library<T> {
  all: () => Loaded<T>[];
  find: (slug: string) => Loaded<T> | undefined;
  /** Saves on this device and returns the slug; `replace` is the old copy being edited (removed if the slug changes). */
  saveLocal: (data: T & { title: string }, replace?: string) => string;
  removeLocal: (slug: string) => void;
}

/**
 * `modules` comes from the game's own `import.meta.glob('/content/<game>/*.json', { eager: true, import: 'default' })`
 * (Vite needs a literal path there, so each game calls it itself).
 */
export function library<T>(game: string, modules: Record<string, unknown>, validate: (data: unknown) => Validation): Library<T> {
  const key = `gnb:${game}:local`;
  const site: Loaded<T>[] = Object.entries(modules)
    .map(([path, data]) => ({ slug: path.split('/').pop()!.replace(/\.json$/, ''), data: data as T, errors: validate(data).errors }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const readLocal = (): Record<string, T> => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, T>;
    } catch {
      return {};
    }
  };
  const writeLocal = (store: Record<string, T>) => {
    try {
      localStorage.setItem(key, JSON.stringify(store));
    } catch {
      alert('Spazio esaurito su questo dispositivo: togli qualcosa che non usi più.');
    }
  };
  const local = (): Loaded<T>[] =>
    Object.entries(readLocal()).map(([slug, data]) => ({ slug, data, errors: validate(data).errors, local: true }));

  return {
    all: () => [...local(), ...site],
    find: (slug) => [...local(), ...site].find((c) => c.slug === slug),
    saveLocal(data, replace) {
      const slug = `c-${slugify(data.title) || game}-${hash(JSON.stringify(data))}`;
      const store = readLocal();
      if (replace && replace !== slug && store[replace]) delete store[replace];
      writeLocal({ [slug]: data, ...store });
      return slug;
    },
    removeLocal(slug) {
      const store = readLocal();
      delete store[slug];
      writeLocal(store);
      try {
        localStorage.removeItem(gameKey(game, slug));
      } catch {
        /* nothing saved */
      }
    },
  };
}

/** Where a game in progress is saved. */
export const gameKey = (game: string, slug: string) => `gnb:${game}:game:${slug}`;

// --- small validation helpers ---

export const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
