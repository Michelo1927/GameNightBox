import { findCorrectChoice, type Question } from '../quiz/schema';
import MediaField from './MediaField';

interface Props {
  slug: string;
  category: string;
  question: Question;
  onChange: (fn: (q: Question) => Question) => void;
  onPreview: () => void;
  /** Final question: no points (each team bets). */
  isFinal?: boolean;
}

export default function QuestionForm({ slug, category, question: q, onChange, onPreview, isFinal }: Props) {
  const set = (patch: Partial<Question>) => onChange((prev) => ({ ...prev, ...patch }));
  const correct = q.choices ? findCorrectChoice(q.choices, q.answer) : -1;

  const setChoice = (i: number, text: string) => {
    const choices = [...(q.choices ?? [])];
    choices[i] = text;
    // Keep the answer in sync when editing the correct choice.
    set(i === correct ? { choices, answer: text } : { choices });
  };
  const removeChoice = (i: number) => {
    const choices = (q.choices ?? []).filter((_, j) => j !== i);
    set({ choices, ...(i === correct ? { answer: '' } : {}) });
  };

  return (
    <div className="question-form">
      <div className="form-head">
        <h2>
          {category || 'Categoria'} <span className="gold">· {isFinal ? '🏆 finale' : q.points}</span>
        </h2>
        <button className="btn ghost" onClick={onPreview}>👁 Anteprima</button>
      </div>

      <div className="row">
        {!isFinal && (
          <label>
            Punti
            <input type="number" step={100} min={0} value={q.points} onChange={(e) => set({ points: Number(e.target.value) })} />
          </label>
        )}
      </div>

      <label className="block">
        Domanda
        <textarea rows={3} value={q.question} onChange={(e) => set({ question: e.target.value })} placeholder="Testo della domanda (può restare vuoto se c'è un media)" />
      </label>

      <MediaField label="Media della domanda" slug={slug} media={q.media} onChange={(media) => set({ media })} />

      <label className="check">
        <input
          type="checkbox"
          checked={!!q.choices}
          onChange={(e) => set({ choices: e.target.checked ? (q.answer ? [q.answer, '', '', ''] : ['', '', '', '']) : undefined })}
        />
        Scelta multipla
      </label>
      {q.choices && (
        <div className="choices-edit">
          {q.choices.map((c, i) => (
            <div key={i} className="row">
              <input type="radio" name="correct" checked={i === correct && c !== ''} onChange={() => set({ answer: c })} title="Risposta giusta" />
              <b className="gold">{'ABCDEFGH'[i]}</b>
              <input className="wide" value={c} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Opzione ${i + 1}`} />
              <button className="btn ghost small" onClick={() => removeChoice(i)} disabled={q.choices!.length <= 2} title="Rimuovi">✕</button>
            </div>
          ))}
          {q.choices.length < 6 && (
            <button className="btn ghost small" onClick={() => set({ choices: [...q.choices!, ''] })}>+ Opzione</button>
          )}
          <p className="muted small">Seleziona il pallino accanto alla risposta giusta.</p>
        </div>
      )}

      <label className="block">
        Risposta
        <input value={q.answer} onChange={(e) => set({ answer: e.target.value })} placeholder="Risposta corretta" />
      </label>

      <MediaField label="Media della risposta" slug={slug} media={q.answerMedia} onChange={(answerMedia) => set({ answerMedia })} />

      <label className="block">
        Regole (le vedono tutti, insieme alla domanda)
        <input value={q.rules ?? ''} onChange={(e) => set({ rules: e.target.value })} placeholder="Es. servono titolo e artista, massimo 10 secondi…" />
      </label>

      <label className="block">
        Nota per l'host (compare solo dopo aver mostrato la risposta)
        <input value={q.hostNote ?? ''} onChange={(e) => set({ hostNote: e.target.value })} placeholder="Es. accettare ±10%, basta il cognome…" />
      </label>
    </div>
  );
}
