// The games already played ("✓ Fatta" in a game's list), kept on this device: one list of slugs per game.

const key = (game: string) => `gnb:${game}:played`;

export function playedSlugs(game: string): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem(key(game)) ?? '[]') as unknown;
    return new Set(Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : []);
  } catch {
    return new Set();
  }
}

function save(game: string, set: Set<string>) {
  try {
    localStorage.setItem(key(game), JSON.stringify([...set]));
  } catch {
    /* no space: the mark is only a convenience */
  }
}

export function setPlayed(game: string, slug: string, played: boolean): Set<string> {
  const set = playedSlugs(game);
  if (played) set.add(slug);
  else set.delete(slug);
  save(game, set);
  return set;
}

/** Keeps the mark when a saved game changes slug (edited), or drops it (`to` null: removed). */
export function movePlayed(game: string, from: string, to: string | null) {
  const set = playedSlugs(game);
  if (!set.delete(from)) return;
  if (to) set.add(to);
  save(game, set);
}
