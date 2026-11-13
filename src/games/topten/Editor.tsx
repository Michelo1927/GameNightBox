import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { ask } from '../../hub/ask';
import { MAX_ANSWERS, MAX_LISTS, MIN_ANSWERS, validateTopTen, type Lista, type TopTenSet, type Voce } from './schema';
import { langField, newLangField, tr } from '../../hub/i18n';

const blankVoce = (): Voce => ({ text: '', also: [], note: '' });
const blankLista = (): Lista => ({ question: '', source: '', answers: Array.from({ length: MAX_ANSWERS }, blankVoce) });
export const blank = (): TopTenSet => ({ title: '', ...newLangField(), liste: [blankLista(), blankLista(), blankLista()] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Whatever came in, with every field present (the alternative names stay as typed, split on commas). */
export function normalize(d: unknown): TopTenSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<TopTenSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ...langField(o),
    liste: (Array.isArray(o.liste) && o.liste.length ? o.liste.slice(0, MAX_LISTS) : blank().liste).map((l) => ({
      question: str(l?.question),
      source: str(l?.source),
      answers: (Array.isArray(l?.answers) && l.answers.length ? l.answers.slice(0, MAX_ANSWERS) : blankLista().answers).map((a) => ({
        text: str(a?.text),
        also: Array.isArray(a?.also) ? a.also.map(str) : [],
        note: str(a?.note),
      })),
    })),
  };
}

export function clean(d: TopTenSet): TopTenSet {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    ...langField(n),
    liste: n.liste.map((l) => ({
      question: l.question.trim(),
      ...(l.source?.trim() ? { source: l.source.trim() } : {}),
      answers: l.answers
        .filter((a) => a.text.trim() || a.note?.trim() || a.also?.some((x) => x.trim()))
        .map((a) => {
          const also = (a.also ?? []).map((x) => x.trim()).filter(Boolean);
          return { text: a.text.trim(), ...(also.length ? { also } : {}), ...(a.note?.trim() ? { note: a.note.trim() } : {}) };
        }),
    })),
  };
}

export default function Editor() {
  const { draft, update, reset, full } = useDraft<TopTenSet>('topten', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: TopTenSet) => TopTenSet) => update((x) => fn(normalize(x)));
  const setLista = (li: number, fn: (l: Lista) => Lista) => set((x) => ({ ...x, liste: x.liste.map((l, i) => (i === li ? fn(l) : l)) }));
  const setVoce = (li: number, ai: number, patch: Partial<Voce>) =>
    setLista(li, (l) => ({ ...l, answers: l.answers.map((a, i) => (i === ai ? { ...a, ...patch } : a)) }));
  const moveVoce = (li: number, ai: number, step: number) =>
    setLista(li, (l) => {
      const answers = [...l.answers];
      [answers[ai], answers[ai + step]] = [answers[ai + step], answers[ai]];
      return { ...l, answers };
    });

  const removeLista = async (li: number) => {
    const l = d.liste[li];
    if ((l.question || l.answers.some((a) => a.text)) && !(await ask(tr(`Togliere la lista ${li + 1}?`, `Remove list ${li + 1}?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, liste: x.liste.filter((_, i) => i !== li) }));
  };
  const removeVoce = (li: number, ai: number) => setLista(li, (l) => ({ ...l, answers: l.answers.filter((_, i) => i !== ai) }));

  const texts = d.liste.flatMap((l) => [l.question, ...l.answers.map((a) => a.text)]);

  return (
    <CreatorPage
      game="topten"
      title={tr('Crea una Top Ten', 'Create a Top Ten')}
      tip={
        tr(
          <>
            Ogni lista è una domanda con <b>da {MIN_ANSWERS} a {MAX_ANSWERS} risposte</b>, dalla 1ª in giù (es. "I 10 fiumi più lunghi
            d'Italia"). Meglio classifiche vere, con la fonte, così nessuno può contestare. In "anche" scrivi altri nomi che l'app deve
            accettare, separati da virgole. Si salva tutto mentre scrivi.
          </>,
          <>
            Each list is a question with <b>{MIN_ANSWERS} to {MAX_ANSWERS} answers</b>, from 1st place down (e.g. "The 10 longest rivers in
            Europe"). Real rankings with a source are best, so nobody can object. In "also" write other names the app should accept,
            separated by commas. Everything is saved as you type.
          </>,
        )
      }
      validation={validateTopTen(clean(d))}
      progress={{ done: texts.filter((t) => t.trim()).length, total: texts.length, label: tr('campi scritti', 'fields written') }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder={tr('Es. Top Ten del mondo', 'E.g. World Top Ten')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🔟 {tr('Liste', 'Lists')} ({d.liste.length})</h3>
      {d.liste.map((l, li) => (
        <section key={li} className="cr-cat">
          <div className="cr-head">
            <h2>{tr('Lista', 'List')} {li + 1}</h2>
            {d.liste.length > 1 && <button className="btn ghost" onClick={() => removeLista(li)} title={tr('Togli la lista', 'Remove the list')}>🗑</button>}
          </div>
          <label className="cr-field">
            <span className="cr-label">{tr('Domanda', 'Question')}</span>
            <input className="cr-cat-name" value={l.question} onChange={(e) => setLista(li, (x) => ({ ...x, question: e.target.value }))} placeholder={tr('Es. Le 10 città italiane più popolose', 'E.g. The 10 most populous cities in the UK')} />
          </label>
          <label className="cr-field">
            <span className="cr-label">{tr('Fonte (facoltativa)', 'Source (optional)')}</span>
            <input value={l.source ?? ''} onChange={(e) => setLista(li, (x) => ({ ...x, source: e.target.value }))} placeholder={tr('Es. ISTAT, 2024', 'E.g. ONS, 2024')} />
          </label>
          {l.answers.map((a, ai) => (
            <div key={ai} className="tt-ed-answer">
              <span>{ai + 1}</span>
              <div className="tt-ed-line">
                <input className="tt-ed-text" value={a.text} onChange={(e) => setVoce(li, ai, { text: e.target.value })} placeholder={tr(`Risposta ${ai + 1}`, `Answer ${ai + 1}`)} />
                <div className="tt-ed-tools">
                  <button className="btn ghost" disabled={ai === 0} onClick={() => moveVoce(li, ai, -1)} title={tr('Sposta su', 'Move up')}>↑</button>
                  <button className="btn ghost" disabled={ai === l.answers.length - 1} onClick={() => moveVoce(li, ai, 1)} title={tr('Sposta giù', 'Move down')}>↓</button>
                  {l.answers.length > MIN_ANSWERS && <button className="btn ghost" onClick={() => removeVoce(li, ai)} title={tr('Togli', 'Remove')}>🗑</button>}
                </div>
              </div>
              <div className="cr-row">
                <input value={(a.also ?? []).join(',')} onChange={(e) => setVoce(li, ai, { also: e.target.value.split(',') })} placeholder={tr('Anche (es. USA, America)', 'Also (e.g. USA, America)')} />
                <input value={a.note ?? ''} onChange={(e) => setVoce(li, ai, { note: e.target.value })} placeholder={tr('Dato (es. 652 km)', 'Figure (e.g. 652 km)')} />
              </div>
            </div>
          ))}
          {l.answers.length < MAX_ANSWERS && (
            <button className="cr-add" onClick={() => setLista(li, (x) => ({ ...x, answers: [...x.answers, blankVoce()] }))}>＋ {tr('Aggiungi una risposta', 'Add an answer')}</button>
          )}
        </section>
      ))}
      {d.liste.length < MAX_LISTS && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, liste: [...x.liste, blankLista()] }))}>＋ {tr('Aggiungi una lista', 'Add a list')}</button>
      )}
    </CreatorPage>
  );
}
