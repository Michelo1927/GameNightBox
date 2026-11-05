import { useEffect, type CSSProperties } from 'react';
import { sounds } from '../game/sounds';
import type { Special, SpecialKind, Team } from '../game/state';

export const SPECIAL_INFO: Record<SpecialKind, { icon: string; name: string }> = {
  steal: { icon: '🥷', name: 'Furto' },
  pass: { icon: '🎯', name: 'Passa la mano' },
  gift: { icon: '🎁', name: 'Imprevisto' },
};

interface Props {
  special: Special;
  team: Team;
  category: string;
  points: number;
  /** Shows the question (Furto, Passa la mano). */
  onContinue: () => void;
  onClose: () => void;
  origin?: { x: number; y: number };
}

/** The surprise screen of a special cell: explains the rule, or shows the Imprevisto card. */
export default function SpecialIntro({ special, team, category, points, onContinue, onClose, origin }: Props) {
  const info = SPECIAL_INFO[special.kind];
  const gift = special.kind === 'gift' ? special.gift : undefined;

  // Each special has its own sound; for the Imprevisto, each card has one too.
  useEffect(() => {
    if (special.kind === 'gift') sounds.gift(special.gift?.icon ?? '');
    else sounds[special.kind]();
    // Only when the screen opens, not at every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        (gift ? onClose : onContinue)();
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose, onContinue, gift]);

  const style = { ['--team' as string]: team.color, ...(origin ? { transformOrigin: `${origin.x}px ${origin.y}px` } : {}) } as CSSProperties;
  return (
    <div className="overlay question-overlay double" style={style}>
      <div className="double-box">
        <div className="double-title">
          {info.icon} {info.name.toUpperCase()}!
        </div>
        <p className="double-cat">
          {category} · {points}
        </p>
        {special.kind === 'steal' && (
          <p className="double-team">
            <b>{team.name}</b>: se rispondete giusto, i {points} punti li <b>rubate</b> a una squadra a vostra scelta. Se sbagliate li perdete, come sempre.
          </p>
        )}
        {special.kind === 'pass' && (
          <p className="double-team">
            <b>{team.name}</b>: leggete la domanda e decidete se rispondere voi o <b>passarla</b> a un'altra squadra. Se quella sbaglia, i {points} punti
            vanno a voi; se indovina, li prende lei.
          </p>
        )}
        {gift && (
          <div className="gift-card">
            <div className="gift-icon">{gift.icon}</div>
            <div className="gift-title">{gift.title}</div>
            <p className="gift-text">{gift.text}</p>
          </div>
        )}
        <div className="double-actions">
          {gift ? (
            <button className="btn primary big" onClick={onClose}>
              Torna al tabellone
            </button>
          ) : (
            <>
              <button className="btn primary big" onClick={onContinue}>
                Mostra la domanda
              </button>
              <button className="btn ghost" onClick={onClose}>
                Tabellone <kbd>Esc</kbd>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
