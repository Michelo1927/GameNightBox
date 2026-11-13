// What is being written in a game's creator on this device. Saved on every change: closing the tab loses nothing.
import { useEffect, useState } from 'react';
import { ask } from './ask';
import { hash } from './text';
import { tr } from './i18n';

export interface Draft<T> {
  data: T;
  /** The copy saved on this device that this draft edits (replaced when the code is generated again). */
  slug?: string;
  /** Fingerprint of the data when its code was last generated: "Crea" then starts a new one. */
  shared?: string;
}

const key = (game: string) => `gnb:${game}:draft`;

export function loadDraft<T>(game: string): Draft<T> | null {
  try {
    const raw = localStorage.getItem(key(game));
    return raw ? (JSON.parse(raw) as Draft<T>) : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser has no room left. */
export function saveDraft<T>(game: string, draft: Draft<T>): boolean {
  try {
    localStorage.setItem(key(game), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Something was written in it (not just the empty skeleton of a new one). */
const written = (v: unknown, key = ''): boolean =>
  typeof v === 'string'
    ? !['letter', 'type'].includes(key) && v.trim().length > 0
    : Array.isArray(v)
      ? v.some((x) => written(x))
      : !!v && typeof v === 'object' && Object.entries(v).some(([k, x]) => written(x, k));

/**
 * Opens something in the creator (to edit it). `slug` is its copy on this device, if it has one.
 * Asks first if that would throw away a draft not shared yet. Resolves false if the user says no.
 */
export async function startDraft<T>(game: string, data: T, slug?: string): Promise<boolean> {
  const current = loadDraft(game);
  if (current && !isShared(current) && written(current.data) && !(await ask(tr('Stai già creando qualcosa su questo dispositivo: sostituirlo con questo?', "You're already creating something on this device: replace it with this one?"), tr('Sostituisci', 'Replace'))))
    return false;
  return saveDraft(game, { data: structuredClone(data), slug });
}

export const fingerprint = (data: unknown) => hash(JSON.stringify(data)) + JSON.stringify(data).length;

/** The draft is the same as when its code was generated. */
export const isShared = <T>(d: Draft<T>) => d.shared === fingerprint(d.data);

export function useDraft<T>(game: string, blank: () => T) {
  const [draft, setDraft] = useState<Draft<T>>(() => loadDraft<T>(game) ?? { data: blank() });
  const [full, setFull] = useState(false);
  useEffect(() => setFull(!saveDraft(game, draft)), [game, draft]);
  const update = (fn: (d: T) => T) => setDraft((d) => ({ ...d, data: fn(d.data) }));
  const reset = () => setDraft({ data: blank() });
  return { draft, setDraft, update, reset, full };
}

/** "Crea" from the game's page: a draft whose code was already generated is saved on the device, so start a new one. */
export function freshDraft(game: string) {
  const d = loadDraft(game);
  if (d && isShared(d)) {
    try {
      localStorage.removeItem(key(game));
    } catch {
      /* nothing saved */
    }
  }
}
