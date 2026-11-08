import { useEffect, useState } from 'react';
import { sounds } from '../../../hub/sounds';
import type { FinalState, Result, Team } from '../state';
import { findCorrectChoice, type FinalQuestion } from '../quiz/schema';
import MediaView, { MaybeSplit } from '../../../hub/components/Media';
import Timer from '../../../hub/components/Timer';

interface Props {
  final: FinalQuestion;
  state: FinalState;
  teams: Team[];
  /** Each team's score before the final: the most it can bet. */
  scores: Record<string, number>;
  timer: number;
  resolveUrl: (src: string) => string;
  onChange: (s: FinalState) => void;
  onClose: () => void;
}

/**
 * Final question, Jeopardy style:
 * 1. only the category is shown; each team writes its bet on paper, the host types them in;
 * 2. question (with timer), answer, then right/wrong per team for the amount it bet.
 */
export default function FinalModal({ final, state, teams, scores, timer, resolveUrl, onChange, onClose }: Props) {
  const [revealed, setRevealed] = useState(false);
  const split = final.media?.type === 'image' && !!final.choices;
  const maxBet = (t: Team) => Math.max(0, scores[t.id] ?? 0);
  // A team with no points can only bet 0, so the host doesn't have to type it.
  const betOf = (t: Team) => state.bets[t.id] ?? (maxBet(t) === 0 ? 0 : undefined);
  const betsOk = teams.every((t) => {
    const b = betOf(t);
    return b !== undefined && b >= 0 && b <= maxBet(t);
  });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === 'Escape') onClose();
      else if (e.code === 'Space' && state.stage === 'question') {
        e.preventDefault();
        setRevealed((r) => {
          if (!r) sounds.reveal();
          return !r;
        });
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose, state.stage]);

  const answerBox = (
    <div className="answer">
      <div className="answer-label">Risposta</div>
      <div className={`answer-text ${split ? 'md' : 'lg'}`}>{final.answer}</div>
      {final.answerMedia && <MediaView media={final.answerMedia} url={resolveUrl(final.answerMedia.src)} />}
      {final.hostNote && <p className="host-note">📝 {final.hostNote}</p>}
    </div>
  );

  const setBet = (id: string, text: string) => {
    const bets = { ...state.bets };
    if (text === '') delete bets[id];
    else bets[id] = Number(text);
    onChange({ ...state, bets });
  };
  const setResult = (id: string, r: Result) => {
    const results = { ...state.results };
    if (results[id] === r) delete results[id];
    else {
      results[id] = r;
      (r === 'right' ? sounds.right : sounds.wrong)();
    }
    onChange({ ...state, results });
  };

  return (
    <div className="overlay question-overlay final">
      <div className="question">
        <header className="q-header">
          <span>🏆 Domanda finale</span>
          <span className="q-points">{final.category}</span>
        </header>

        {state.stage === 'bets' ? (
          <div className="q-body">
            <p className="q-text lg">
              Categoria: <span className="gold">{final.category}</span>
            </p>
            <p className="final-help">
              Ogni squadra scrive su un foglio quanti punti scommette, da 0 al proprio punteggio. Poi l'host inserisce le puntate.
            </p>
            <div className="final-bets">
              {teams.map((t) => (
                <label key={t.id} className="final-bet" style={{ ['--team' as string]: t.color }}>
                  <span className="q-team-name">{t.name}</span>
                  <span className="muted">max {maxBet(t)}</span>
                  <input
                    inputMode="numeric"
                    value={state.bets[t.id] ?? ''}
                    placeholder="0"
                    onChange={(e) => setBet(t.id, e.target.value.replace(/[^\d]/g, ''))}
                  />
                  {(state.bets[t.id] ?? 0) > maxBet(t) && <span className="cr-error">troppo alta</span>}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="q-body">
            {final.question && <p className="q-text lg">{final.question}</p>}
            {final.rules && split && <p className="rules">📢 {final.rules}</p>}
            {final.media && !split && <MediaView media={final.media} url={resolveUrl(final.media.src)} />}
            {final.rules && !split && <p className="rules">📢 {final.rules}</p>}
            {final.choices && (
              <MaybeSplit split={split} media={final.media && <MediaView media={final.media} url={resolveUrl(final.media.src)} />}>
                <ol className="choices">
                  {final.choices.map((c, i) => (
                    <li key={i} className={revealed ? (i === findCorrectChoice(final.choices!, final.answer) ? 'correct' : 'dim') : ''}>
                      <b>{'ABCDEFGH'[i]}</b> {c}
                    </li>
                  ))}
                </ol>
                {split && revealed && answerBox}
              </MaybeSplit>
            )}
            {!split && revealed && answerBox}
          </div>
        )}

        <footer className="q-footer">
          {state.stage === 'question' && (
            <div className="q-teams">
              {teams.map((t) => (
                <div key={t.id} className="q-team" style={{ ['--team' as string]: t.color }}>
                  <span className="q-team-name">
                    {t.name} <span className="muted">({state.bets[t.id] ?? 0})</span>
                  </span>
                  <button className={`ok ${state.results[t.id] === 'right' ? 'on' : ''}`} onClick={() => setResult(t.id, 'right')}>✓</button>
                  <button className={`ko ${state.results[t.id] === 'wrong' ? 'on' : ''}`} onClick={() => setResult(t.id, 'wrong')}>✗</button>
                </div>
              ))}
            </div>
          )}
          <div className="q-actions">
            {state.stage === 'bets' ? (
              <button
                className="btn primary"
                disabled={!betsOk}
                onClick={() => onChange({ ...state, bets: Object.fromEntries(teams.map((t) => [t.id, betOf(t) ?? 0])), stage: 'question' })}
              >
                Mostra la domanda
              </button>
            ) : (
              <>
                <Timer seconds={timer} />
                <button className="btn primary" onClick={() => setRevealed((r) => !r)}>
                  {revealed ? 'Nascondi risposta' : 'Mostra risposta'} <kbd>Spazio</kbd>
                </button>
                <button className="btn primary" onClick={() => onChange({ ...state, stage: 'done' })}>
                  🏁 Fine partita
                </button>
              </>
            )}
            <button className="btn ghost" onClick={onClose}>
              Tabellone <kbd>Esc</kbd>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
