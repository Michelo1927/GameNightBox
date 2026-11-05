import { useEffect, useState, type CSSProperties } from 'react';
import { sounds } from '../game/sounds';
import type { Team } from '../game/state';

interface Props {
  team: Team;
  category: string;
  /** Highest allowed bet: the team's score, or the top value on the board if that is higher. */
  max: number;
  /** Shown on the quick buttons: the cell's own value. */
  points: number;
  onBet: (amount: number) => void;
  onClose: () => void;
  origin?: { x: number; y: number };
}

/** "Raddoppio!": the team whose turn it is bets before seeing the question. */
export default function DoubleBet({ team, category, max, points, onBet, onClose, origin }: Props) {
  const [text, setText] = useState(String(Math.min(points, max)));
  const amount = Number(text);
  const valid = text.trim() !== '' && Number.isInteger(amount) && amount >= 0 && amount <= max;

  useEffect(() => {
    sounds.double();
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose]);

  const style = { ['--team' as string]: team.color, ...(origin ? { transformOrigin: `${origin.x}px ${origin.y}px` } : {}) } as CSSProperties;
  return (
    <div className="overlay question-overlay double" style={style}>
      <div className="double-box">
        <div className="double-title">🎲 RADDOPPIO!</div>
        <p className="double-cat">{category}</p>
        <p className="double-team">
          <b>{team.name}</b>, quanto scommettete?
        </p>
        <p className="muted">Da 0 a {max} punti. Se rispondete giusto li vincete, se sbagliate li perdete.</p>
        <input
          className="double-input"
          autoFocus
          inputMode="numeric"
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && valid) onBet(amount);
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="double-quick">
          {[...new Set([Math.min(points, max), Math.floor(max / 2 / 50) * 50, max])].filter((n) => n > 0).map((n) => (
            <button key={n} className="btn ghost" onClick={() => setText(String(n))}>
              {n === max ? `Tutto (${n})` : n}
            </button>
          ))}
        </div>
        <div className="double-actions">
          <button className="btn primary big" disabled={!valid} onClick={() => onBet(amount)}>
            Mostra la domanda
          </button>
          <button className="btn ghost" onClick={onClose}>Tabellone <kbd>Esc</kbd></button>
        </div>
      </div>
    </div>
  );
}
