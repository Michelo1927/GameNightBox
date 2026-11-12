import type { BuzzMode } from '../../hub/buzzer';
import { gameKey } from '../../hub/content';
import { newTeam, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

export type Mark = 'right' | 'wrong';

/** buzz: every team on the same song, the first to book answers. turni: each team plays its own list, in turn. */
export type Mode = 'buzz' | 'turni';

/** A song of a team's list: guessed, missed, passed (it comes back later) or skipped because the video won't play. */
export type TMark = 'right' | 'wrong' | 'pass' | 'skip';

/** One team's list in "a turno". */
export interface TurnRun {
  /** Indexes in the playlist. */
  songs: number[];
  /** By position in `songs`. */
  marks: Record<number, TMark>;
  /** Position in `songs` of the song the team plays next. */
  pos: number;
  /** Milliseconds left (saved when the clock stops, not while it runs). */
  timeLeft: number;
}

/**
 * ready: the team is up, waiting for "Via"; play: the song plays and the team's clock runs; judge: title shown to check
 * the answer, clock stopped; shown: answer judged, title on screen; timeup: the team's clock reached zero.
 */
export type TPhase = 'ready' | 'play' | 'judge' | 'shown' | 'timeup';

export interface MGame {
  teams: Team[];
  started: boolean;
  mode: Mode;
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
  /** "A turno": seconds each team has for its whole list. */
  seconds: number;
  /** "A turno": index in teams of the team playing. */
  current: number;
  phase: TPhase;
  runs: Record<string, TurnRun>;
  over: boolean;
}

export const SLOTS = [5, 7, 10];
export const CLIPS = [10, 15, 20, 30];
export const TURN_SECONDS = [60, 120, 180, 240];
export const MODES: { value: Mode; label: string }[] = [
  { value: 'buzz', label: 'A prenotazione' },
  { value: 'turni', label: 'A turno' },
];

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<MGame> = {}): MGame => ({
  started: false,
  mode: 'buzz',
  buzz: 'keys',
  slots: 7,
  clip: 15,
  index: 0,
  marks: {},
  locked: [],
  done: false,
  seconds: 120,
  current: 0,
  phase: 'ready',
  runs: {},
  over: false,
  ...opts,
  teams,
});

/** "A turno": songs for each team (the leftover songs of an uneven split are not played). */
export const perTeam = (songs: number, teams: number) => Math.floor(songs / Math.max(teams, 1));

/** A song still to play: never answered, or passed. */
export const isOpen = (m?: TMark) => !m || m === 'pass';

/** Next open song after `from`, going round the list (so the passed ones come back in order); -1 when none is left. */
export function nextOpen(run: TurnRun, from: number, skipFrom = true): number {
  const n = run.songs.length;
  for (let k = skipFrom ? 1 : 0; k <= n; k++) {
    const i = (from + k) % n;
    if (isOpen(run.marks[i])) return i;
  }
  return -1;
}

export const runDone = (run?: TurnRun) => !run || run.timeLeft <= 0 || nextOpen(run, run.pos, false) < 0;

/** Gives each team its list: songs dealt in turn (1st to the first team, 2nd to the second…), keeping lists already given. */
export function withRuns(g: MGame, total: number): MGame {
  const n = perTeam(total, g.teams.length);
  const runs = { ...g.runs };
  g.teams.forEach((t, ti) => {
    if (runs[t.id]) return;
    runs[t.id] = { songs: Array.from({ length: n }, (_, k) => k * g.teams.length + ti), marks: {}, pos: 0, timeLeft: g.seconds * 1000 };
  });
  return { ...g, runs };
}

/** The next team (after `from`, going round) that still has songs and time; -1 when the game is over. */
export function nextTeam(g: MGame, from: number): number {
  const n = g.teams.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!runDone(g.runs[g.teams[i].id])) return i;
  }
  return -1;
}

/** The playing team is done with its song: it moves to its next one, and the turn goes to the next team (or the game ends). */
export function leaveTurn(g: MGame): MGame {
  const t = g.teams[g.current];
  const r = t ? g.runs[t.id] : undefined;
  const next = r ? nextOpen(r, r.pos) : -1;
  const moved = r && next >= 0 ? { ...g, runs: { ...g.runs, [t.id]: { ...r, pos: next } } } : g;
  const i = nextTeam(moved, g.current);
  return i < 0 ? { ...moved, over: true } : { ...moved, current: i, phase: 'ready' };
}

/** Time is up: the songs still open count as wrong. */
export function closeRun(r: TurnRun): TurnRun {
  const marks: Record<number, TMark> = { ...r.marks };
  r.songs.forEach((_, k) => {
    if (isOpen(marks[k])) marks[k] = 'wrong';
  });
  return { ...r, timeLeft: 0, marks };
}

export const rightsOf = (g: MGame, id: string) =>
  g.mode === 'turni'
    ? Object.values(g.runs[id]?.marks ?? {}).filter((m) => m === 'right').length
    : (g.marks[id] ?? []).filter((m) => m === 'right').length;
export const isFull = (g: MGame, id: string) => g.mode !== 'turni' && rightsOf(g, id) >= g.slots;
/** The team that filled its column first (the game ends with it). */
export const winnerOf = (g: MGame) => g.teams.find((t) => isFull(g, t.id));
export const scoreOf = (g: MGame, t: Team) => rightsOf(g, t.id) + t.adjust;

export const loadGame = (slug: string): MGame | null => {
  const saved = loadSaved<MGame>(gameKey('musichiere', slug));
  // Games saved before "a turno" lack its fields.
  return saved ? { ...newGame(saved.teams), ...saved } : null;
};

export function useMusichiere(slug: string) {
  const { state, setState, undo, canUndo } = useSaved<MGame>(gameKey('musichiere', slug), () => loadGame(slug) ?? newGame());
  return { game: state, setGame: setState, undo, canUndo };
}
