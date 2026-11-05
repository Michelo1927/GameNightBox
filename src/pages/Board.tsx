import { useState } from 'react';
import { go } from '../nav';
import { cellKey, emptyGame, teamScore, useGame, type Result } from '../game/state';
import type { LoadedQuiz } from '../quiz/load';
import QuestionModal from '../components/QuestionModal';
import Ranking from '../components/Ranking';

const SCORE_STEP = 50;

export default function Board({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const [game, setGame] = useGame(slug);
  const [open, setOpen] = useState<{ c: number; q: number } | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  const rows = Math.max(...quiz.categories.map((c) => c.questions.length));
  const totalCells = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  const playedCount = Object.keys(game.played).length;

  const setResult = (key: string, teamId: string, r: Result | null) =>
    setGame((g) => {
      const byTeam = { ...(g.results[key] ?? {}) };
      if (r) byTeam[teamId] = r;
      else delete byTeam[teamId];
      return { ...g, results: { ...g.results, [key]: byTeam } };
    });

  const close = () => {
    if (open) {
      const key = cellKey(open.c, open.q);
      setGame((g) => ({ ...g, played: { ...g.played, [key]: true } }));
    }
    setOpen(null);
  };

  const adjust = (teamId: string, delta: number) =>
    setGame((g) => ({ ...g, teams: g.teams.map((t) => (t.id === teamId ? { ...t, adjust: t.adjust + delta } : t)) }));

  const restart = () => {
    if (confirm('Azzerare punteggi e caselle giocate? Le squadre restano.'))
      setGame((g) => ({ ...emptyGame(), teams: g.teams.map((t) => ({ ...t, adjust: 0 })) }));
  };

  return (
    <div className="board-page">
      <header className="board-header">
        <a className="back" href="#/">←</a>
        <h1 className="title">{quiz.title}</h1>
        <span className="muted progress">
          {playedCount}/{totalCells}
        </span>
        <div className="header-actions">
          <button className="btn ghost" onClick={() => go(`/q/${slug}/setup`)}>Squadre</button>
          <button className="btn ghost" onClick={restart}>Ricomincia</button>
          <button className="btn primary" onClick={() => setShowRanking(true)}>Classifica</button>
        </div>
      </header>

      <div className="board" style={{ gridTemplateColumns: `repeat(${quiz.categories.length}, 1fr)`, gridTemplateRows: `auto repeat(${rows}, 1fr)` }}>
        {quiz.categories.map((cat) => (
          <div key={cat.name} className="cat-cell">
            <span>{cat.name}</span>
          </div>
        ))}
        {Array.from({ length: rows }, (_, q) =>
          quiz.categories.map((cat, c) => {
            const question = cat.questions[q];
            if (!question) return <div key={`${c}-${q}`} className="cell empty" />;
            const key = cellKey(c, q);
            const results = game.results[key] ?? {};
            return (
              <button key={key} className={`cell ${game.played[key] ? 'played' : ''}`} onClick={() => setOpen({ c, q })}>
                <span className="points">{question.points}</span>
                <span className="dots">
                  {game.teams
                    .filter((t) => results[t.id])
                    .map((t) => (
                      <i key={t.id} style={{ background: t.color }} title={`${t.name}: ${results[t.id] === 'right' ? 'giusta' : 'sbagliata'}`}>
                        {results[t.id] === 'right' ? '✓' : '✗'}
                      </i>
                    ))}
                </span>
              </button>
            );
          }),
        )}
      </div>

      <footer className="teams-bar">
        {game.teams.map((t) => (
          <div key={t.id} className="team-score" style={{ ['--team' as string]: t.color }}>
            <div className="team-name">{t.name}</div>
            <div className="team-points">{teamScore(t, game, quiz)}</div>
            <div className="team-adjust">
              <button onClick={() => adjust(t.id, -SCORE_STEP)} title={`-${SCORE_STEP}`}>−</button>
              <button onClick={() => adjust(t.id, SCORE_STEP)} title={`+${SCORE_STEP}`}>+</button>
            </div>
          </div>
        ))}
      </footer>

      {open && (
        <QuestionModal
          slug={slug}
          category={quiz.categories[open.c].name}
          question={quiz.categories[open.c].questions[open.q]}
          teams={game.teams}
          results={game.results[cellKey(open.c, open.q)] ?? {}}
          onResult={(teamId, r) => setResult(cellKey(open.c, open.q), teamId, r)}
          onClose={close}
        />
      )}
      {showRanking && <Ranking teams={game.teams.map((t) => ({ ...t, score: teamScore(t, game, quiz) }))} onClose={() => setShowRanking(false)} />}
    </div>
  );
}
