import { useEffect, useMemo } from 'react';
import { sounds } from '../game/sounds';
import type { Team } from '../game/state';

interface Props {
  teams: (Team & { score: number })[];
  onClose: () => void;
  /** End of the game: big winner, confetti and fanfare. */
  celebrate?: boolean;
}

export default function Ranking({ teams, onClose, celebrate }: Props) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose]);

  useEffect(() => {
    if (celebrate) sounds.win();
  }, [celebrate]);

  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winners = sorted.filter((t) => t.score === sorted[0]?.score);
  const medals = ['🥇', '🥈', '🥉'];
  // Position = 1 + teams with a strictly higher score, so ties share the medal.
  const position = (score: number) => sorted.filter((t) => t.score > score).length;

  return (
    <div className="overlay" onClick={onClose}>
      {celebrate && <Confetti colors={teams.map((t) => t.color)} />}
      <div className={`ranking ${celebrate ? 'celebrate' : ''}`} onClick={(e) => e.stopPropagation()}>
        {celebrate && winners.length > 0 && (
          <div className="winner">
            <div className="winner-label">{winners.length > 1 ? '🏆 Pareggio!' : '🏆 Vince'}</div>
            <div className="winner-name">
              {winners.map((w, i) => (
                <span key={w.id} style={{ color: w.color }}>
                  {i > 0 && ' & '}
                  {w.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <h2>Classifica</h2>
        <ol>
          {sorted.map((t) => (
            <li key={t.id} style={{ borderColor: t.color }}>
              <span className="pos">{medals[position(t.score)] ?? `${position(t.score) + 1}°`}</span>
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

function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(() => {
    const palette = [...colors, '#ffcc00', '#ffffff'];
    return Array.from({ length: 140 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.8 + Math.random() * 2.5,
      color: palette[i % palette.length],
      size: 6 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 30,
    }));
  }, [colors]);
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--drift' as string]: `${p.drift}vw`,
          }}
        />
      ))}
    </div>
  );
}
