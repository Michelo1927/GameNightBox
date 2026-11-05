import { useCallback, useEffect, useRef, useState } from 'react';
import type { Quiz } from '../quiz/schema';

export type Result = 'right' | 'wrong';

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Manual score corrections made by the host. */
  adjust: number;
}

export interface Settings {
  /** Seconds for the question timer (0 = no timer). */
  timer: number;
  /** How many hidden "Raddoppio" (Daily Double) cells the board has. */
  doubles: number;
}

export interface Bet {
  teamId: string;
  amount: number;
}

export interface FinalState {
  stage: 'bets' | 'question' | 'done';
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
  /** Cell keys of the Raddoppio cells, picked at random when the game starts. */
  doubles?: string[];
  /** cellKey -> the bet of the team that found a Raddoppio cell. */
  bets?: Record<string, Bet>;
  final?: FinalState;
}

export const DEFAULT_SETTINGS: Settings = { timer: 30, doubles: 1 };
export const settingsOf = (g: GameState): Settings => ({ ...DEFAULT_SETTINGS, ...g.settings });

export const TEAM_COLORS = ['#e63946', '#2a9d8f', '#f4a261', '#8e44ad', '#3a86ff', '#ff70a6', '#70e000', '#adb5bd', '#ffbe0b', '#00bbf9'];

export const cellKey = (c: number, q: number) => `${c}-${q}`;

export const newTeam = (i: number): Team => ({
  id: Math.random().toString(36).slice(2, 9),
  name: `Squadra ${i + 1}`,
  color: TEAM_COLORS[i % TEAM_COLORS.length],
  adjust: 0,
});

export const emptyGame = (): GameState => ({ teams: [newTeam(0), newTeam(1)], results: {}, played: {} });

/**
 * Picks the Raddoppio cells at random, never in the cheapest row (too easy to be worth a bet)
 * and never among cells already played.
 */
export function pickDoubles(quiz: Quiz, count: number, played: Record<string, boolean> = {}): string[] {
  const candidates: string[] = [];
  quiz.categories.forEach((c, ci) => {
    const min = Math.min(...c.questions.map((q) => q.points));
    c.questions.forEach((q, qi) => {
      if (q.points > min && !played[cellKey(ci, qi)]) candidates.push(cellKey(ci, qi));
    });
  });
  const picked: string[] = [];
  while (picked.length < count && candidates.length) picked.push(candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]);
  return picked;
}

/** New game with the same teams and settings: scores, played cells and Raddoppio cells start over. */
export function resetGame(g: GameState, quiz: Quiz): GameState {
  const settings = settingsOf(g);
  return {
    ...emptyGame(),
    teams: g.teams.map((t) => ({ ...t, adjust: 0 })),
    settings,
    doubles: pickDoubles(quiz, settings.doubles),
  };
}

/** Highest value on the board: a team with fewer points can still bet up to this. */
export const maxPoints = (quiz: Quiz) => Math.max(...quiz.categories.flatMap((c) => c.questions.map((q) => q.points)));

/** Points at stake on a cell for a team: its bet on a Raddoppio cell, otherwise the cell value. */
export function cellPoints(game: GameState, quiz: Quiz, key: string, teamId: string): number {
  const bet = game.bets?.[key];
  if (bet && bet.teamId === teamId) return bet.amount;
  const [c, q] = key.split('-').map(Number);
  return quiz.categories[c]?.questions[q]?.points ?? 0;
}

/** Score without the final question (used for the final bets' limit). */
export function boardScore(team: Team, game: GameState, quiz: Quiz): number {
  let score = team.adjust;
  for (const [key, byTeam] of Object.entries(game.results)) {
    const r = byTeam[team.id];
    if (!r) continue;
    const points = cellPoints(game, quiz, key, team.id);
    score += r === 'right' ? points : -points;
  }
  return score;
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
  played: number;
  total: number;
}

/**
 * Teams take turns in order; each gets floor(total / teams) questions.
 * The remaining questions (e.g. the 25th with 2 or 3 teams) are shared by everyone.
 * Derived from how many cells were played, so it survives reloads and re-opening a cell.
 */
export function currentTurn(game: GameState, quiz: Quiz): Turn {
  const total = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  const played = quiz.categories.reduce((n, c, ci) => n + c.questions.filter((_, qi) => game.played[cellKey(ci, qi)]).length, 0);
  const n = game.teams.length;
  if (played >= total) return { finished: true, played, total };
  if (n === 0) return { played, total };
  if (played >= Math.floor(total / n) * n) return { shared: true, played, total };
  return { team: game.teams[played % n], played, total };
}

/** The whole game is over: board done and, if the quiz has one, the final question played. */
export const gameOver = (game: GameState, quiz: Quiz) => !!currentTurn(game, quiz).finished && (!quiz.final || game.final?.stage === 'done');

const storageKey = (slug: string) => `jeopardy-quiz:game:${slug}`;

function loadGame(slug: string): GameState | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export function hasSavedGame(slug: string): boolean {
  const g = loadGame(slug);
  return !!g && (Object.keys(g.played).length > 0 || Object.keys(g.results).length > 0);
}

/** Older saved games have no Raddoppio cells yet: pick them now. */
function withDefaults(g: GameState, quiz: Quiz): GameState {
  if (g.doubles) return g;
  return { ...g, doubles: pickDoubles(quiz, settingsOf(g).doubles, g.played) };
}

const UNDO_LIMIT = 50;

/**
 * Game state for one quiz, persisted in localStorage so a page reload loses nothing.
 * Also keeps the recent states in memory for "Annulla" (undo).
 */
export function useGame(slug: string, quiz: Quiz) {
  const [game, setGame] = useState<GameState>(() => withDefaults(loadGame(slug) ?? emptyGame(), quiz));
  const history = useRef<GameState[]>([]);
  const prev = useRef(game);
  const undoing = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(game));
    } catch {
      /* storage unavailable: game still works, just not persisted */
    }
    // Record history here rather than in setGame: updaters may run twice in StrictMode.
    if (prev.current !== game) {
      if (!undoing.current) {
        history.current.push(prev.current);
        if (history.current.length > UNDO_LIMIT) history.current.shift();
      }
      undoing.current = false;
      prev.current = game;
      setCanUndo(history.current.length > 0);
    }
  }, [slug, game]);

  const undo = useCallback(() => {
    const last = history.current.pop();
    if (!last) return;
    undoing.current = true;
    setGame(last);
  }, []);

  return { game, setGame, undo, canUndo };
}
