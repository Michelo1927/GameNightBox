import { useEffect, useRef } from 'react';

/**
 * Keyboard shortcuts for the host. Keys are KeyboardEvent.key values (" " for space, "Enter", "x"...),
 * matched case-insensitively. Ignored while typing in a text field, except Enter, Escape and the up/down arrows.
 */
export function useKeys(map: Record<string, (() => void) | false | undefined>) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const typing = !!(e.target as HTMLElement).closest?.('input, textarea, select');
      if (typing && !['Enter', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = ref.current[key];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}
