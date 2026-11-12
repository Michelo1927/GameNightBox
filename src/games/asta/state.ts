import { gameKey } from '../../hub/content';
import { newTeam, shuffled, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

/**
 * auction: the teams bid in turn on how many answers they can give; sold: one team is left, waiting for "Via!";
 * run: that team names answers against the clock; done: the theme is over and its point is given.
 */
export type Phase = 'auction' | 'sold' | 'run' | 'done';

/** One theme. Teams are kept by id: the setup may reorder them during the game. */
export interface Round {
  /** Index of the theme in the content. */
  theme: number;
  phase: Phase;
  /** The team that must raise or leave. */
  turn: string;
  /** Teams that left the auction. */
  out: string[];
  /** Highest offer so far (0: nobody offered yet). */
  bid: number;
  holder: string | null;
  /** Who had the highest offer before the holder: gets the point if the holder fails. */
  prev: string | null;
  /** Right answers counted by the host. */
  said: number;
  /** Milliseconds left (saved when the clock stops or an answer is counted, not while it runs). */
  timeLeft: number;
  end?: 'made' | 'timeout' | 'giveup';
  /** The team that got the point (null: nobody). */
  scored?: string | null;
}

/** A theme already played, for the score. */
export interface Played {
  theme: number;
  holder: string;
  bid: number;
  said: number;
  scored: string | null;
}

export interface AGame {
  teams: Team[];
  started: boolean;
  /** Seconds to give the answers, the same for every bid. */
  seconds: number;
  /** Points to win. */
  toWin: number;
  /** Order of the themes (indexes of the content). */
  order: number[];
  /** Position in `order` of the next theme to deal. */
  next: number;
  /** Themes dealt so far: the team that opens the auction goes round. */
  dealt: number;
  round: Round | null;
  played: Played[];
  over: boolean;
}

export const SECONDS = [30, 45, 60, 90, 120];
export const TO_WIN = [3, 5, 7, 10];

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<AGame> = {}): AGame => ({
  started: false,
  seconds: 60,
  toWin: 5,
  order: [],
  next: 0,
  dealt: 0,
  round: null,
  played: [],
  over: false,
  ...opts,
  teams,
});

export const scoreOf = (g: AGame, t: Team) => g.played.filter((p) => p.scored === t.id).length + t.adjust;

/** The next theme off the shuffled deck (undefined when they are used up). */
function nextTheme(g: AGame, total: number): { g: AGame; theme?: number } {
  const order = g.order.length ? g.order : shuffled(Array.from({ length: total }, (_, i) => i));
  if (g.next >= order.length) return { g: { ...g, order } };
  return { g: { ...g, order, next: g.next + 1 }, theme: order[g.next] };
}

export const themesLeft = (g: AGame, total: number) => (g.order.length ? g.order.length : total) - g.next;

/** Deals the next theme: a new auction, opened by the next team in turn. The game is over when the themes are. */
export function dealRound(g: AGame, total: number): AGame {
  const { g: after, theme } = nextTheme(g, total);
  if (theme === undefined || !g.teams.length) return { ...after, round: null, over: true };
  const opener = g.teams[g.dealt % g.teams.length];
  return {
    ...after,
    dealt: g.dealt + 1,
    round: { theme, phase: 'auction', turn: opener.id, out: [], bid: 0, holder: null, prev: null, said: 0, timeLeft: g.seconds * 1000 },
  };
}

/** Another theme for the same auction (nobody liked it): same opener, offers start again. */
export function skipTheme(g: AGame, total: number): AGame {
  if (!g.round) return g;
  const { g: after, theme } = nextTheme(g, total);
  if (theme === undefined) return g;
  const opener = g.teams[(g.dealt - 1 + g.teams.length) % g.teams.length]?.id ?? g.round.turn;
  return { ...after, round: { ...g.round, theme, turn: opener, out: [], bid: 0, holder: null, prev: null } };
}

/** Teams still in the auction, in the order of the setup. */
export const inAuction = (g: AGame) => g.teams.filter((t) => !g.round?.out.includes(t.id));

/** The next team after `from` that can still raise (not out, not the holder). */
function after(g: AGame, r: Round, from: string): string | null {
  const n = g.teams.length;
  const at = g.teams.findIndex((t) => t.id === from);
  for (let k = 1; k <= n; k++) {
    const t = g.teams[(at + k + n) % n];
    if (!r.out.includes(t.id) && t.id !== r.holder) return t.id;
  }
  return null;
}

/** The auction ends when only the holder is left. */
function settle(g: AGame, r: Round): Round {
  const left = g.teams.filter((t) => !r.out.includes(t.id));
  return r.holder && left.length === 1 && left[0].id === r.holder ? { ...r, phase: 'sold' } : r;
}

/** The team on turn offers `amount` (more than the highest offer). */
export function raise(g: AGame, amount: number): AGame {
  const r = g.round;
  if (!r || r.phase !== 'auction' || amount <= r.bid) return g;
  const holder = r.turn;
  const moved: Round = { ...r, bid: amount, holder, prev: r.holder ?? r.prev, turn: r.turn };
  moved.turn = after(g, moved, holder) ?? holder;
  return { ...g, started: true, round: settle(g, moved) };
}

/** The team on turn leaves the auction (the opener can't: it must offer something). */
export function leave(g: AGame): AGame {
  const r = g.round;
  if (!r || r.phase !== 'auction' || !r.holder) return g;
  const out = [...r.out, r.turn];
  const moved: Round = { ...r, out };
  moved.turn = after(g, moved, r.turn) ?? r.holder;
  return { ...g, round: settle(g, moved) };
}

/** The theme is over: the holder made it (point to them), or not (point to the team that offered before). */
export function finish(g: AGame, end: NonNullable<Round['end']>, timeLeft: number): AGame {
  const r = g.round;
  if (!r || !r.holder || r.phase === 'done') return g;
  const scored = end === 'made' ? r.holder : r.prev;
  return {
    ...g,
    round: { ...r, phase: 'done', end, scored, timeLeft },
    played: [...g.played, { theme: r.theme, holder: r.holder, bid: r.bid, said: r.said, scored }],
  };
}

/** Somebody reached the points to win. */
export const someoneWon = (g: AGame) => g.teams.some((t) => scoreOf(g, t) >= g.toWin);

/** `play`: the game screen, which needs a theme on the table (dealt here, so it is not a step of "Annulla"). */
export function useAsta(slug: string, total: number, play = false) {
  const { state, setState, undo, canUndo } = useSaved<AGame>(gameKey('asta', slug), () => {
    const saved = loadSaved<AGame>(gameKey('asta', slug)) ?? newGame();
    // The content changed since the game was saved: start again with the same teams.
    const stale = !Array.isArray(saved.played) || saved.order.some((i) => i >= total) || (saved.round && saved.round.theme >= total);
    const g = stale ? newGame(saved.teams, { seconds: saved.seconds, toWin: saved.toWin }) : saved;
    return play && !g.round && !g.over ? dealRound(g, total) : g;
  });
  return { game: state, setGame: setState, undo, canUndo };
}
