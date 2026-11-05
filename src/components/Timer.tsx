import { useEffect, useRef, useState } from 'react';
import { sounds } from '../game/sounds';

export const TIMER_CHOICES = [10, 20, 30, 45, 60, 90];

interface Props {
  /** Default duration (from the game options). */
  seconds: number;
  /** Whether the T key starts this timer (off when another timer is on screen). */
  hotkey?: boolean;
}

/**
 * Countdown started by the host: the button (or T) starts the default duration, ▾ picks another one.
 * Clicking a running timer restarts it, ✕ stops it. Ticks in the last 5 seconds, buzzes at zero.
 */
export default function Timer({ seconds, hotkey = true }: Props) {
  const fallback = seconds > 0 ? seconds : 30;
  const [duration, setDuration] = useState(fallback);
  const [left, setLeft] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const running = left !== null && left > 0;

  const start = (s = duration) => {
    setDuration(s);
    setLeft(s);
    setMenu(false);
  };
  const startRef = useRef(start);
  startRef.current = start;
  const wrap = useRef<HTMLSpanElement>(null);

  // The duration menu closes when clicking anywhere else (e.g. opening a question) or pressing Esc.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    addEventListener('pointerdown', onDown, true);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('pointerdown', onDown, true);
      removeEventListener('keydown', onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      const next = left! - 1;
      if (next === 0) sounds.timeUp();
      else if (next <= 5) sounds.tick();
      setLeft(next);
    }, 1000);
    return () => clearTimeout(id);
  }, [left, running]);

  useEffect(() => {
    if (!hotkey) return;
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, textarea')) return;
      e.preventDefault();
      startRef.current();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [hotkey]);

  return (
    <span className="timer-wrap" ref={wrap}>
      {left === null ? (
        <span className="timer-idle">
          <button className="btn ghost timer-btn" onClick={() => start()} title="Avvia il timer (T)">
            ⏱ {duration}s {hotkey && <kbd>T</kbd>}
          </button>
          <button className="btn ghost timer-more" onClick={() => setMenu((m) => !m)} aria-label="Scegli la durata">
            ▾
          </button>
        </span>
      ) : (
        <span className="timer-idle">
          <button className={`timer ${left === 0 ? 'over' : left <= 5 ? 'hurry' : ''}`} onClick={() => start()} title="Ricomincia (T)">
            <span className="timer-bar" style={{ width: `${(left / duration) * 100}%` }} />
            <span className="timer-text">{left === 0 ? '⏰ Tempo!' : `⏱ ${left}`}</span>
          </button>
          <button className="btn ghost timer-more" onClick={() => setLeft(null)} aria-label="Ferma il timer" title="Ferma">
            ✕
          </button>
        </span>
      )}
      {menu && (
        <span className="timer-menu">
          {TIMER_CHOICES.map((s) => (
            <button key={s} className={s === duration ? 'on' : ''} onClick={() => start(s)}>
              {s}s
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
