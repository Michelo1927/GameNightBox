import { useEffect } from 'react';
import type { Team } from '../game/state';

export default function Ranking({ teams, onClose }: { teams: (Team & { score: number })[]; onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose]);

  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="ranking" onClick={(e) => e.stopPropagation()}>
        <h2>Classifica</h2>
        <ol>
          {sorted.map((t, i) => (
            <li key={t.id} style={{ borderColor: t.color }}>
              <span className="pos">{medals[i] ?? `${i + 1}°`}</span>
              <span className="name">{t.name}</span>
              <span className="score">{t.score}</span>
            </li>
          ))}
        </ol>
        <button className="btn primary" onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}
