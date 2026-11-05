import { useRef, useState } from 'react';
import { go } from '../nav';
import { cellKey, currentTurn, emptyGame, teamScore, useGame, type Result } from '../game/state';
import { mediaUrl, type LoadedQuiz } from '../quiz/load';
import QuestionModal from '../components/QuestionModal';
import Ranking from '../components/Ranking';

const SCORE_STEP = 50;

export default function Board({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const [game, setGame] = useGame(slug);
  const [open, setOpen] = useState<{ c: number; q: number } | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  const rows = Math.max(...quiz.categories.map((c) => c.questions.length));
  const turn = currentTurn(game, quiz);

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
          {turn.played}/{turn.total}
        </span>
        <TurnBadge turn={turn} onRanking={() => setShowRanking(true)} />
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
          <div key={t.id} className={`team-score ${turn.team?.id === t.id || turn.shared ? 'active' : ''}`} style={{ ['--team' as string]: t.color }}>
            <div className="team-name">{t.name}</div>
            <ScoreEdit score={teamScore(t, game, quiz)} onChange={(delta) => adjust(t.id, delta)} />
            <div className="team-adjust">
              <button onClick={() => adjust(t.id, -SCORE_STEP)} title={`-${SCORE_STEP}`}>−</button>
              <button onClick={() => adjust(t.id, SCORE_STEP)} title={`+${SCORE_STEP}`}>+</button>
            </div>
          </div>
        ))}
      </footer>

      {open && (
        <QuestionModal
          resolveUrl={(src) => mediaUrl(slug, src)}
          category={quiz.categories[open.c].name}
          question={quiz.categories[open.c].questions[open.q]}
          teams={game.teams}
          results={game.results[cellKey(open.c, open.q)] ?? {}}
          onResult={(teamId, r) => setResult(cellKey(open.c, open.q), teamId, r)}
          onClose={close}
          answering={game.played[cellKey(open.c, open.q)] ? undefined : turn.shared ? 'all' : turn.team}
        />
      )}
      {showRanking && <Ranking teams={game.teams.map((t) => ({ ...t, score: teamScore(t, game, quiz) }))} onClose={() => setShowRanking(false)} />}
    </div>
  );
}

function TurnBadge({ turn, onRanking }: { turn: ReturnType<typeof currentTurn>; onRanking: () => void }) {
  if (turn.finished)
    return (
      <button className="turn-badge finished" onClick={onRanking}>
        🏁 Partita finita: vedi la classifica
      </button>
    );
  if (turn.shared) return <span className="turn-badge shared">🔥 Domanda per tutti!</span>;
  if (!turn.team) return null;
  return (
    <span className="turn-badge" style={{ ['--team' as string]: turn.team.color }}>
      Tocca a <b>{turn.team.name}</b>
    </span>
  );
}

/**
 * Click the score to type it: "350" sets it, "+120" / "-30" adds or removes points
 * (so a negative score can only be reached by removing points, which is how it happens in play).
 * Stored as a manual correction, so the per-question results stay intact.
 */
function ScoreEdit({ score, onChange }: { score: number; onChange: (delta: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const done = useRef(false); // Enter and the blur that follows must not apply the change twice

  const open = () => {
    done.current = false;
    setText(String(score));
  };

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const t = (text ?? '').trim().replace(/\s/g, '');
    setText(null);
    if (!/^[+-]?\d+$/.test(t)) return;
    const n = Number(t);
    const relative = /^[+-]/.test(t) && t !== String(score);
    const delta = relative ? n : n - score;
    if (delta) onChange(delta);
  };

  if (text === null)
    return (
      <button className="team-points" title="Clicca per modificare il punteggio" onClick={open}>
        {score}
      </button>
    );
  return (
    <input
      className="team-points team-points-input"
      autoFocus
      inputMode="numeric"
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          done.current = true;
          setText(null);
        }
      }}
    />
  );
}
