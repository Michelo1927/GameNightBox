import { useEffect, useState, type CSSProperties } from 'react';
import { sounds } from '../game/sounds';
import Timer from './Timer';
import type { Result, Team } from '../game/state';
import { findCorrectChoice, type Question } from '../quiz/schema';
import MediaView, { MaybeSplit } from './Media';

interface Props {
  category: string;
  question: Question;
  teams: Team[];
  results: Record<string, Result>;
  onResult: (teamId: string, r: Result | null) => void;
  onClose: () => void;
  /** Turns a media src (file name or URL) into a playable URL. */
  resolveUrl: (src: string) => string;
  /** Who answers: the team whose turn it is, or 'all' for a shared question. */
  answering?: Team | 'all';
  /** Default seconds for the timer. */
  timer?: number;
  /** Raddoppio: only the betting team plays, for the amount it bet. */
  bet?: { team: Team; amount: number };
  /** Screen point the question grows from (the clicked cell). */
  origin?: { x: number; y: number };
}

const LETTERS = 'ABCDEFGH';

function textSize(text: string) {
  if (text.length < 60) return 'xl';
  if (text.length < 140) return 'lg';
  return 'md';
}

export default function QuestionModal({ category, question, teams, results, onResult, onClose, resolveUrl, answering, timer = 0, bet, origin }: Props) {
  const [revealed, setRevealed] = useState(false);
  const reveal = () =>
    setRevealed((r) => {
      if (!r) sounds.reveal();
      return !r;
    });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if ((e.target as HTMLElement).closest('input, textarea')) return;
        e.preventDefault();
        reveal();
      } else if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [onClose]);

  // A picture with multiple choice goes side by side: image on the left, options on the right.
  const split = question.media?.type === 'image' && !!question.choices;
  const correct = question.choices ? findCorrectChoice(question.choices, question.answer) : -1;
  const toggle = (teamId: string, r: Result) => onResult(teamId, results[teamId] === r ? null : r);
  const turnTeam = bet ? bet.team : answering && answering !== 'all' ? answering : undefined;
  // The team whose turn it is goes first; the others stay available for the host.
  // On a Raddoppio only the team that bet can play.
  const ordered = bet ? [bet.team] : turnTeam ? [...teams.filter((t) => t.id === turnTeam.id), ...teams.filter((t) => t.id !== turnTeam.id)] : teams;
  const points = bet ? bet.amount : question.points;
  const style = origin ? ({ transformOrigin: `${origin.x}px ${origin.y}px` } as CSSProperties) : undefined;

  const answerBox = (
    <div className="answer">
      <div className="answer-label">Risposta</div>
      <div className={`answer-text ${split ? 'md' : textSize(question.answer)}`}>{question.answer}</div>
      {question.answerMedia && <MediaView media={question.answerMedia} url={resolveUrl(question.answerMedia.src)} />}
      {/* Host notes can hint at the answer, so they appear only after the reveal. */}
      {question.hostNote && <p className="host-note">📝 {question.hostNote}</p>}
    </div>
  );

  return (
    <div className="overlay question-overlay" style={style}>
      <div className="question">
        <header className="q-header">
          <span>{category}</span>
          {turnTeam && (
            <span className="q-turn" style={{ ['--team' as string]: turnTeam.color }}>
              Risponde <b>{turnTeam.name}</b>
            </span>
          )}
          {answering === 'all' && !bet && <span className="q-turn shared">🔥 Per tutte le squadre</span>}
          <span className="q-points">{bet ? `🎲 ${points}` : points}</span>
        </header>

        <div className="q-body">
          {question.question && <p className={`q-text ${textSize(question.question)}`}>{question.question}</p>}
          {question.rules && split && <p className="rules">📢 {question.rules}</p>}
          {question.media && !split && <MediaView media={question.media} url={resolveUrl(question.media.src)} />}
          {question.rules && !split && <p className="rules">📢 {question.rules}</p>}
          {question.choices && (
            <MaybeSplit split={split} media={question.media && <MediaView media={question.media} url={resolveUrl(question.media.src)} />}>
              <ol className="choices">
                {question.choices.map((c, i) => (
                  <li key={i} className={revealed && i === correct ? 'correct' : revealed ? 'dim' : ''}>
                    <b>{LETTERS[i]}</b> {c}
                  </li>
                ))}
              </ol>
              {split && revealed && answerBox}
            </MaybeSplit>
          )}

          {!split && revealed && answerBox}
        </div>

        <footer className="q-footer">
          <div className="q-teams">
            {ordered.map((t) => (
              <div key={t.id} className={`q-team ${turnTeam && t.id !== turnTeam.id ? 'other' : ''}`} style={{ ['--team' as string]: t.color }}>
                <span className="q-team-name">{t.name}</span>
                <button className={`ok ${results[t.id] === 'right' ? 'on' : ''}`} onClick={() => toggle(t.id, 'right')} title={`+${points}`}>
                  ✓
                </button>
                <button className={`ko ${results[t.id] === 'wrong' ? 'on' : ''}`} onClick={() => toggle(t.id, 'wrong')} title={`-${points}`}>
                  ✗
                </button>
              </div>
            ))}
          </div>
          <div className="q-actions">
            <Timer seconds={timer} />
            <button className="btn primary" onClick={reveal}>
              {revealed ? 'Nascondi risposta' : 'Mostra risposta'} <kbd>Spazio</kbd>
            </button>
            <button className="btn ghost" onClick={onClose}>
              Tabellone <kbd>Esc</kbd>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
