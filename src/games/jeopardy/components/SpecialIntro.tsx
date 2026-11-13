import { useEffect, type CSSProperties } from 'react';
import { sounds } from '../../../hub/sounds';
import type { Special, SpecialKind, Team } from '../state';
import { tr } from '../../../hub/i18n';

export const SPECIAL_INFO: Record<SpecialKind, { icon: string; name: string }> = {
  steal: { icon: '🥷', name: tr('Furto', 'Heist') },
  pass: { icon: '🎯', name: tr('Passa la mano', 'Pass It On') },
  gift: { icon: '🎁', name: tr('Imprevisto', 'Wild Card') },
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
        onContinue();
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose, onContinue]);

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
            {tr(
              <>
                <b>{team.name}</b>: se rispondete giusto, i {points} punti li <b>rubate</b> a una squadra a vostra scelta. Se sbagliate li perdete, come sempre.
              </>,
              <>
                <b>{team.name}</b>: if you answer right, you <b>steal</b> the {points} points from a team of your choice. If you get it wrong you lose them, as usual.
              </>,
            )}
          </p>
        )}
        {special.kind === 'pass' && (
          <p className="double-team">
            {tr(
              <>
                <b>{team.name}</b>: leggete la domanda e decidete se rispondere voi o <b>passarla</b> a un'altra squadra. Se quella sbaglia, i {points} punti
                vanno a voi; se indovina, li prende lei.
              </>,
              <>
                <b>{team.name}</b>: read the question and decide whether to answer yourselves or <b>pass it</b> to another team. If they get it wrong, the{' '}
                {points} points go to you; if they get it right, they take them.
              </>,
            )}
          </p>
        )}
        {gift && (
          <div className="gift-card">
            <div className="gift-icon">{gift.icon}</div>
            <div className="gift-title">{gift.title}</div>
            <p className="gift-text">{gift.text}</p>
          </div>
        )}
        {gift && (
          <p className="double-team">
            {tr(
              <>
                E adesso <b>{team.name}</b> risponde comunque alla domanda da {points} punti.
              </>,
              <>
                And now <b>{team.name}</b> still answers the {points}-point question.
              </>,
            )}
          </p>
        )}
        <div className="double-actions">
          <button className="btn primary big" onClick={onContinue}>
            {tr('Mostra la domanda', 'Show the question')}
          </button>
          <button className="btn ghost" onClick={onClose}>
            {tr('Tabellone', 'Board')} <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
