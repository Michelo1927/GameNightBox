import { gameKey } from '../../hub/content';
import { newTeam, shuffled, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

/**
 * One team's go: it must give `steps` wrong answers in a row before its time runs out. The team has its own list of
 * questions, always the same and in the same order: a slip sends it back to the first one.
 */
export interface Run {
  /** The team's questions (indexes of the content), one per step. */
  list: number[];
  /** Wrong answers in a row right now, so also the position in `list` of the question on screen. */
  step: number;
  /** The longest run of the go. */
  best: number;
  /** Milliseconds left (saved when the clock stops or an answer is given, not while it runs). */
  timeLeft: number;
  /** Answers given and slips (for the summary). */
  asked: number;
  slips: number;
  /** How the go ended. */
  end?: 'finished' | 'timeout';
}

/** intro: waiting for "Via!"; play: questions on screen; teamDone: the team's go is over. */
export type Phase = 'intro' | 'play' | 'teamDone';

export interface SGame {
  teams: Team[];
  started: boolean;
  /** Seconds of each team's go. */
  seconds: number;
  /** Wrong answers in a row needed to finish. */
  steps: number;
  /** Seconds after which the host should call a slow answer (0: no hint). */
  hint: number;
  /** Index in teams of the team playing. */
  current: number;
  phase: Phase;
  runs: Record<string, Run>;
  /** Order of the questions (indexes of the content), extended with a new shuffle when used up. */
  order: number[];
  /** Position in `order` of the next question to deal: each team gets different questions while there are enough. */
  next: number;
  over: boolean;
}

export const SECONDS = [60, 90, 120, 150, 180];
export const STEPS = [8, 12, 15, 22, 30];
export const HINTS = [0, 3, 5, 8];

export const newRun = (seconds: number, list: number[] = []): Run => ({ list, step: 0, best: 0, timeLeft: seconds * 1000, asked: 0, slips: 0 });

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<SGame> = {}): SGame => ({
  started: false,
  seconds: 150,
  steps: 22,
  hint: 5,
  current: 0,
  phase: 'intro',
  runs: {},
  order: [],
  next: 0,
  over: false,
  ...opts,
  teams,
});

/** Deals a team `g.steps` questions from the shared deck (a new shuffle when it runs out), without repeats when possible. */
export function deal(g: SGame, total: number): { g: SGame; list: number[] } {
  if (total <= 0) return { g, list: [] };
  let order = g.order;
  let next = g.next;
  const list: number[] = [];
  while (list.length < g.steps) {
    if (next >= order.length) order = [...order, ...shuffled(Array.from({ length: total }, (_, i) => i))];
    const q = order[next++];
    if (total < g.steps || !list.includes(q)) list.push(q);
  }
  return { g: { ...g, order, next }, list };
}

/** Which side the true answer is on: mixed, but the same after a reload. */
export const trueOnLeft = (pos: number, question: number) => ((pos * 7 + question * 3) % 5) % 2 === 0;

/** 10 points for every step of the best run, plus a point for each second left when the team finishes. */
export function scoreOf(g: SGame, t: Team) {
  const r = g.runs[t.id];
  if (!r) return t.adjust;
  return r.best * 10 + (r.end === 'finished' ? Math.ceil(r.timeLeft / 1000) : 0) + t.adjust;
}

export function useSbagliato(slug: string, total: number) {
  const { state, setState, undo, canUndo } = useSaved<SGame>(gameKey('sbagliato', slug), () => {
    const g = loadSaved<SGame>(gameKey('sbagliato', slug)) ?? newGame();
    // A game saved before the teams had their own list starts again.
    return Object.values(g.runs).some((r) => !Array.isArray(r.list) || r.list.some((q) => q >= total)) ? newGame(g.teams) : g;
  });
  return { game: state, setGame: setState, undo, canUndo };
}
