import { useEffect, useRef, useState } from 'react';

/** Counts up/down to the new value and flashes green or red when it changes. */
export default function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<{ dir: 'up' | 'down'; n: number } | null>(null);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    setFlash((f) => ({ dir: value > start ? 'up' : 'down', n: (f?.n ?? 0) + 1 }));
    const t0 = performance.now();
    const duration = 600;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - (1 - k) ** 3;
      const v = Math.round(start + (value - start) * eased);
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
      setShown(value);
    };
  }, [value]);

  return (
    <span key={flash?.n} className={`anim-num ${flash ? `flash-${flash.dir}` : ''}`}>
      {shown}
    </span>
  );
}
