import type { Quiz } from './quiz/schema';
import { newTeam, shuffled, type Result, type Team } from '../../hub/teams';
import { loadSaved, useSaved } from '../../hub/useSaved';

export type { Result, Team };

export interface Settings {
  /** Default seconds for the timer (older games may have 0: the timer then uses 30). */
  timer: number;
  /** How many hidden special cells of each kind (Furto, Passa la mano, Imprevisto) the board has. */
  specialCounts: SpecialCounts;
}

export type SpecialCounts = Record<SpecialKind, number>;

/**
 * Hidden special cells, revealed when opened by the team whose turn it is:
 * - steal (Furto): a right answer takes the points from a team of its choice instead of the bank;
 * - pass (Passa la mano): the team can pass the question to another team; if that team gets it wrong,
 *   the points go to the team that passed it (the other team loses nothing);
 * - gift (Imprevisto): a random card changes the scores, then the question is played as usual.
 */
export type SpecialKind = 'steal' | 'pass' | 'gift';

export interface Gift {
  icon: string;
  title: string;
  text: string;
  /** teamId -> points won or lost, computed when the card is drawn. */
  deltas: Record<string, number>;
}

export interface Special {
  kind: SpecialKind;
  /** The team whose turn it was when the cell was opened (unset: the cell plays as a normal one). */
  by?: string;
  /** steal: the team robbed ('' = points taken from the bank); pass: the team the question was passed to. */
  target?: string;
  gift?: Gift;
}

export interface Bet {
  teamId: string;
  amount: number;
}

export interface FinalState {
  stage: 'bets' | 'question' | 'done';
  /** Set when the final is the last leftover cell of the board instead of the quiz's own final question. */
  cell?: string;
  bets: Record<string, number>;
  results: Record<string, Result>;
}

export interface GameState {
  teams: Team[];
  /** cellKey -> teamId -> result */
  results: Record<string, Record<string, Result>>;
  played: Record<string, boolean>;
  // The fields below were added later: games saved before them don't have them.
  settings?: Settings;
  /** cellKey -> special cell, picked at random when the game starts. */
  specials?: Record<string, Special>;
  /** Old "Raddoppio" bets (cellKey -> bet), only kept so games saved with them keep their scores. */
  bets?: Record<string, Bet>;
  final?: FinalState;
}

export const DEFAULT_SETTINGS: Settings = { timer: 30, specialCounts: { steal: 1, pass: 1, gift: 1 } };
export const settingsOf = (g: GameState): Settings => ({
  ...DEFAULT_SETTINGS,
  ...g.settings,
  specialCounts: { ...DEFAULT_SETTINGS.specialCounts, ...g.settings?.specialCounts },
});

export const cellKey = (c: number, q: number) => `${c}-${q}`;

export const emptyGame = (): GameState => ({ teams: [newTeam(0), newTeam(1)], results: {}, played: {} });

export const SPECIAL_KINDS: SpecialKind[] = ['steal', 'pass', 'gift'];

export const MAX_PER_KIND = 5;

/**
 * Places the special cells at random among the cells not played yet, as many of each kind as the settings say.
 * The special cells already played are kept and count towards their kind.
 */
export function pickSpecials(
  quiz: Quiz,
  counts: SpecialCounts,
  played: Record<string, boolean> = {},
  old: Record<string, Special> = {},
): Record<string, Special> {
  const kept = Object.fromEntries(Object.entries(old).filter(([k]) => played[k]));
  const kinds = SPECIAL_KINDS.flatMap((kind) => {
    const done = Object.values(kept).filter((s) => s.kind === kind).length;
    return Array<SpecialKind>(Math.max(0, counts[kind] - done)).fill(kind);
  });
  const free = quiz.categories.flatMap((c, ci) => c.questions.map((_, qi) => cellKey(ci, qi)).filter((k) => !played[k]));
  const picked = shuffled(free).slice(0, kinds.length).map((k, i): [string, Special] => [k, { kind: kinds[i] }]);
  return { ...kept, ...Object.fromEntries(picked) };
}

/** New game with the same teams and settings: scores, played cells and special cells start over. */
export function resetGame(g: GameState, quiz: Quiz): GameState {
  const settings = settingsOf(g);
  return {
    ...emptyGame(),
    teams: g.teams.map((t) => ({ ...t, adjust: 0 })),
    settings,
    specials: pickSpecials(quiz, settings.specialCounts),
  };
}

/** Points at stake on a cell for a team: its bet on an old Raddoppio cell, otherwise the cell value. */
export function cellPoints(game: GameState, quiz: Quiz, key: string, teamId: string): number {
  const bet = game.bets?.[key];
  if (bet && bet.teamId === teamId) return bet.amount;
  const [c, q] = key.split('-').map(Number);
  return quiz.categories[c]?.questions[q]?.points ?? 0;
}

/** Points won (+) or lost (-) by each team on one cell, special rules included. */
export function cellDeltas(game: GameState, quiz: Quiz, key: string): Record<string, number> {
  const sp = game.specials?.[key];
  const results = game.results[key] ?? {};
  // Imprevisto: the card's points, plus the answer to the question under it.
  const deltas: Record<string, number> = sp?.kind === 'gift' && sp.by ? { ...(sp.gift?.deltas ?? {}) } : {};
  const add = (id: string, n: number) => (deltas[id] = (deltas[id] ?? 0) + n);
  const passed = sp?.kind === 'pass' && sp.by && sp.target ? sp : undefined;
  for (const [id, r] of Object.entries(results)) {
    const points = cellPoints(game, quiz, key, id);
    // Passa la mano: the team that received the question loses nothing, its mistake rewards the passer.
    if (passed && id === passed.target) add(r === 'right' ? id : passed.by!, points);
    else add(id, r === 'right' ? points : -points);
  }
  // Furto: the points of a right answer are taken from the robbed team.
  if (sp?.kind === 'steal' && sp.by && sp.target && results[sp.by] === 'right') add(sp.target, -cellPoints(game, quiz, key, sp.by));
  return deltas;
}

/** Score without the final question (used for the final bets' limit). */
export function boardScore(team: Team, game: GameState, quiz: Quiz): number {
  let score = team.adjust;
  const keys = new Set([...Object.keys(game.results), ...Object.keys(game.specials ?? {})]);
  for (const key of keys) score += cellDeltas(game, quiz, key)[team.id] ?? 0;
  return score;
}

/**
 * Draws an Imprevisto card for the team that opened the cell, worth around the cell's value.
 * Only cards that make sense right now are drawn (e.g. no swap for the team already in the lead).
 */
export function drawGift(game: GameState, quiz: Quiz, key: string, teamId: string): Gift {
  const [c, q] = key.split('-').map(Number);
  const v = quiz.categories[c]?.questions[q]?.points ?? 100;
  const half = Math.round(v / 2 / 10) * 10;
  const scores = game.teams.map((t) => ({ t, s: boardScore(t, game, quiz) }));
  const me = scores.find((x) => x.t.id === teamId)!;
  const others = scores.filter((x) => x.t.id !== teamId);
  const sorted = [...scores].sort((a, b) => b.s - a.s);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  // The team just ahead: the lowest score higher than mine.
  const ahead = others.filter((x) => x.s > me.s).sort((a, b) => a.s - b.s)[0];
  // Who gets a present: the last team, or (if that's me) the lowest of the others.
  const poorest = [...others].sort((a, b) => a.s - b.s)[0];

  const cards: (Gift | false | undefined)[] = [
    { icon: '🍀', title: 'Colpo di fortuna', text: `${me.t.name} vince ${v} punti senza rispondere!`, deltas: { [teamId]: v } },
    { icon: '💸', title: 'Tasse', text: `${me.t.name} paga ${half} punti di tasse.`, deltas: { [teamId]: -half } },
    {
      icon: '🎉',
      title: 'Festa per tutti',
      text: `Tutte le squadre vincono ${half} punti!`,
      deltas: Object.fromEntries(game.teams.map((t) => [t.id, half])),
    },
    first.s > last.s && {
      icon: '🏹',
      title: 'Robin Hood',
      text: `${first.t.name} (prima) regala ${half} punti a ${last.t.name} (ultima).`,
      deltas: { [first.t.id]: -half, [last.t.id]: half },
    },
    ahead && {
      icon: '🔄',
      title: 'Scambio',
      text: `${me.t.name} scambia il punteggio con ${ahead.t.name}: ${me.s} ⇄ ${ahead.s}.`,
      deltas: { [teamId]: ahead.s - me.s, [ahead.t.id]: me.s - ahead.s },
    },
    poorest && {
      icon: '🎁',
      title: 'Regalo',
      text: `${me.t.name} regala ${half} punti a ${poorest.t.name}.`,
      deltas: { [teamId]: -half, [poorest.t.id]: half },
    },
  ];
  const valid = cards.filter((x): x is Gift => !!x);
  return valid[Math.floor(Math.random() * valid.length)];
}

export function teamScore(team: Team, game: GameState, quiz: Quiz): number {
  let score = boardScore(team, game, quiz);
  const r = game.final?.results[team.id];
  if (r) score += (r === 'right' ? 1 : -1) * (game.final?.bets[team.id] ?? 0);
  return score;
}

export interface Turn {
  /** Team whose turn it is (it picks and answers the question). */
  team?: Team;
  /** The leftover questions after an equal number of turns each: every team can answer. */
  shared?: boolean;
  /** Every cell has been played. */
  finished?: boolean;
  /** Only the last leftover cell remains: it is played as the final question, with bets. */
  lastCell?: boolean;
  played: number;
  total: number;
}

/**
 * Teams take turns in order; each gets floor(total / teams) questions.
 * The remaining questions are shared by everyone, and the very last one is the final question
 * (with bets): e.g. 2 teams = 12 turns each + the 25th as final; 7 teams = 3 each, 3 shared, 1 final.
 * When nothing is left over (5 teams) the quiz's own final question is played, if it has one.
 * Derived from how many cells were played, so it survives reloads and re-opening a cell.
 */
export function currentTurn(game: GameState, quiz: Quiz): Turn {
  const total = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  const played = quiz.categories.reduce((n, c, ci) => n + c.questions.filter((_, qi) => game.played[cellKey(ci, qi)]).length, 0);
  const n = game.teams.length;
  if (played >= total) return { finished: true, played, total };
  if (n === 0) return { played, total };
  if (played >= Math.floor(total / n) * n) {
    if (total - played === 1) return { lastCell: true, played, total };
    return { shared: true, played, total };
  }
  return { team: game.teams[played % n], played, total };
}

/** The quiz's own final question is played only when the board splits evenly between the teams. */
export function usesQuizFinal(game: GameState, quiz: Quiz): boolean {
  const total = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  return !!quiz.final && game.teams.length > 0 && total % game.teams.length === 0;
}

/** The whole game is over: board done and the final question (if any) played. */
export function gameOver(game: GameState, quiz: Quiz): boolean {
  if (!currentTurn(game, quiz).finished) return false;
  if (game.final?.cell) return game.final.stage === 'done';
  return !usesQuizFinal(game, quiz) || game.final?.stage === 'done';
}

const storageKey = (slug: string) => `jeopardy-quiz:game:${slug}`;

const loadGame = (slug: string) => loadSaved<GameState>(storageKey(slug));

export function hasSavedGame(slug: string): boolean {
  const g = loadGame(slug);
  return !!g && (Object.keys(g.played).length > 0 || Object.keys(g.results).length > 0);
}

/** Older saved games have no special cells yet: pick them now among the cells not played. */
function withDefaults(g: GameState, quiz: Quiz): GameState {
  if (g.specials) return g;
  return { ...g, specials: pickSpecials(quiz, settingsOf(g).specialCounts, g.played) };
}

/** Game state for one quiz, saved in the browser, with undo. */
export function useGame(slug: string, quiz: Quiz) {
  const { state, setState, undo, canUndo } = useSaved(storageKey(slug), () => withDefaults(loadGame(slug) ?? emptyGame(), quiz));
  return { game: state, setGame: setState, undo, canUndo };
}
