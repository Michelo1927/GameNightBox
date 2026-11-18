import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { ask } from '../../hub/ask';
import { MAX_ANSWER_WORDS, MAX_QUESTIONS, MIN_QUESTIONS, validateRitardo, type Domanda, type RitardoSet } from './schema';
import { langField, newLangField, tr } from '../../hub/i18n';

const blankDomanda = (): Domanda => ({ question: '', answer: '' });
export const blank = (): RitardoSet => ({ title: '', ...newLangField(), domande: Array.from({ length: MIN_QUESTIONS }, blankDomanda) });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function normalize(d: unknown): RitardoSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<RitardoSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ...langField(o),
    domande: (Array.isArray(o.domande) && o.domande.length ? o.domande.slice(0, MAX_QUESTIONS) : blank().domande).map((q) => ({
      question: str(q?.question),
      answer: str(q?.answer),
    })),
  };
}

export function clean(d: RitardoSet): RitardoSet {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    ...langField(n),
    domande: n.domande.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })).filter((q) => q.question || q.answer),
  };
}

export default function Editor() {
  const { draft, update, reset, full } = useDraft<RitardoSet>('ritardo', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: RitardoSet) => RitardoSet) => update((x) => fn(normalize(x)));
  const setQ = (i: number, patch: Partial<Domanda>) => set((x) => ({ ...x, domande: x.domande.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const remove = async (i: number) => {
    const q = d.domande[i];
    if ((q.question || q.answer) && !(await ask(tr(`Togliere la domanda ${i + 1}?`, `Remove question ${i + 1}?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, domande: x.domande.filter((_, j) => j !== i) }));
  };
  const ready = d.domande.filter((q) => q.question.trim() && q.answer.trim()).length;

  return (
    <CreatorPage
      game="ritardo"
      title={tr('Crea In ritardo!', 'Create One Behind!')}
      tip={tr(
        <>
          Ogni domanda ha la sua <b>risposta</b>, che le squadre diranno una domanda dopo: quindi domande <b>facili</b> di cultura generale e
          risposte <b>cortissime</b> (un numero, un nome, una parola), es. "Quanti sono i colli di Roma?" → "7". Servono almeno {MIN_QUESTIONS}{' '}
          domande; ogni squadra ne usa una lista tutta sua, quindi meglio 60 o più. Si salva tutto mentre scrivi.
        </>,
        <>
          Each question has its <b>answer</b>, which the teams will say one question later: so <b>easy</b> general-knowledge questions and{' '}
          <b>very short</b> answers (a number, a name, a word), e.g. "How many hills is Rome built on?" → "7". At least {MIN_QUESTIONS} questions
          are needed; each team uses a list of its own, so 60 or more is better. Everything is saved as you type.
        </>,
      )}
      validation={validateRitardo(clean(d))}
      progress={{ done: ready, total: Math.max(d.domande.length, MIN_QUESTIONS), label: tr('domande pronte', 'questions ready') }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder={tr('Es. Cultura generale in ritardo', 'E.g. General knowledge, one behind')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">⏪ {tr('Domande', 'Questions')} ({d.domande.length})</h3>
      {d.domande.map((q, i) => {
        const long = q.answer.trim().split(/\s+/).filter(Boolean).length > MAX_ANSWER_WORDS;
        return (
          <div key={i} className="ri-ed">
            <span>{i + 1}</span>
            <div className="ri-ed-line">
              <input className="ri-ed-q" value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder={i === 0 ? tr('Es. Quanti sono i colli di Roma?', 'E.g. How many hills is Rome built on?') : tr(`Domanda ${i + 1}`, `Question ${i + 1}`)} />
              <input className="ri-ed-a" value={q.answer} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder={i === 0 ? tr('Es. 7', 'E.g. 7') : tr('Risposta', 'Answer')} />
              <button className="btn ghost" onClick={() => remove(i)} title={tr('Togli', 'Remove')}>🗑</button>
            </div>
            {long && <p className="cr-error ri-warn">⚠ {tr(`risposta lunga: meglio al massimo ${MAX_ANSWER_WORDS} parole`, `long answer: better at most ${MAX_ANSWER_WORDS} words`)}</p>}
          </div>
        );
      })}
      {d.domande.length < MAX_QUESTIONS && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, domande: [...x.domande, blankDomanda()] }))}>＋ {tr('Aggiungi una domanda', 'Add a question')}</button>
      )}
    </CreatorPage>
  );
}
