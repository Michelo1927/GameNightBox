// The content of a game other than Jeopardy: content/<game>/<slug>.json in the repo,
// plus what was made or loaded on this device (kept in localStorage), each with its date.
import siteDates from 'virtual:content-dates';
import { gameKey, type Library, type Loaded, type Validation } from './content';
import { movePlayed } from './played';
import { hash, slugify } from './text';
import { tr } from './i18n';

/**
 * `modules` comes from the game's own `import.meta.glob('/content/<game>/*.json', { eager: true, import: 'default' })`
 * (Vite needs a literal path there, so each game calls it itself).
 */
export function library<T>(game: string, modules: Record<string, unknown>, validate: (data: unknown) => Validation): Library<T> {
  const key = `gnb:${game}:local`;
  // When each one was saved on this device (ms), kept apart so the saved content keeps its old shape.
  const datesKey = `gnb:${game}:local-dates`;
  const site: Loaded<T>[] = Object.entries(modules)
    .map(([path, data]) => ({
      slug: path.split('/').pop()!.replace(/\.json$/, ''),
      data: data as T,
      errors: validate(data).errors,
      date: siteDates[path],
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const read = <S>(k: string): Record<string, S> => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? '{}') as Record<string, S>;
    } catch {
      return {};
    }
  };
  const write = (k: string, store: object) => {
    try {
      localStorage.setItem(k, JSON.stringify(store));
    } catch {
      alert(tr('Spazio esaurito su questo dispositivo: togli qualcosa che non usi più.', "This device is out of space: remove something you don't use any more."));
    }
  };
  const local = (): Loaded<T>[] => {
    const dates = read<number>(datesKey);
    return Object.entries(read<T>(key)).map(([slug, data]) => ({ slug, data, errors: validate(data).errors, local: true, date: dates[slug] }));
  };

  return {
    all: () => [...local(), ...site],
    find: (slug) => [...local(), ...site].find((c) => c.slug === slug),
    saveLocal(data, replace) {
      const slug = `c-${slugify(data.title) || game}-${hash(JSON.stringify(data))}`;
      const store = read<T>(key);
      const dates = read<number>(datesKey);
      if (replace && replace !== slug && store[replace]) {
        delete store[replace];
        delete dates[replace];
        movePlayed(game, replace, slug);
      }
      write(key, { [slug]: data, ...store });
      write(datesKey, { ...dates, [slug]: Date.now() });
      return slug;
    },
    removeLocal(slug) {
      const store = read<T>(key);
      const dates = read<number>(datesKey);
      delete store[slug];
      delete dates[slug];
      write(key, store);
      write(datesKey, dates);
      movePlayed(game, slug, null);
      try {
        localStorage.removeItem(gameKey(game, slug));
      } catch {
        /* nothing saved */
      }
    },
  };
}
