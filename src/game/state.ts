import { useEffect, useState } from 'react';
import type { Quiz } from '../quiz/schema';

export type Result = 'right' | 'wrong';

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Manual score corrections made by the host. */
  adjust: number;
}

export interface GameState {
  teams: Team[];
  /** cellKey -> teamId -> result */
  results: Record<string, Record<string, Result>>;
  played: Record<string, boolean>;
}

export const TEAM_COLORS = ['#e63946', '#2a9d8f', '#f4a261', '#8e44ad', '#3a86ff', '#ff70a6', '#70e000', '#adb5bd', '#ffbe0b', '#00bbf9'];

export const cellKey = (c: number, q: number) => `${c}-${q}`;

export const newTeam = (i: number): Team => ({
  id: Math.random().toString(36).slice(2, 9),
  name: `Squadra ${i + 1}`,
  color: TEAM_COLORS[i % TEAM_COLORS.length],
  adjust: 0,
});

export const emptyGame = (): GameState => ({ teams: [newTeam(0), newTeam(1)], results: {}, played: {} });

export function teamScore(team: Team, game: GameState, quiz: Quiz): number {
  let score = team.adjust;
  for (const [key, byTeam] of Object.entries(game.results)) {
    const r = byTeam[team.id];
    if (!r) continue;
    const [c, q] = key.split('-').map(Number);
    const points = quiz.categories[c]?.questions[q]?.points ?? 0;
    score += r === 'right' ? points : -points;
  }
  return score;
}

export interface Turn {
  /** Team whose turn it is (it picks and answers the question). */
  team?: Team;
  /** The leftover questions after an equal number of turns each: every team can answer. */
  shared?: boolean;
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

const storageKey =(slug: string) => `jeopardy-quiz:game:${slug}`;

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

/** Game state for one quiz, persisted in localStorage so a page reload loses nothing. */
export function useGame(slug: string) {
  const [game, setGame] = useState<GameState>(() => loadGame(slug) ?? emptyGame());
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify(game));
    } catch {
      /* storage unavailable: game still works, just not persisted */
    }
  }, [slug, game]);
  return [game, setGame] as const;
}
