import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { ask } from '../../hub/ask';
import { letters } from '../../hub/text';
import { MAX_QUESTIONS, MIN_QUESTIONS, validateSbagliato, type Domanda, type SbagliatoSet } from './schema';

const blankDomanda = (): Domanda => ({ question: '', answer: '', other: '' });
export const blank = (): SbagliatoSet => ({ title: '', domande: Array.from({ length: MIN_QUESTIONS }, blankDomanda) });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function normalize(d: unknown): SbagliatoSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<SbagliatoSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    domande: (Array.isArray(o.domande) && o.domande.length ? o.domande.slice(0, MAX_QUESTIONS) : blank().domande).map((q) => ({
      question: str(q?.question),
      answer: str(q?.answer),
      other: str(q?.other),
    })),
  };
}

export function clean(d: SbagliatoSet): SbagliatoSet {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    domande: n.domande
      .map((q) => ({ question: q.question.trim(), answer: q.answer.trim(), other: q.other.trim() }))
      .filter((q) => q.question || q.answer || q.other),
  };
}

export default function Editor() {
  const { draft, update, reset, full } = useDraft<SbagliatoSet>('sbagliato', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: SbagliatoSet) => SbagliatoSet) => update((x) => fn(normalize(x)));
  const setQ = (i: number, patch: Partial<Domanda>) => set((x) => ({ ...x, domande: x.domande.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const remove = async (i: number) => {
    const q = d.domande[i];
    if ((q.question || q.answer || q.other) && !(await ask(`Togliere la domanda ${i + 1}?`, 'Togli'))) return;
    set((x) => ({ ...x, domande: x.domande.filter((_, j) => j !== i) }));
  };
  const ready = d.domande.filter((q) => q.question.trim() && q.answer.trim() && q.other.trim()).length;

  return (
    <CreatorPage
      game="sbagliato"
      title="Crea Sbagliato!"
      tip={
        <>
          Ogni domanda ha <b>due risposte</b>: quella <b>vera</b> (che le squadre non devono dire) e quella <b>sbagliata</b> (che devono
          dire). Meglio domande facilissime e brevi, es. "È più alto un albero o un fiore?". Servono almeno {MIN_QUESTIONS} domande; ogni squadra ne
          usa 22 tutte sue, quindi meglio 80 o più. Si salva tutto mentre scrivi.
        </>
      }
      validation={validateSbagliato(clean(d))}
      progress={{ done: ready, total: Math.max(d.domande.length, MIN_QUESTIONS), label: 'domande pronte' }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder="Es. Sbagliato! in famiglia" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Descrizione (facoltativa)</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">❌ Domande ({d.domande.length})</h3>
      {d.domande.map((q, i) => {
        const same = q.answer.trim() && letters(q.answer) === letters(q.other);
        return (
          <div key={i} className="sb-ed">
            <span>{i + 1}</span>
            <div className="sb-ed-line">
              <input value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder={i === 0 ? 'Es. Il ghiaccio è caldo o freddo?' : `Domanda ${i + 1}`} />
              <button className="btn ghost" onClick={() => setQ(i, { answer: q.other, other: q.answer })} title="Scambia vera e sbagliata">⇄</button>
              <button className="btn ghost" onClick={() => remove(i)} title="Togli">🗑</button>
            </div>
            <div className="cr-row">
              <input className="sb-true" value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder={i === 0 ? '✓ Vera (es. Freddo)' : '✓ Vera'} />
              <input className="sb-false" value={q.other} onChange={(e) => setQ(i, { other: e.target.value })} placeholder={i === 0 ? '✗ Da dire (es. Caldo)' : '✗ Da dire'} />
            </div>
            {same && <p className="cr-error">✗ le due risposte sono uguali</p>}
          </div>
        );
      })}
      {d.domande.length < MAX_QUESTIONS && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, domande: [...x.domande, blankDomanda()] }))}>＋ Aggiungi una domanda</button>
      )}
    </CreatorPage>
  );
}
