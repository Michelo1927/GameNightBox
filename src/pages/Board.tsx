import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { go } from '../nav';
import {
  boardScore,
  cellKey,
  currentTurn,
  drawGift,
  gameOver,
  resetGame,
  settingsOf,
  teamScore,
  useGame,
  usesQuizFinal,
  type FinalState,
  type Result,
} from '../game/state';
import { sounds, useMuted } from '../game/sounds';
import { mediaUrl, type LoadedQuiz } from '../quiz/load';
import QuestionModal from '../components/QuestionModal';
import SpecialIntro, { SPECIAL_INFO } from '../components/SpecialIntro';
import FinalModal from '../components/FinalModal';
import Ranking from '../components/Ranking';
import AnimatedNumber from '../components/AnimatedNumber';
import Timer from '../components/Timer';

const SCORE_STEP = 50;
const NEW_FINAL: FinalState = { stage: 'bets', bets: {}, results: {} };

/** intro: the special cell's surprise screen comes before the question. */
type Open = { c: number; q: number; origin?: { x: number; y: number }; intro?: boolean };

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
    const key = cellKey(c, q);
    // The last leftover cell (or the cell already used as final) opens as the final question.
    if (game.final?.cell === key || (turn.lastCell && !game.played[key])) {
      if (game.final?.cell !== key) setGame((g) => ({ ...g, final: { ...NEW_FINAL, cell: key } }));
      setShowFinal(true);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    // A special cell found by the team whose turn it is: remember who found it (and draw the Imprevisto card).
    const sp = game.specials?.[key];
    const team = turn.team;
    if (sp && !game.played[key] && team) {
      setGame((g) => {
        const cur = g.specials![key];
        const gift = cur.kind === 'gift' ? (cur.gift ?? drawGift(g, quiz, key, team.id)) : undefined;
        return { ...g, specials: { ...g.specials, [key]: { ...cur, by: cur.by ?? team.id, gift } } };
      });
      setOpen({ c, q, origin, intro: true });
      return;
    }
    // An Imprevisto already drawn shows its card again (it has no question).
    setOpen({ c, q, origin, intro: sp?.kind === 'gift' && !!sp.by });
  };

  const setTarget = (key: string, teamId?: string) =>
    setGame((g) => {
      const sp = g.specials?.[key];
      if (!sp) return g;
      // Taking back a pass also removes the answer of the team it was passed to.
      let results = g.results;
      if (sp.kind === 'pass' && sp.target && !teamId) {
        const byTeam = { ...(g.results[key] ?? {}) };
        delete byTeam[sp.target];
        results = { ...g.results, [key]: byTeam };
      }
      return { ...g, results, specials: { ...g.specials, [key]: { ...sp, target: teamId } } };
    });

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

  // The open cell's special rule, active only if it was found by a team on its turn.
  const openKey = open ? cellKey(open.c, open.q) : '';
  const teamById = (id?: string) => game.teams.find((t) => t.id === id);
  const openSpecial = open ? game.specials?.[openKey] : undefined;
  const finder = teamById(openSpecial?.by);
  const special = openSpecial && finder ? openSpecial : undefined;
  const showIntro = !!open?.intro && !!special;

  // The final is either the last leftover cell or the quiz's own final question.
  const finalCell = game.final?.cell?.split('-').map(Number);
  const finalQuestion = finalCell
    ? (() => {
        const cat = quiz.categories[finalCell[0]];
        const { points: _, ...q } = cat.questions[finalCell[1]];
        return { ...q, category: cat.name };
      })()
    : quiz.final;

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
          hasFinal={usesQuizFinal(game, quiz)}
          onRanking={() => setRanking(over ? 'celebrate' : 'normal')}
          onFinal={() => {
            if (!game.final) setGame((g) => ({ ...g, final: NEW_FINAL }));
            setShowFinal(true);
          }}
        />
        <div className="header-actions">
          {/* Always available on the board; T starts it only while no question is open (that one has its own). */}
          <Timer seconds={settings.timer} hotkey={!open && !showFinal} />
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
            const sp = game.specials?.[key];
            const shownSpecial = played && sp?.by ? SPECIAL_INFO[sp.kind] : undefined;
            const isFinalCell = game.final?.cell === key || (turn.lastCell && !played);
            return (
              <button
                key={key}
                className={`cell ${played ? 'played' : ''} ${isFinalCell ? 'final-cell' : ''}`}
                style={{ animationDelay: `${0.15 + quiz.categories.length * 0.35 + (q * quiz.categories.length + c) * 0.025}s` }}
                onClick={(e) => openCell(c, q, e)}
              >
                <span className="points">{question.points}</span>
                {shownSpecial && (
                  <span className="double-mark" title={shownSpecial.name}>
                    {shownSpecial.icon}
                  </span>
                )}
                {isFinalCell && <span className="double-mark" title="Domanda finale">🏆</span>}
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
          <div key={t.id} className={`team-score ${turn.team?.id === t.id || turn.shared || turn.lastCell ? 'active' : ''}`} style={{ ['--team' as string]: t.color }}>
            <div className="team-name">{t.name}</div>
            <ScoreEdit score={teamScore(t, game, quiz)} onChange={(delta) => adjust(t.id, delta)} />
            <div className="team-adjust">
              <button onClick={() => adjust(t.id, -SCORE_STEP)} title={`-${SCORE_STEP}`}>−</button>
              <button onClick={() => adjust(t.id, SCORE_STEP)} title={`+${SCORE_STEP}`}>+</button>
            </div>
          </div>
        ))}
      </footer>

      {open && showIntro && special && finder && (
        <SpecialIntro
          special={special}
          team={finder}
          category={quiz.categories[open.c].name}
          points={quiz.categories[open.c].questions[open.q].points}
          origin={open.origin}
          onContinue={() => setOpen({ ...open, intro: false })}
          // The Imprevisto card is the whole cell: closing it plays the cell.
          onClose={special.kind === 'gift' ? close : () => setOpen(null)}
        />
      )}
      {open && !showIntro && special?.kind !== 'gift' && (
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
          special={
            special && finder
              ? { kind: special.kind, by: finder, target: teamById(special.target), setTarget: (id) => setTarget(openKey, id) }
              : undefined
          }
          origin={special ? undefined : open.origin}
        />
      )}
      {showFinal && finalQuestion && (
        <FinalModal
          final={finalQuestion}
          state={game.final ?? NEW_FINAL}
          teams={game.teams}
          scores={Object.fromEntries(game.teams.map((t) => [t.id, boardScore(t, game, quiz)]))}
          timer={settings.timer}
          resolveUrl={(src) => mediaUrl(slug, src)}
          onChange={(final) =>
            setGame((g) => ({
              ...g,
              final,
              // A board cell used as final counts as played once the final is over.
              played: final.cell && final.stage === 'done' ? { ...g.played, [final.cell]: true } : g.played,
            }))
          }
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
  if (turn.lastCell) return <span className="turn-badge final">🏆 Ultima casella: domanda finale con le puntate!</span>;
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
