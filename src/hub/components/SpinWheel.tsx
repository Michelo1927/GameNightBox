import { useRef, useState } from 'react';
import { sounds } from '../sounds';

/** A slice of the wheel. `color` can be any CSS colour, also var(--x) (`className` sets the variables). */
export interface Slice {
  id: string;
  label: string;
  color: string;
  className?: string;
}

const SPIN_MS = 4200;

/** Point on the wheel (radius r) at an angle measured clockwise from the top. */
function at(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
}

/**
 * A wheel of fortune: spin() turns it and, when it stops, calls onPicked with the slice under the pointer.
 * Shared by the order wheel (who plays first) and the tournament's wheel (which game is next).
 */
export function useSpinWheel<T extends Slice>(slices: T[], onPicked: (s: T) => void) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const wheel = useRef<SVGGElement>(null);
  const pointer = useRef<SVGPathElement>(null);
  const seg = 360 / Math.max(slices.length, 1);

  const spin = () => {
    if (spinning || !slices.length) return;
    const i = Math.floor(Math.random() * slices.length);
    // Stop somewhere inside the slice, not always in its middle.
    const stopAt = (i + 0.5 + (Math.random() - 0.5) * 0.7) * seg;
    const target = rot + 360 * 5 + ((((-stopAt - rot) % 360) + 360) % 360);
    setRot(target);
    setSpinning(true);

    // A tick each time a slice edge passes under the pointer, like a real wheel.
    let last = -1;
    let frame = 0;
    const follow = () => {
      const el = wheel.current;
      if (el) {
        const m = new DOMMatrix(getComputedStyle(el).transform);
        const deg = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
        const slice = Math.floor(deg / seg);
        if (last !== -1 && slice !== last) {
          sounds.tick();
          // The pointer is pushed aside by the edge and springs back.
          pointer.current?.animate([{ transform: 'rotate(-16deg)' }, { transform: 'rotate(5deg)', offset: 0.6 }, { transform: 'none' }], {
            duration: 140,
            easing: 'ease-out',
          });
        }
        last = slice;
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);

    setTimeout(() => {
      cancelAnimationFrame(frame);
      setSpinning(false);
      onPicked(slices[i]);
    }, SPIN_MS);
  };

  return { spin, spinning, rot, setRot, wheel, pointer, seg };
}

interface FaceProps {
  slices: Slice[];
  spin: ReturnType<typeof useSpinWheel>;
  /** The slice just picked, highlighted. */
  picked?: string;
}

/** The drawing of the wheel. */
export function WheelFace({ slices, spin: { rot, spinning, wheel, pointer, seg }, picked }: FaceProps) {
  const fontSize = slices.length > 6 ? 7 : slices.length > 3 ? 8.5 : 10;
  return (
    <div className="wheel-wrap">
      <svg viewBox="-110 -110 220 220" className="wheel">
        <g
          key={slices.length}
          ref={wheel}
          style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)` : 'none' }}
        >
          {slices.length === 1 ? (
            <circle r="100" className={slices[0].className} style={{ fill: slices[0].color }} />
          ) : (
            slices.map((s, i) => (
              <path
                key={s.id}
                d={`M 0 0 L ${at(i * seg, 100)} A 100 100 0 ${seg > 180 ? 1 : 0} 1 ${at((i + 1) * seg, 100)} Z`}
                className={s.className}
                style={{ fill: s.color }}
                stroke="#0b0f3a"
                strokeWidth="1.5"
              />
            ))
          )}
          {slices.map((s, i) => (
            <text
              key={s.id}
              // Names on the left half are turned around so they never read upside down.
              transform={`rotate(${(i + 0.5) * seg - 90}) translate(58 0)${(i + 0.5) * seg > 180 ? ' rotate(180)' : ''}`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              className={`wheel-label ${picked === s.id ? 'on' : ''}`}
            >
              {s.label.length > 12 ? s.label.slice(0, 11) + '…' : s.label}
            </text>
          ))}
        </g>
        <circle r="12" className="wheel-hub" />
        <path ref={pointer} d="M -9 -112 L 9 -112 L 0 -94 Z" className="wheel-pointer" />
      </svg>
    </div>
  );
}
