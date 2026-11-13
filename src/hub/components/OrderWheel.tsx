import { useEffect, useRef, useState } from 'react';
import { sounds } from '../sounds';
import type { Team } from '../teams';
import { KEY, ordinal, tr } from '../i18n';

interface Props {
  teams: Team[];
  /** The drawn order, first team first. */
  onDone: (order: Team[]) => void;
  /** Keep the current order and start anyway. */
  onSkip: () => void;
  onClose: () => void;
}

const SPIN_MS = 4200;

/** Point on the wheel (radius r) at an angle measured clockwise from the top. */
function at(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
}

/** Wheel of fortune that draws the playing order one team at a time. */
export default function OrderWheel({ teams, onDone, onSkip, onClose }: Props) {
  const [left, setLeft] = useState(teams);
  const [order, setOrder] = useState<Team[]>([]);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Team>();
  const wheel = useRef<SVGGElement>(null);
  const pointer = useRef<SVGPathElement>(null);
  const done = left.length === 0;
  const seg = 360 / Math.max(left.length, 1);

  const spin = () => {
    if (spinning || picked || done) return;
    const i = Math.floor(Math.random() * left.length);
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
      const team = left[i];
      setPicked(team);
      sounds.right();
      const nextOrder = [...order, team];
      const rest = left.filter((t) => t.id !== team.id);
      setTimeout(() => {
        setPicked(undefined);
        setRot(0);
        // The last team left has nowhere else to go.
        if (rest.length === 1) {
          setOrder([...nextOrder, rest[0]]);
          setLeft([]);
          sounds.win();
        } else {
          setOrder(nextOrder);
          setLeft(rest);
        }
      }, 1400);
    }, SPIN_MS);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (done) onDone(order);
        else spin();
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });

  const fontSize = left.length > 6 ? 7 : left.length > 3 ? 8.5 : 10;
  return (
    <div className="overlay wheel-overlay">
      <div className="wheel-box">
        <h2 className="wheel-title">🎡 {tr('Chi inizia?', 'Who goes first?')}</h2>

        {!done && (
          <div className="wheel-wrap">
            <svg viewBox="-110 -110 220 220" className="wheel">
              <g
                key={left.length}
                ref={wheel}
                style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)` : 'none' }}
              >
                {left.length === 1 ? (
                  <circle r="100" fill={left[0].color} />
                ) : (
                  left.map((t, i) => (
                    <path
                      key={t.id}
                      d={`M 0 0 L ${at(i * seg, 100)} A 100 100 0 ${seg > 180 ? 1 : 0} 1 ${at((i + 1) * seg, 100)} Z`}
                      fill={t.color}
                      stroke="#0b0f3a"
                      strokeWidth="1.5"
                    />
                  ))
                )}
                {left.map((t, i) => (
                  <text
                    key={t.id}
                    // Names on the left half are turned around so they never read upside down.
                    transform={`rotate(${(i + 0.5) * seg - 90}) translate(58 0)${(i + 0.5) * seg > 180 ? ' rotate(180)' : ''}`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    className={`wheel-label ${picked?.id === t.id ? 'on' : ''}`}
                  >
                    {t.name.length > 12 ? t.name.slice(0, 11) + '…' : t.name}
                  </text>
                ))}
              </g>
              <circle r="12" className="wheel-hub" />
              <path ref={pointer} d="M -9 -112 L 9 -112 L 0 -94 Z" className="wheel-pointer" />
            </svg>
          </div>
        )}

        <p className="wheel-status">
          {picked ? (
            <>
              <b style={{ color: picked.color }}>{picked.name}</b> {tr(`gioca per ${order.length + 1}ª!`, `plays ${ordinal(order.length + 1)}!`)}
            </>
          ) : done ? (
            tr('Ecco l’ordine di gioco:', 'Here is the playing order:')
          ) : order.length === 0 ? (
            tr('Gira la ruota per scoprire chi gioca per prima.', 'Spin the wheel to find out who plays first.')
          ) : (
            tr(`Gira ancora: chi gioca per ${order.length + 1}ª?`, `Spin again: who plays ${ordinal(order.length + 1)}?`)
          )}
        </p>

        {order.length > 0 && (
          <ol className={`wheel-order ${done ? 'big' : ''}`}>
            {order.map((t) => (
              <li key={t.id} style={{ ['--team' as string]: t.color }}>
                {t.name}
              </li>
            ))}
          </ol>
        )}

        <div className="double-actions">
          {done ? (
            <button className="btn primary big" onClick={() => onDone(order)}>
              {tr('Al tabellone!', "Let's play!")} <kbd>{KEY.enter}</kbd>
            </button>
          ) : (
            <>
              <button className="btn primary big" onClick={spin} disabled={spinning || !!picked}>
                {spinning ? tr('Gira…', 'Spinning…') : tr('Gira la ruota', 'Spin the wheel')} <kbd>{KEY.space}</kbd>
              </button>
              {order.length === 0 && !spinning && !picked && (
                <button className="btn ghost" onClick={onSkip}>
                  {tr("Salta, tieni l'ordine della lista", 'Skip, keep the order of the list')}
                </button>
              )}
            </>
          )}
          <button className="btn ghost" onClick={onClose}>
            {tr('Indietro', 'Back')} <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
