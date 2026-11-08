import { gameKey } from '../../hub/content';
import { newTeam, type Team } from '../../hub/teams';
import { useSaved } from '../../hub/useSaved';
import { LETTERS } from './schema';

export type Mark = 'right' | 'wrong';

/** One team's go at its wheel. */
export interface Run {
  ruota: number;
  marks: Record<string, Mark>;
  /** Milliseconds left (saved when the clock stops, not while it runs). */
  timeLeft: number;
  /** Index in LETTERS of the letter on screen. */
  pos: number;
}

/**
 * intro: waiting for "Via!"; play: definition on screen, clock running; revealed: answer shown, clock stopped;
 * wrong: answer shown after a mistake; teamDone: the team's go is over.
 */
export type Phase = 'intro' | 'play' | 'revealed' | 'wrong' | 'teamDone';

export interface PGame {
  teams: Team[];
  started: boolean;
  seconds: number;
  /** Index in teams of the team playing. */
  current: number;
  phase: Phase;
  runs: Record<string, Run>;
  over: boolean;
}

export const SECONDS = [90, 120, 150, 180, 240, 300];

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], seconds = 150): PGame => ({
  teams,
  started: false,
  seconds,
  current: 0,
  phase: 'intro',
  runs: {},
  over: false,
});

export const rights = (run?: Run) => (run ? Object.values(run.marks).filter((m) => m === 'right').length : 0);
export const wrongs = (run?: Run) => (run ? Object.values(run.marks).filter((m) => m === 'wrong').length : 0);

/** Next letter without a mark after `from` (going round the wheel); -1 when all are marked. */
export function nextOpen(run: Run, from: number, skipFrom = true): number {
  for (let k = skipFrom ? 1 : 0; k <= LETTERS.length; k++) {
    const i = (from + k) % LETTERS.length;
    if (!run.marks[LETTERS[i]]) return i;
  }
  return -1;
}

/** Gives each team a wheel (in team order, keeping the ones already assigned). */
export function withRuns(g: PGame): PGame {
  const runs = { ...g.runs };
  const used = new Set(Object.values(runs).map((r) => r.ruota));
  let next = 0;
  for (const t of g.teams) {
    if (runs[t.id]) continue;
    while (used.has(next)) next++;
    runs[t.id] = { ruota: next, marks: {}, timeLeft: g.seconds * 1000, pos: 0 };
    used.add(next);
  }
  return { ...g, runs };
}

export function usePassaparola(slug: string) {
  const { state, setState, undo, canUndo } = useSaved<PGame>(gameKey('passaparola', slug), () => {
    try {
      const raw = localStorage.getItem(gameKey('passaparola', slug));
      if (raw) return JSON.parse(raw) as PGame;
    } catch {
      /* new game */
    }
    return newGame();
  });
  return { game: state, setGame: setState, undo, canUndo };
}
