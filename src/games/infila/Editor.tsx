import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { ask } from '../../hub/ask';
import { MAX_CARDS, MAX_SEQUENCES, MIN_CARDS, orderProblem, validateInFila, type Carta, type InFilaSet, type Sequenza } from './schema';

const blankCarta = (): Carta => ({ text: '', value: '' });
const blankSequenza = (): Sequenza => ({ question: '', first: '', last: '', source: '', cards: Array.from({ length: 5 }, blankCarta) });
export const blank = (): InFilaSet => ({ title: '', sequenze: Array.from({ length: 4 }, blankSequenza) });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Whatever came in, with every field present. */
export function normalize(d: unknown): InFilaSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<InFilaSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    sequenze: (Array.isArray(o.sequenze) && o.sequenze.length ? o.sequenze.slice(0, MAX_SEQUENCES) : blank().sequenze).map((s) => ({
      question: str(s?.question),
      first: str(s?.first),
      last: str(s?.last),
      source: str(s?.source),
      cards: (Array.isArray(s?.cards) && s.cards.length ? s.cards.slice(0, MAX_CARDS) : blankSequenza().cards).map((c) => ({
        text: str(c?.text),
        value: str(c?.value),
      })),
    })),
  };
}

export function clean(d: InFilaSet): InFilaSet {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    sequenze: n.sequenze.map((s) => ({
      question: s.question.trim(),
      first: s.first.trim(),
      last: s.last.trim(),
      ...(s.source?.trim() ? { source: s.source.trim() } : {}),
      cards: s.cards.filter((c) => c.text.trim() || c.value.trim()).map((c) => ({ text: c.text.trim(), value: c.value.trim() })),
    })),
  };
}

export default function Editor() {
  const { draft, update, reset, full } = useDraft<InFilaSet>('infila', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: InFilaSet) => InFilaSet) => update((x) => fn(normalize(x)));
  const setSeq = (si: number, fn: (s: Sequenza) => Sequenza) => set((x) => ({ ...x, sequenze: x.sequenze.map((s, i) => (i === si ? fn(s) : s)) }));
  const setCarta = (si: number, ci: number, patch: Partial<Carta>) =>
    setSeq(si, (s) => ({ ...s, cards: s.cards.map((c, i) => (i === ci ? { ...c, ...patch } : c)) }));
  const moveCarta = (si: number, ci: number, step: number) =>
    setSeq(si, (s) => {
      const cards = [...s.cards];
      [cards[ci], cards[ci + step]] = [cards[ci + step], cards[ci]];
      return { ...s, cards };
    });
  const removeSeq = async (si: number) => {
    const s = d.sequenze[si];
    if ((s.question || s.cards.some((c) => c.text)) && !(await ask(`Togliere la sequenza ${si + 1}?`, 'Togli'))) return;
    set((x) => ({ ...x, sequenze: x.sequenze.filter((_, i) => i !== si) }));
  };
  const removeCarta = (si: number, ci: number) => setSeq(si, (s) => ({ ...s, cards: s.cards.filter((_, i) => i !== ci) }));

  const fields = d.sequenze.flatMap((s) => [s.question, s.first, s.last, ...s.cards.flatMap((c) => [c.text, c.value])]);

  return (
    <CreatorPage
      game="infila"
      title="Crea In fila!"
      tip={
        <>
          Ogni sequenza ha <b>da {MIN_CARDS} a {MAX_CARDS} carte</b>, scritte <b>già nell'ordine giusto</b>: la prima è quella che va
          all'inizio della fila (es. "Il più vecchio"), l'ultima quella in fondo ("Il più recente"). Il valore di ogni carta (es. "1989", "8.848 m")
          si vede solo alla fine; se sono numeri l'app controlla che l'ordine torni. Si salva tutto mentre scrivi.
        </>
      }
      validation={validateInFila(clean(d))}
      progress={{ done: fields.filter((t) => t.trim()).length, total: fields.length, label: 'campi scritti' }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder="Es. In fila! nella storia" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Descrizione (facoltativa)</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">↔️ Sequenze ({d.sequenze.length})</h3>
      {d.sequenze.map((s, si) => {
        const problem = s.cards.every((c) => c.value.trim()) ? orderProblem(s.cards) : null;
        return (
          <section key={si} className="cr-cat">
            <div className="cr-head">
              <h2>Sequenza {si + 1}</h2>
              {d.sequenze.length > 1 && <button className="btn ghost" onClick={() => removeSeq(si)} title="Togli la sequenza">🗑</button>}
            </div>
            <label className="cr-field">
              <span className="cr-label">Domanda</span>
              <input className="cr-cat-name" value={s.question} onChange={(e) => setSeq(si, (x) => ({ ...x, question: e.target.value }))} placeholder="Es. Quando sono successe queste cose?" />
            </label>
            <div className="cr-row">
              <label className="cr-field">
                <span className="cr-label">Inizio della fila</span>
                <input value={s.first} onChange={(e) => setSeq(si, (x) => ({ ...x, first: e.target.value }))} placeholder="Es. Il più vecchio" />
              </label>
              <label className="cr-field">
                <span className="cr-label">Fine della fila</span>
                <input value={s.last} onChange={(e) => setSeq(si, (x) => ({ ...x, last: e.target.value }))} placeholder="Es. Il più recente" />
              </label>
            </div>
            <label className="cr-field">
              <span className="cr-label">Fonte (facoltativa)</span>
              <input value={s.source ?? ''} onChange={(e) => setSeq(si, (x) => ({ ...x, source: e.target.value }))} placeholder="Es. Wikipedia" />
            </label>
            <p className="if-ed-end">◀ {s.first.trim() || 'Inizio della fila'}</p>
            {s.cards.map((c, ci) => (
              <div key={ci} className="if-ed-card">
                <span>{ci + 1}</span>
                <div className="if-ed-line">
                  <input value={c.text} onChange={(e) => setCarta(si, ci, { text: e.target.value })} placeholder={ci === 0 && si === 0 ? 'Es. Cade il Muro di Berlino' : `Carta ${ci + 1}`} />
                  <input className="if-ed-value" value={c.value} onChange={(e) => setCarta(si, ci, { value: e.target.value })} placeholder={ci === 0 && si === 0 ? 'Es. 1989' : 'Valore'} />
                  <div className="if-ed-tools">
                    <button className="btn ghost" disabled={ci === 0} onClick={() => moveCarta(si, ci, -1)} title="Sposta su">↑</button>
                    <button className="btn ghost" disabled={ci === s.cards.length - 1} onClick={() => moveCarta(si, ci, 1)} title="Sposta giù">↓</button>
                    {s.cards.length > MIN_CARDS && <button className="btn ghost" onClick={() => removeCarta(si, ci)} title="Togli">🗑</button>}
                  </div>
                </div>
              </div>
            ))}
            <p className="if-ed-end">{s.last.trim() || 'Fine della fila'} ▶</p>
            {problem && <p className="cr-error">⚠ {problem}</p>}
            {s.cards.length < MAX_CARDS && (
              <button className="cr-add" onClick={() => setSeq(si, (x) => ({ ...x, cards: [...x.cards, blankCarta()] }))}>＋ Aggiungi una carta</button>
            )}
          </section>
        );
      })}
      {d.sequenze.length < MAX_SEQUENCES && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, sequenze: [...x.sequenze, blankSequenza()] }))}>＋ Aggiungi una sequenza</button>
      )}
    </CreatorPage>
  );
}
