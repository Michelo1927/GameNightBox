import { useEffect, useState, type CSSProperties } from 'react';
import { sounds } from '../../../hub/sounds';
import Timer from '../../../hub/components/Timer';
import type { Gift, Result, Team } from '../state';
import { SPECIAL_INFO } from './SpecialIntro';
import { findCorrectChoice, type Question } from '../quiz/schema';
import MediaView, { MaybeSplit } from '../../../hub/components/Media';

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
  /** Furto / Passa la mano: only the team that found the cell plays (or the one it passed it to). */
  special?: {
    kind: 'steal' | 'pass';
    by: Team;
    target?: Team;
    /** A team id, '' for the bank (Furto), or nothing to undo the choice. */
    setTarget: (teamId?: string) => void;
    /** Each team's score before this cell: a team can't be robbed of more points than it has. */
    scores: Record<string, number>;
  };
  /** Imprevisto: the card drawn before this question, shown as a reminder. */
  gift?: Gift;
  /** Screen point the question grows from (the clicked cell). */
  origin?: { x: number; y: number };
}

const LETTERS = 'ABCDEFGH';

function textSize(text: string) {
  if (text.length < 60) return 'xl';
  if (text.length < 140) return 'lg';
  return 'md';
}

export default function QuestionModal({ category, question, teams, results, onResult, onClose, resolveUrl, answering, timer = 0, special, gift, origin }: Props) {
  const [revealed, setRevealed] = useState(false);
  const reveal = () =>
    setRevealed((r) => {
      if (!r) sounds.reveal();
      return !r;
    });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if ((e.target as HTMLElement).closest('input, textarea, select')) return;
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
  const passedTo = special?.kind === 'pass' ? special.target : undefined;
  const turnTeam = passedTo ?? special?.by ?? (answering && answering !== 'all' ? answering : undefined);
  // The team whose turn it is goes first; the others stay available for the host.
  // On a special cell only the team that found it plays (or the team it was passed to).
  const ordered = special ? [turnTeam!] : turnTeam ? [...teams.filter((t) => t.id === turnTeam.id), ...teams.filter((t) => t.id !== turnTeam.id)] : teams;
  const points = question.points;
  const others = special ? teams.filter((t) => t.id !== special.by.id) : [];
  // Furto: after a right answer the team picks who to rob. Passa la mano: before answering, it can pass.
  const pickVictim = special?.kind === 'steal' && results[special.by.id] === 'right' && others.length > 0;
  const canRob = (t: Team) => (special?.scores[t.id] ?? 0) >= points;
  const robbable = others.filter(canRob);
  const canPass = special?.kind === 'pass' && !passedTo && !results[special.by.id] && others.length > 0;
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
          {answering === 'all' && !special && <span className="q-turn shared">🔥 Per tutte le squadre</span>}
          <span className="q-points">
            {special ? `${SPECIAL_INFO[special.kind].icon} ${points}` : gift ? `${SPECIAL_INFO.gift.icon} ${points}` : points}
          </span>
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
            {gift && (
              <span className="special-pick" title={gift.text}>
                🎁 Imprevisto già applicato: {gift.icon} {gift.title}
              </span>
            )}
            {passedTo && special && (
              <span className="special-pick">
                🎯 Passata da <b>{special.by.name}</b>
                <button className="pick" onClick={() => special.setTarget()}>
                  ↩ Annulla
                </button>
              </span>
            )}
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
            {canPass && (
              <span className="special-pick">
                🎯 Passa a:
                <select
                  className="steal-select"
                  value=""
                  style={{ ['--team' as string]: 'var(--line)' }}
                  onChange={(e) => e.target.value && special!.setTarget(e.target.value)}
                >
                  <option value="">🙋 Nessuno, rispondete voi</option>
                  {others.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </span>
            )}
            {pickVictim && robbable.length > 0 && (
              <span className="special-pick">
                🥷 Rubate a:
                <select
                  className="steal-select"
                  value={special!.target?.id ?? ''}
                  style={{ ['--team' as string]: special!.target?.color ?? 'var(--line)' }}
                  onChange={(e) => special!.setTarget(e.target.value)}
                >
                  <option value="">🏦 Nessuno, dal banco</option>
                  {others.map((t) => (
                    <option key={t.id} value={t.id} disabled={!canRob(t)}>
                      {t.name} ({special!.scores[t.id] ?? 0} punti){canRob(t) ? '' : ': troppo pochi'}
                    </option>
                  ))}
                </select>
              </span>
            )}
            {pickVictim && robbable.length === 0 && (
              <span className="special-pick">🥷 Nessuna squadra ha {points} punti da rubare: li prendete dal banco.</span>
            )}
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
