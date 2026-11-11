import type { BuzzMode } from '../../hub/buzzer';
import { gameKey } from '../../hub/content';
import { newTeam, type Team } from '../../hub/teams';
import { letters, sameAnswer } from '../../hub/text';
import { loadSaved, useSaved } from '../../hub/useSaved';
import type { Lista } from './schema';

/**
 * A list is played in three phases:
 * - sfida: every team can book; the first one that names an answer on the board takes the list;
 * - gioco: that team names answers one at a time until the board is full or it runs out of mistakes;
 * - rubata: the other teams book to steal everything at stake with a single answer;
 * then "fine": the points go to the winner and the host reveals what's left.
 */
export type Phase = 'sfida' | 'gioco' | 'rubata' | 'fine';

export interface TGame {
  teams: Team[];
  started: boolean;
  buzz: BuzzMode;
  /** Mistakes the team in control can make before the others steal. */
  maxStrikes: number;
  index: number;
  phase: Phase;
  /** Per answer of the list: shown on the board. */
  shown: boolean[];
  /** Per answer: the team that found it (missing when revealed at the end). */
  foundBy: (string | null)[];
  /** Points at stake in this list: they all go to the team that wins it. */
  pot: number;
  /** The team playing the list. */
  control?: string;
  strikes: number;
  /** Teams that can't book any more (wrong answer in the face-off or in the steal). */
  locked: string[];
  buzzed?: string;
  /** Who took the points of the list that just ended (unset: nobody). */
  winner?: string;
  points: Record<string, number>;
  over: boolean;
}

/** Every answer on the board is worth the same. */
export const VALUE = 10;
export const STRIKES = [2, 3, 4];

/** A new game, still without a list: start it with startList. */
export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<TGame> = {}): TGame => ({
  started: false,
  buzz: 'keys',
  maxStrikes: 3,
  index: 0,
  phase: 'sfida',
  shown: [],
  foundBy: [],
  pot: 0,
  strikes: 0,
  locked: [],
  points: {},
  over: false,
  ...opts,
  teams,
});

/** List `index` from the start, covered. */
export function startList(g: TGame, list: Lista | undefined, index: number): TGame {
  const n = list?.answers.length ?? 0;
  return {
    ...g,
    index,
    phase: 'sfida',
    shown: Array(n).fill(false),
    foundBy: Array(n).fill(null),
    pot: 0,
    control: undefined,
    strikes: 0,
    locked: [],
    buzzed: undefined,
    winner: undefined,
  };
}

/** Typed guesses: a leading article doesn't count ("la Francia" = "Francia"); one typo allowed from 6 letters up. */
const ARTICLE = /^\s*(?:(?:il|lo|la|i|gli|le|un|uno|una|the)\s+|l['’]\s*)/i;
const bare = (s: string) => s.replace(ARTICLE, '');

/** The answer of the list the guess names, or -1. Exact names win over the ones with a typo. */
export function findAnswer(list: Lista, guess: string): number {
  const g = bare(guess);
  if (!letters(g)) return -1;
  const names = list.answers.map((a) => [a.text, ...(a.also ?? [])].map(bare));
  const exact = names.findIndex((ns) => ns.some((n) => letters(n) === letters(g)));
  return exact >= 0 ? exact : names.findIndex((ns) => ns.some((n) => sameAnswer(g, n)));
}

export const scoreOf = (g: TGame, t: Team) => (g.points[t.id] ?? 0) + t.adjust;

/** Ends the list: the pot goes to `winner` (if any). */
export function endList(g: TGame, winner: string | undefined): TGame {
  return {
    ...g,
    phase: 'fine',
    buzzed: undefined,
    winner,
    points: winner ? { ...g.points, [winner]: (g.points[winner] ?? 0) + g.pot } : g.points,
  };
}

export function useTopTen(slug: string, first: Lista | undefined) {
  const { state, setState, undo, canUndo } = useSaved<TGame>(gameKey('topten', slug), () => {
    const g = loadSaved<TGame>(gameKey('topten', slug));
    return g && g.shown?.length ? g : startList(g ?? newGame(), first, 0);
  });
  return { game: state, setGame: setState, undo, canUndo };
}
