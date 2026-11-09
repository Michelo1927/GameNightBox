import type { BuzzMode } from '../../hub/buzzer';
import { gameKey } from '../../hub/content';
import { newTeam, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';
import { CHAIN_LENGTH, type CatenaSet } from './schema';

export interface CGame {
  teams: Team[];
  started: boolean;
  buzz: BuzzMode;
  stage: 'catena' | 'finale' | 'over';
  /** Index of the chain (or of the final word) being played. */
  index: number;
  /** Letters shown for each word of the chain (the first and last word are shown whole). */
  shown: number[];
  solved: boolean[];
  /** Index in teams of the team whose turn it is (chains). */
  turn: number;
  /** The word the team is trying (chains). */
  selected: number;
  points: Record<string, number>;
  /** Final word: clues shown, teams that already got it wrong, team that booked, and whether it's over. */
  clues: number;
  locked: string[];
  buzzed?: string;
  done: boolean;
  /** Final word: the team that found it; unset if nobody did. */
  foundBy?: string;
}

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], buzz: BuzzMode = 'host'): CGame => ({
  teams,
  started: false,
  buzz,
  stage: 'catena',
  index: 0,
  shown: [],
  solved: [],
  turn: 0,
  selected: 1,
  points: {},
  clues: 1,
  locked: [],
  done: false,
});

export const wordLength = (w: string) => [...w.trim()].length;

/** Starts chain `index`: first and last word shown, the others with their first letter. */
export function startChain(g: CGame, set: CatenaSet, index: number): CGame {
  const words = set.catene[index].words;
  return {
    ...g,
    stage: 'catena',
    index,
    shown: words.map((w, i) => (i === 0 || i === CHAIN_LENGTH - 1 ? wordLength(w) : 1)),
    solved: words.map((_, i) => i === 0 || i === CHAIN_LENGTH - 1),
    turn: g.teams.length ? index % g.teams.length : 0,
    selected: 1,
    done: false,
  };
}

export function startFinal(g: CGame, index: number): CGame {
  return { ...g, stage: 'finale', index, clues: 1, locked: [], buzzed: undefined, done: false, foundBy: undefined };
}

/** Words that can be tried now: hidden, next to a word already found. */
export const playable = (g: CGame) =>
  g.solved.map((s, i) => !s && (g.solved[i - 1] || g.solved[i + 1])).flatMap((ok, i) => (ok ? [i] : []));

/** Points for finding a word: 10 for each letter still hidden. */
export const wordValue = (word: string, shown: number) => 10 * Math.max(1, wordLength(word) - shown);

/** Points for the final word: fewer clues, more points. */
export const finalValue = (clues: number, total: number) => 50 * (total + 1 - clues);

export const scoreOf = (g: CGame, t: Team) => (g.points[t.id] ?? 0) + t.adjust;

export function useCatena(slug: string, set: CatenaSet) {
  const { state, setState, undo, canUndo } = useSaved<CGame>(gameKey('catena', slug), () => {
    const g = loadSaved<CGame>(gameKey('catena', slug));
    return g && g.shown.length ? g : startChain(g ?? newGame(), set, 0);
  });
  return { game: state, setGame: setState, undo, canUndo };
}
