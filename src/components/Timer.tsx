import { useEffect, useRef, useState } from 'react';
import { sounds } from '../game/sounds';

/**
 * Countdown started by the host (button or T key). Ticks in the last 5 seconds, buzzes at zero.
 * Pressing again restarts it.
 */
export default function Timer({ seconds, autoStart = false }: { seconds: number; autoStart?: boolean }) {
  const [left, setLeft] = useState<number | null>(autoStart ? seconds : null);
  const running = left !== null && left > 0;
  const start = () => setLeft(seconds);
  const startRef = useRef(start);
  startRef.current = start;

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
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 't' || (e.target as HTMLElement).closest('input, textarea')) return;
      e.preventDefault();
      startRef.current();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);

  if (!seconds) return null;
  if (left === null)
    return (
      <button className="btn ghost timer-btn" onClick={start}>
        ⏱ {seconds}s <kbd>T</kbd>
      </button>
    );
  return (
    <button className={`timer ${left === 0 ? 'over' : left <= 5 ? 'hurry' : ''}`} onClick={start} title="Ricomincia (T)">
      <span className="timer-bar" style={{ width: `${(left / seconds) * 100}%` }} />
      <span className="timer-text">{left === 0 ? '⏰ Tempo!' : `⏱ ${left}`}</span>
    </button>
  );
}
