// The tournament: the same teams play several games one after the other, and each game gives tournament points by
// placing (last 0, one more for each place above). Saved on this device, like the games.
//
// It runs through two shared pieces every game already uses, so the games know nothing about it:
//   - the setup page (SetupPage, and Jeopardy's own) puts the tournament's teams in the game and locks them;
//   - the final ranking (Ranking) gives the points and goes back to the tournament page.
import { useEffect, useState } from 'react';
import type { Team } from './teams';
import { loadSaved } from './useSaved';

/** A game the tournament is playing now: chosen by the wheel, then its content, then started. */
export interface Current {
  game: string;
  /** The content, once its setup page has been opened. */
  slug?: string;
  title?: string;
  /** "Inizia la partita" was pressed: from now on this content is the tournament's. */
  started?: boolean;
}

export interface Played {
  game: string;
  slug: string;
  title: string;
  /** Tournament points by team id. */
  points: Record<string, number>;
  /** The game's own final scores by team id (shown in the list). */
  scores: Record<string, number>;
}

export interface Tournament {
  teams: Team[];
  /** Ids of the games in the tournament; a game chosen more times is there more times (one game each). */
  games: string[];
  played: Played[];
  current?: Current;
  /** Ended by hand before every game was played. */
  ended?: boolean;
  created: number;
}

const KEY = 'gnb:torneo';
const listeners = new Set<() => void>();
let state: Tournament | null = loadSaved<Tournament>(KEY);

export const getTournament = () => state;

export function setTournament(next: Tournament | null | ((t: Tournament) => Tournament)) {
  state = typeof next === 'function' ? (state ? next(state) : null) : next;
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the tournament still works until the page is closed */
  }
  listeners.forEach((l) => l());
}

/** The saved tournament, redrawn on every change. */
export function useTournament() {
  const [t, setT] = useState(state);
  useEffect(() => {
    const on = () => setT(state);
    listeners.add(on);
    on();
    return () => void listeners.delete(on);
  }, []);
  return t;
}

/** The games still in the wheel (a game chosen twice and played once is still there once). */
export function remaining(t: Tournament): string[] {
  const taken = [...t.played.map((p) => p.game), ...(t.current ? [t.current.game] : [])];
  return t.games.filter((g) => {
    const i = taken.indexOf(g);
    if (i < 0) return true;
    taken.splice(i, 1);
    return false;
  });
}

export const isOver = (t: Tournament) => !!t.ended || (!t.current && remaining(t).length === 0);

/** Tournament points from a game's final scores: last 0, one more for each place above; ties share the place. */
export function placePoints(scores: Record<string, number>): Record<string, number> {
  const all = Object.values(scores);
  const n = all.length;
  return Object.fromEntries(Object.entries(scores).map(([id, s]) => [id, n - 1 - all.filter((o) => o > s).length]));
}

/** Points per place with this many teams, best first (e.g. 3 teams: [2, 1, 0]). */
export const pointsScale = (teams: number) => Array.from({ length: teams }, (_, i) => teams - 1 - i);

/** Total tournament points of each team. */
export function standings(t: Tournament) {
  return t.teams.map((team) => ({ ...team, score: t.played.reduce((sum, p) => sum + (p.points[team.id] ?? 0), 0) }));
}

/**
 * The tournament game this page belongs to, if any: a page under #/torneo/<game>, for the game chosen by the wheel and
 * not started on another content. The same game opened on its own (#/<game>/...) is never the tournament's.
 */
export function activeFor(t: Tournament | null, game: string, slug?: string): Current | undefined {
  const c = t?.current;
  if (!t || !c || c.game !== game || isOver(t) || !pageOf().tournament) return undefined;
  if (slug === undefined) return c.started ? undefined : c;
  return !c.started || c.slug === slug ? c : undefined;
}

/** Game and content of the page on screen (#/<game>/<slug>/... or, in the tournament, #/torneo/<game>/<slug>/...). */
export function pageOf(hash = location.hash) {
  const parts = hash.replace(/^#\/?/, '').split('/');
  const tournament = parts[0] === 'torneo' && !!parts[1] && parts[1] !== 'nuovo';
  const [game, slug] = tournament ? parts.slice(1) : parts;
  return { game, slug: slug ? decodeURIComponent(slug) : undefined, tournament };
}

/** Records the end of the tournament's current game from its final scores. */
export function finishCurrent(scores: Record<string, number>) {
  setTournament((t) => {
    const c = t.current;
    if (!c?.slug) return t;
    // Only the tournament's teams count (the setup page keeps them the same, this is just in case).
    const own = Object.fromEntries(t.teams.map((team) => [team.id, scores[team.id] ?? 0]));
    const played: Played = { game: c.game, slug: c.slug, title: c.title ?? c.slug, points: placePoints(own), scores: own };
    return { ...t, current: undefined, played: [...t.played, played] };
  });
}

/** Same teams (ids), possibly in another order or with other names and colours. */
export const sameTeams = (a: Team[], b: Team[]) => a.length === b.length && a.every((x) => b.some((y) => y.id === x.id));
