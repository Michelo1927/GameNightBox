import { useEffect, useState } from 'react';
import { useSpinWheel, WheelFace } from './SpinWheel';
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

/** Wheel of fortune that draws the playing order one team at a time. */
export default function OrderWheel({ teams, onDone, onSkip, onClose }: Props) {
  const [left, setLeft] = useState(teams);
  const [order, setOrder] = useState<Team[]>([]);
  const [picked, setPicked] = useState<Team>();
  const done = left.length === 0;
  const slices = left.map((t) => ({ id: t.id, label: t.name, color: t.color }));
  const wheel = useSpinWheel(slices, (s) => {
    const team = left.find((t) => t.id === s.id)!;
    setPicked(team);
    sounds.right();
    const nextOrder = [...order, team];
    const rest = left.filter((t) => t.id !== team.id);
    setTimeout(() => {
      setPicked(undefined);
      wheel.setRot(0);
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
  });
  const spinning = wheel.spinning;
  const spin = () => {
    if (!picked && !done) wheel.spin();
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

  return (
    <div className="overlay wheel-overlay">
      <div className="wheel-box">
        <h2 className="wheel-title">🎡 {tr('Chi inizia?', 'Who goes first?')}</h2>

        {!done && <WheelFace slices={slices} spin={wheel} picked={picked?.id} />}

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
