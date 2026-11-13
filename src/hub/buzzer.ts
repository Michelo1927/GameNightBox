import { useEffect, useRef } from 'react';
import type { Team } from './teams';
import { tr } from './i18n';

/**
 * How a team books the answer:
 * - keys: every team has its own key on the laptop (shown on screen) and presses it;
 * - host: the host decides who was fastest (e.g. who raised a hand) and presses that team's number or clicks it.
 * The number keys 1-9 and the clicks work in both modes.
 */
export type BuzzMode = 'keys' | 'host';

/** Far apart on the keyboard, so several people can reach them at once. */
export const BUZZ_KEYS = ['A', 'L', 'G', 'P', 'Z', 'M', 'Q', 'O', 'C', 'K'];

export const BUZZ_MODES: { value: BuzzMode; label: string }[] = [
  { value: 'keys', label: tr('⌨️ Un tasto per squadra', '⌨️ One key per team') },
  { value: 'host', label: tr("🙋 Decide l'host", '🙋 The host decides') },
];

export const buzzKeyOf = (teams: Team[], id: string) => BUZZ_KEYS[teams.findIndex((t) => t.id === id)];

/** Calls onBuzz with the team that booked, while `active`. Teams in `locked` can't book. */
export function useBuzzer(teams: Team[], mode: BuzzMode, active: boolean, locked: string[], onBuzz: (teamId: string) => void) {
  const cb = useRef(onBuzz);
  cb.current = onBuzz;
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if ((e.target as HTMLElement).closest?.('input, textarea')) return;
      let i = -1;
      if (/^[1-9]$/.test(e.key)) i = Number(e.key) - 1;
      else if (mode === 'keys') i = BUZZ_KEYS.indexOf(e.key.toUpperCase());
      const team = teams[i];
      if (!team || locked.includes(team.id)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cb.current(team.id);
    };
    // Capture: booking wins over the game's other shortcuts.
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [teams, mode, active, locked]);
}
