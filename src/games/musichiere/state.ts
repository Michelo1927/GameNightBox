import type { BuzzMode } from '../../hub/buzzer';
import { gameKey } from '../../hub/content';
import { newTeam, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

export type Mark = 'right' | 'wrong';

export interface MGame {
  teams: Team[];
  started: boolean;
  buzz: BuzzMode;
  /** Boxes in each team's column, filled only by right answers: the first team to fill it wins. */
  slots: number;
  /** Seconds of each clip before it stops by itself. */
  clip: number;
  /** Song being played. */
  index: number;
  /** Older games also saved 'wrong': mistakes no longer take a box, so only 'right' counts. */
  marks: Record<string, Mark[]>;
  /** Teams that got this song wrong. */
  locked: string[];
  buzzed?: string;
  /** The song is over: title shown. */
  done: boolean;
  over: boolean;
}

export const SLOTS = [5, 7, 10];
export const CLIPS = [10, 15, 20, 30];

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<MGame> = {}): MGame => ({
  started: false,
  buzz: 'keys',
  slots: 7,
  clip: 15,
  index: 0,
  marks: {},
  locked: [],
  done: false,
  over: false,
  ...opts,
  teams,
});

export const rightsOf = (g: MGame, id: string) => (g.marks[id] ?? []).filter((m) => m === 'right').length;
export const isFull = (g: MGame, id: string) => rightsOf(g, id) >= g.slots;
/** The team that filled its column first (the game ends with it). */
export const winnerOf = (g: MGame) => g.teams.find((t) => isFull(g, t.id));
export const scoreOf = (g: MGame, t: Team) => rightsOf(g, t.id) + t.adjust;

export function useMusichiere(slug: string) {
  const { state, setState, undo, canUndo } = useSaved<MGame>(gameKey('musichiere', slug), () => loadSaved<MGame>(gameKey('musichiere', slug)) ?? newGame());
  return { game: state, setGame: setState, undo, canUndo };
}
