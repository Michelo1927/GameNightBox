import { gameKey } from '../../hub/content';
import { tr } from '../../hub/i18n';
import { newTeam, shuffled, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

/**
 * One team's go. The team sees one question at a time but, to move on, must say the answer to the PREVIOUS one:
 * on the first question it says the password, after the last one it says the last answer. So a list of N questions
 * takes N + 1 answers in a row. A slip sends it back to the first question of the same list.
 */
export interface Run {
  /** The team's questions (indexes of the content). */
  list: number[];
  /** The answer to give on the first question. */
  password: string;
  /** Right answers in a row right now: also the position in `list` of the question on screen (list.length = the last answer). */
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

export interface RGame {
  teams: Team[];
  started: boolean;
  /** Seconds of each team's go. */
  seconds: number;
  /** Questions in each team's list. */
  steps: number;
  /** Seconds to answer each question before it counts as a slip (0: no limit). */
  perQuestion: number;
  /** Whether a team that finishes also gets a point for each second left (missing in older saves: yes). */
  timeBonus?: boolean;
  /** Index in teams of the team playing. */
  current: number;
  phase: Phase;
  runs: Record<string, Run>;
  /** Order of the questions (indexes of the content), extended with a new shuffle when used up. */
  order: number[];
  /** Position in `order` of the next question to deal: each team gets different questions while there are enough. */
  next: number;
  /** Passwords already given, so each team gets a new one. */
  passwords: string[];
  over: boolean;
}

export const SECONDS = [60, 90, 120, 150, 180, 240];
export const STEPS = [5, 8, 10, 12, 15, 20];
export const PER_QUESTION = [0, 5, 8, 10, 15];

/** Silly words to open the chain: easy to remember, funny to shout. */
const PASSWORDS_IT = [
  'Gamberone', 'Pinguino', 'Mortadella', 'Ciabatta', 'Fagiolino', 'Zampogna', 'Carciofo', 'Pallottola', 'Struzzo', 'Tortellino',
  'Ombrellone', 'Cetriolo', 'Pantofola', 'Babbuino', 'Melanzana', 'Trombone', 'Calzino', 'Lumacone', 'Polpetta', 'Scoiattolo',
];
const PASSWORDS_EN = [
  'Big prawn', 'Penguin', 'Pickle', 'Slipper', 'Noodle', 'Bagpipe', 'Artichoke', 'Ostrich', 'Meatball', 'Beach umbrella',
  'Cucumber', 'Baboon', 'Eggplant', 'Trombone', 'Sock', 'Snail', 'Squirrel', 'Waffle', 'Kazoo', 'Potato',
];

export const newRun = (seconds: number, list: number[] = [], password = ''): Run => ({ list, password, step: 0, best: 0, timeLeft: seconds * 1000, asked: 0, slips: 0 });

export const newGame = (teams: Team[] = [newTeam(0), newTeam(1)], opts: Partial<RGame> = {}): RGame => ({
  started: false,
  seconds: 120,
  steps: 10,
  perQuestion: 0,
  timeBonus: true,
  current: 0,
  phase: 'intro',
  runs: {},
  order: [],
  next: 0,
  passwords: [],
  over: false,
  ...opts,
  teams,
});

/** Deals a team `g.steps` questions from the shared deck (a new shuffle when it runs out) and a password not used yet. */
export function deal(g: RGame, total: number): { g: RGame; list: number[]; password: string } {
  const pool = tr(PASSWORDS_IT, PASSWORDS_EN);
  const free = pool.filter((p) => !g.passwords.includes(p));
  const password = shuffled(free.length ? free : pool)[0];
  if (total <= 0) return { g, list: [], password };
  let order = g.order;
  let next = g.next;
  const list: number[] = [];
  while (list.length < g.steps) {
    if (next >= order.length) order = [...order, ...shuffled(Array.from({ length: total }, (_, i) => i))];
    const q = order[next++];
    if (total < g.steps || !list.includes(q)) list.push(q);
  }
  return { g: { ...g, order, next, passwords: [...g.passwords, password] }, list, password };
}

/** Answers in a row needed to finish: the password, then one per question (the last one after the last question). */
export const goal = (g: RGame) => g.steps + 1;

/** 10 points for every step of the best run, plus (if chosen in the setup) a point for each second left when the team finishes. */
export function scoreOf(g: RGame, t: Team) {
  const r = g.runs[t.id];
  if (!r) return t.adjust;
  return r.best * 10 + (r.end === 'finished' && g.timeBonus !== false ? Math.ceil(r.timeLeft / 1000) : 0) + t.adjust;
}

export function useRitardo(slug: string, total: number) {
  const { state, setState, undo, canUndo } = useSaved<RGame>(gameKey('ritardo', slug), () => {
    const g = loadSaved<RGame>(gameKey('ritardo', slug)) ?? newGame();
    // A game saved with questions that no longer exist starts again.
    return Object.values(g.runs).some((r) => !Array.isArray(r.list) || r.list.some((q) => q >= total)) ? newGame(g.teams) : g;
  });
  return { game: state, setGame: setState, undo, canUndo };
}
