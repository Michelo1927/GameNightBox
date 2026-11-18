import { useState } from 'react';
import { savedSlots, slotOfPage, withSlot } from '../content';
import { go } from '../nav';
import { ask } from '../ask';
import { tr } from '../i18n';
import { loadSaved } from '../useSaved';

interface Props {
  /** Where the first game on the content is saved (the others add ~<n>, see slotOfPage in content.ts). */
  storeKey: string;
  /** The content's address, e.g. "/ritardo/esempio" (the others add ~<n>). */
  path: string;
}

const label = (slot: number) => tr(`Partita ${slot || 1}`, `Game ${slot || 1}`);

/**
 * The games on the same content, each with its own teams and save: switch to one, start a new one, delete one.
 * Not shown in the tournament, which plays one game per content.
 */
export default function GameSlots({ storeKey, path }: Props) {
  const [, redraw] = useState(0);
  const current = slotOfPage();
  const saved = savedSlots(storeKey);
  const slots = [...new Set([0, ...saved.map(([s]) => s), current])].sort((a, b) => a - b);
  const next = Math.max(1, ...slots) + 1;
  const teamsOf = (slot: number) =>
    (loadSaved<{ teams?: { name: string }[] }>(withSlot(storeKey, slot))?.teams ?? [])
      .map((t) => t.name)
      .filter(Boolean)
      .join(', ');
  const href = (slot: number) => `${path}${slot ? `~${slot}` : ''}/setup`;
  const remove = async (slot: number) => {
    if (!(await ask(tr(`Eliminare la ${label(slot)}? Squadre e punti si perdono.`, `Delete ${label(slot)}? Its teams and points are lost.`), tr('Elimina', 'Delete'))))
      return;
    try {
      localStorage.removeItem(withSlot(storeKey, slot));
    } catch {
      /* nothing saved */
    }
    redraw((n) => n + 1);
  };

  return (
    <div className="slots">
      {slots.map((slot) => {
        const teams = teamsOf(slot);
        return (
          <div key={slot} className={`slot${slot === current ? ' on' : ''}`}>
            <button className="slot-main" onClick={() => slot !== current && go(href(slot), true)} aria-current={slot === current}>
              <b>{label(slot)}</b>
              {teams && <span className="muted">{teams}</span>}
            </button>
            {slot !== current && slot !== 0 && (
              <button className="slot-x" title={tr('Elimina questa partita', 'Delete this game')} onClick={() => remove(slot)}>
                ✕
              </button>
            )}
          </div>
        );
      })}
      <button className="btn ghost slot-new" onClick={() => go(href(next), true)}>
        {tr('＋ Nuova partita', '＋ New game')}
      </button>
    </div>
  );
}
