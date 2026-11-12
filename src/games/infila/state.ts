import type { BuzzMode } from '../../hub/buzzer';
import { gameKey } from '../../hub/content';
import { newTeam, shuffled, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';
import type { Sequenza } from './schema';

/**
 * A sequence is played in three phases:
 * - ordine: the team whose turn it is says the whole order, the host puts the cards in the row;
 * - rubata: the order wasn't all right; the screen says how many cards are in place (not which ones), the other
 *   teams book one at a time and change the order as they like: all right and they take every point;
 * - fine: the right order is revealed, with the values.
 */
export type Phase = 'ordine' | 'rubata' | 'fine';

export interface FGame {
  teams: Team[];
  started: boolean;
  buzz: BuzzMode;
  /** Seconds the host's timer starts from (0: no timer). */
  seconds: number;
  /** The sequence being played. */
  index: number;
  /** The cards laid out under the row, shuffled: indexes of the cards, which are in the right order in the content. */
  deal: number[];
  /** What is in each place of the row (a card index), or null. */
  placed: (number | null)[];
  phase: Phase;
  /** Index in teams of the team playing the sequence. */
  turn: number;
  /** The order given by the team playing: it scores if nobody steals. */
  teamOrder?: number[];
  /** Cards in their place in the order on screen, after the last check (shown during the steal). */
  right: number;
  /** Who gave the order on screen during the steal (the team playing, or the last team that tried to steal). */
  lastBy?: string;
  /** Teams that can't book any more in this steal. */
  locked: string[];
  buzzed?: string;
  /** Who took the points of the sequence that just ended, and how many (unset: nobody). */
  winner?: string;
  won: number;
  /** Whether the sequence was stolen. */
  stolen: boolean;
  points: Record<string, number>;
  over: boolean;
}

/** Points for every card in its place, and the bonus for the whole order right. */
export const VALUE = 10;
export const BONUS = 20;
export const SECONDS = [0, 30, 60, 90];

export const fullValue = (cards: number) => cards * VALUE + BONUS;
export const valueOf = (right: number, cards: number) => right * VALUE + (right === cards ? BONUS : 0);
export const rightIn = (order: (number | null)[]) => order.filter((c, i) => c === i).length;

/** Sequences played: as many for every team (the ones left over are skipped). */
export const playedCount = (total: number, teams: number) => (teams > 0 && total >= teams ? total - (total % teams) : total);

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<FGame> = {}): FGame => ({
  started: false,
  buzz: 'keys',
  seconds: 60,
  index: 0,
  deal: [],
  placed: [],
  phase: 'ordine',
  turn: 0,
  right: 0,
  locked: [],
  won: 0,
  stolen: false,
  points: {},
  over: false,
  ...opts,
  teams,
});

/** Sequence `index` from the start: cards shuffled (never already in order), empty row. */
export function startSequence(g: FGame, seq: Sequenza | undefined, index: number): FGame {
  const n = seq?.cards.length ?? 0;
  const ids = Array.from({ length: n }, (_, i) => i);
  let deal = shuffled(ids);
  while (n > 1 && deal.every((c, i) => c === i)) deal = shuffled(ids);
  return {
    ...g,
    index,
    deal,
    placed: Array(n).fill(null),
    phase: 'ordine',
    turn: g.teams.length ? index % g.teams.length : 0,
    teamOrder: undefined,
    right: 0,
    lastBy: undefined,
    locked: [],
    buzzed: undefined,
    winner: undefined,
    won: 0,
    stolen: false,
  };
}

/** Ends the sequence: `won` points to `winner`. */
export function endSequence(g: FGame, winner: string | undefined, won: number, stolen = false): FGame {
  return {
    ...g,
    phase: 'fine',
    buzzed: undefined,
    winner: won > 0 ? winner : undefined,
    won,
    stolen,
    points: winner && won > 0 ? { ...g.points, [winner]: (g.points[winner] ?? 0) + won } : g.points,
  };
}

export const scoreOf = (g: FGame, t: Team) => (g.points[t.id] ?? 0) + t.adjust;

export function useInFila(slug: string, first: Sequenza | undefined) {
  const { state, setState, undo, canUndo } = useSaved<FGame>(gameKey('infila', slug), () => {
    const g = loadSaved<FGame>(gameKey('infila', slug));
    return g && g.deal?.length ? g : startSequence(g ?? newGame(), first, 0);
  });
  return { game: state, setGame: setState, undo, canUndo };
}
