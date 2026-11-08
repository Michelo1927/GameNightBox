import { useCallback, useEffect, useRef, useState } from 'react';

const UNDO_LIMIT = 50;

export function loadSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * State persisted in localStorage under `key`, so a page reload loses nothing.
 * Also keeps the recent states in memory for "Annulla" (undo).
 */
export function useSaved<T>(key: string, init: () => T) {
  const [state, setState] = useState<T>(init);
  const history = useRef<T[]>([]);
  const prev = useRef(state);
  const undoing = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* storage unavailable: the game still works, just not persisted */
    }
    // Record history here rather than in setState: updaters may run twice in StrictMode.
    if (prev.current !== state) {
      if (!undoing.current) {
        history.current.push(prev.current);
        if (history.current.length > UNDO_LIMIT) history.current.shift();
      }
      undoing.current = false;
      prev.current = state;
      setCanUndo(history.current.length > 0);
    }
  }, [key, state]);

  const undo = useCallback(() => {
    const last = history.current.pop();
    if (!last) return;
    undoing.current = true;
    setState(last);
  }, []);

  return { state, setState, undo, canUndo };
}
