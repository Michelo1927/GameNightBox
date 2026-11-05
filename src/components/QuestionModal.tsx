import { useEffect, useState } from 'react';
import type { Result, Team } from '../game/state';
import { findCorrectChoice, type Question } from '../quiz/schema';
import MediaView from './Media';

interface Props {
  category: string;
  question: Question;
  teams: Team[];
  results: Record<string, Result>;
  onResult: (teamId: string, r: Result | null) => void;
  onClose: () => void;
  /** Turns a media src (file name or URL) into a playable URL. */
  resolveUrl: (src: string) => string;
}

const LETTERS = 'ABCDEFGH';

function textSize(text: string) {
  if (text.length < 60) return 'xl';
  if (text.length < 140) return 'lg';
  return 'md';
}

export default function QuestionModal({ category, question, teams, results, onResult, onClose, resolveUrl }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', on, true);
    return () => removeEventListener('keydown', on, true);
  }, [onClose]);

  const correct = question.choices ? findCorrectChoice(question.choices, question.answer) : -1;
  const toggle = (teamId: string, r: Result) => onResult(teamId, results[teamId] === r ? null : r);

  return (
    <div className="overlay question-overlay">
      <div className="question">
        <header className="q-header">
          <span>{category}</span>
          <span className="q-points">{question.points}</span>
        </header>

        <div className="q-body">
          {question.question && <p className={`q-text ${textSize(question.question)}`}>{question.question}</p>}
          {question.media && <MediaView media={question.media} url={resolveUrl(question.media.src)} />}
          {question.choices && (
            <ol className="choices">
              {question.choices.map((c, i) => (
                <li key={i} className={revealed && i === correct ? 'correct' : revealed ? 'dim' : ''}>
                  <b>{LETTERS[i]}</b> {c}
                </li>
              ))}
            </ol>
          )}

          {revealed && (
            <div className="answer">
              <div className="answer-label">Risposta</div>
              <div className={`answer-text ${textSize(question.answer)}`}>{question.answer}</div>
              {question.answerMedia && <MediaView media={question.answerMedia} url={resolveUrl(question.answerMedia.src)} />}
            </div>
          )}
          {question.hostNote && <p className="host-note">📝 {question.hostNote}</p>}
        </div>

        <footer className="q-footer">
          <div className="q-teams">
            {teams.map((t) => (
              <div key={t.id} className="q-team" style={{ ['--team' as string]: t.color }}>
                <span className="q-team-name">{t.name}</span>
                <button className={`ok ${results[t.id] === 'right' ? 'on' : ''}`} onClick={() => toggle(t.id, 'right')} title={`+${question.points}`}>
                  ✓
                </button>
                <button className={`ko ${results[t.id] === 'wrong' ? 'on' : ''}`} onClick={() => toggle(t.id, 'wrong')} title={`-${question.points}`}>
                  ✗
                </button>
              </div>
            ))}
          </div>
          <div className="q-actions">
            <button className="btn primary" onClick={() => setRevealed((r) => !r)}>
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
