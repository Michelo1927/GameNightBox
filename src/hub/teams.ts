// Teams, shared by every game.

import { tr } from './i18n';

export type Result = 'right' | 'wrong';

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Manual score corrections made by the host. */
  adjust: number;
}

export const TEAM_COLORS = ['#e63946', '#2a9d8f', '#f4a261', '#8e44ad', '#3a86ff', '#ff70a6', '#70e000', '#adb5bd', '#ffbe0b', '#00bbf9'];

export const MAX_TEAMS = 10;

export const newTeam = (i: number): Team => ({
  id: Math.random().toString(36).slice(2, 9),
  name: tr(`Squadra ${i + 1}`, `Team ${i + 1}`),
  color: TEAM_COLORS[i % TEAM_COLORS.length],
  adjust: 0,
});

export function shuffled<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
