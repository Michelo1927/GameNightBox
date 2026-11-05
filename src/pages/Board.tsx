import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { go } from '../nav';
import {
  boardScore,
  cellKey,
  currentTurn,
  gameOver,
  maxPoints,
  resetGame,
  settingsOf,
  teamScore,
  useGame,
  type FinalState,
  type Result,
} from '../game/state';
import { sounds, useMuted } from '../game/sounds';
import { mediaUrl, type LoadedQuiz } from '../quiz/load';
import QuestionModal from '../components/QuestionModal';
import DoubleBet from '../components/DoubleBet';
import FinalModal from '../components/FinalModal';
import Ranking from '../components/Ranking';
import AnimatedNumber from '../components/AnimatedNumber';

const SCORE_STEP = 50;
const NEW_FINAL: FinalState = { stage: 'bets', bets: {}, results: {} };

type Open = { c: number; q: number; origin?: { x: number; y: number } };

export default function Board({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const { game, setGame, undo, canUndo } = useGame(slug, quiz);
  const [open, setOpen] = useState<Open | null>(null);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [muted, setMuted] = useMuted();
  const settings = settingsOf(game);

  const rows = Math.max(...quiz.categories.map((c) => c.questions.length));
  const turn = currentTurn(game, quiz);
  const over = gameOver(game, quiz);
  // Categories are revealed one by one only at the start of a new game.
  const [intro] = useState(() => turn.played === 0);

  // The winner screen opens by itself when the last question is closed (not when reloading a finished game).
  const wasOver = useRef(over);
  useEffect(() => {
    if (over && !wasOver.current) {
      setShowFinal(false);
      setRanking('celebrate');
    }
    wasOver.current = over;
  }, [over]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea') || open || showFinal) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) toggleFullscreen();
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [undo, open, showFinal]);

  const setResult = (key: string, teamId: string, r: Result | null) => {
    if (r) (r === 'right' ? sounds.right : sounds.wrong)();
    setGame((g) => {
      const byTeam = { ...(g.results[key] ?? {}) };
      if (r) byTeam[teamId] = r;
      else delete byTeam[teamId];
      return { ...g, results: { ...g.results, [key]: byTeam } };
    });
  };

  const openCell = (c: number, q: number, e: MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOpen({ c, q, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
  };

  const close = () => {
    if (open) {
      const key = cellKey(open.c, open.q);
      setGame((g) => (g.played[key] ? g : { ...g, played: { ...g.played, [key]: true } }));
    }
    setOpen(null);
  };

  const adjust = (teamId: string, delta: number) =>
    setGame((g) => ({ ...g, teams: g.teams.map((t) => (t.id === teamId ? { ...t, adjust: t.adjust + delta } : t)) }));

  const restart = () => {
    if (confirm('Azzerare punteggi e caselle giocate? Le squadre restano.')) setGame((g) => resetGame(g, quiz));
  };

  // What the open cell needs: a Raddoppio bet first, or the question.
  const openKey = open ? cellKey(open.c, open.q) : '';
  const isDouble = !!open && !!game.doubles?.includes(openKey);
  const bet = open ? game.bets?.[openKey] : undefined;
  const betTeam = bet ? game.teams.find((t) => t.id === bet.teamId) : undefined;
  const needsBet = isDouble && !bet && !game.played[openKey] && !!turn.team;

  return (
    <div className="board-page">
      <header className="board-header">
        <a className="back" href="#/">←</a>
        <h1 className="title">{quiz.title}</h1>
        <span className="muted progress">
          {turn.played}/{turn.total}
        </span>
        <TurnBadge
          turn={turn}
          over={over}
          hasFinal={!!quiz.final}
          onRanking={() => setRanking(over ? 'celebrate' : 'normal')}
          onFinal={() => {
            if (!game.final) setGame((g) => ({ ...g, final: NEW_FINAL }));
            setShowFinal(true);
          }}
        />
        <div className="header-actions">
          <button className="btn ghost icon" onClick={undo} disabled={!canUndo} title="Annulla l'ultima azione (Ctrl+Z)">
            ↶ Annulla
          </button>
          <button className="btn ghost icon" onClick={() => setMuted(!muted)} title={muted ? 'Attiva i suoni' : 'Disattiva i suoni'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="btn ghost icon" onClick={toggleFullscreen} title="Schermo intero (F)">
            ⛶
          </button>
          <button className="btn ghost" onClick={() => go(`/q/${slug}/setup`)}>Squadre</button>
          <button className="btn ghost" onClick={restart}>Ricomincia</button>
          <button className="btn primary" onClick={() => setRanking(over ? 'celebrate' : 'normal')}>Classifica</button>
        </div>
      </header>

      <div
        className={`board ${intro ? 'intro' : ''}`}
        style={{ gridTemplateColumns: `repeat(${quiz.categories.length}, 1fr)`, gridTemplateRows: `auto repeat(${rows}, 1fr)` }}
      >
        {quiz.categories.map((cat, c) => (
          <div key={cat.name} className="cat-cell" style={{ animationDelay: `${0.15 + c * 0.35}s` }}>
            <span>{cat.name}</span>
          </div>
        ))}
        {Array.from({ length: rows }, (_, q) =>
          quiz.categories.map((cat, c) => {
            const question = cat.questions[q];
            if (!question) return <div key={`${c}-${q}`} className="cell empty" />;
            const key = cellKey(c, q);
            const results = game.results[key] ?? {};
            const played = game.played[key];
            const wasDouble = played && game.bets?.[key];
            return (
              <button
                key={key}
                className={`cell ${played ? 'played' : ''}`}
                style={{ animationDelay: `${0.15 + quiz.categories.length * 0.35 + (q * quiz.categories.length + c) * 0.025}s` }}
                onClick={(e) => openCell(c, q, e)}
              >
                <span className="points">{question.points}</span>
                {wasDouble && <span className="double-mark" title="Raddoppio">🎲</span>}
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

      {open && needsBet && turn.team && (
        <DoubleBet
          team={turn.team}
          category={quiz.categories[open.c].name}
          points={quiz.categories[open.c].questions[open.q].points}
          max={Math.max(boardScore(turn.team, game, quiz), maxPoints(quiz))}
          origin={open.origin}
          onClose={() => setOpen(null)}
          onBet={(amount) => setGame((g) => ({ ...g, bets: { ...g.bets, [openKey]: { teamId: turn.team!.id, amount } } }))}
        />
      )}
      {open && !needsBet && (
        <QuestionModal
          resolveUrl={(src) => mediaUrl(slug, src)}
          category={quiz.categories[open.c].name}
          question={quiz.categories[open.c].questions[open.q]}
          teams={game.teams}
          results={game.results[openKey] ?? {}}
          onResult={(teamId, r) => setResult(openKey, teamId, r)}
          onClose={close}
          answering={game.played[openKey] ? undefined : turn.shared ? 'all' : turn.team}
          timer={settings.timer}
          bet={bet && betTeam ? { team: betTeam, amount: bet.amount } : undefined}
          origin={isDouble ? undefined : open.origin}
        />
      )}
      {showFinal && quiz.final && (
        <FinalModal
          final={quiz.final}
          state={game.final ?? NEW_FINAL}
          teams={game.teams}
          scores={Object.fromEntries(game.teams.map((t) => [t.id, boardScore(t, game, quiz)]))}
          timer={settings.timer}
          resolveUrl={(src) => mediaUrl(slug, src)}
          onChange={(final) => setGame((g) => ({ ...g, final }))}
          onClose={() => setShowFinal(false)}
        />
      )}
      {ranking && (
        <Ranking
          teams={game.teams.map((t) => ({ ...t, score: teamScore(t, game, quiz) }))}
          celebrate={ranking === 'celebrate'}
          onClose={() => setRanking(null)}
        />
      )}
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

interface BadgeProps {
  turn: ReturnType<typeof currentTurn>;
  over: boolean;
  hasFinal: boolean;
  onRanking: () => void;
  onFinal: () => void;
}

function TurnBadge({ turn, over, hasFinal, onRanking, onFinal }: BadgeProps) {
  if (turn.finished && hasFinal && !over)
    return (
      <button className="turn-badge final" onClick={onFinal}>
        🏆 Domanda finale!
      </button>
    );
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
        <AnimatedNumber value={score} />
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
