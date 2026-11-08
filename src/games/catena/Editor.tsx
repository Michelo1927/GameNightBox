import { Fragment } from 'react';
import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { letters } from '../../hub/text';
import { CHAIN_LENGTH, CLUES, validateCatena, type Catena, type CatenaSet, type Finale } from './schema';
import { ask } from '../../hub/ask';

const MAX_CATENE = 12;
const WORD = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,16}$/;

const blankCatena = (): Catena => ({ words: Array(CHAIN_LENGTH).fill(''), links: Array(CHAIN_LENGTH - 1).fill('') });
const blankFinale = (): Finale => ({ answer: '', clues: Array(CLUES).fill('') });
export const blank = (): CatenaSet => ({ title: '', catene: [blankCatena(), blankCatena(), blankCatena()], finali: [] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const fixed = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => str(Array.isArray(v) ? v[i] : ''));

/** Whatever came in, with 8 words and 7 links per chain and 5 clues per final word. */
export function normalize(d: unknown): CatenaSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<CatenaSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    catene: (Array.isArray(o.catene) && o.catene.length ? o.catene.slice(0, MAX_CATENE) : blank().catene).map((c) => ({
      words: fixed(c?.words, CHAIN_LENGTH),
      links: fixed(c?.links, CHAIN_LENGTH - 1),
    })),
    finali: (Array.isArray(o.finali) ? o.finali : []).map((f) => ({ answer: str(f?.answer), clues: fixed(f?.clues, CLUES) })),
  };
}

export function clean(d: CatenaSet): CatenaSet {
  const n = normalize(d);
  const finali = n.finali!.map((f) => ({ answer: f.answer.trim(), clues: f.clues.map((c) => c.trim()) })).filter((f) => f.answer || f.clues.some(Boolean));
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    catene: n.catene.map((c) => {
      const links = c.links!.map((l) => l.trim());
      return { words: c.words.map((w) => w.trim()), ...(links.some(Boolean) ? { links } : {}) };
    }),
    ...(finali.length ? { finali } : {}),
  };
}

const wordProblem = (w: string, all: string[]) => {
  if (!w.trim()) return '';
  if (!WORD.test(w.trim())) return 'una sola parola, solo lettere';
  if (all.filter((x) => letters(x) === letters(w)).length > 1) return 'ripetuta';
  return '';
};

export default function Editor() {
  const { draft, update, reset, full } = useDraft<CatenaSet>('catena', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: CatenaSet) => CatenaSet) => update((x) => fn(normalize(x)));
  const setCatena = (ci: number, fn: (c: Catena) => Catena) => set((x) => ({ ...x, catene: x.catene.map((c, i) => (i === ci ? fn(c) : c)) }));
  const setFinale = (fi: number, fn: (f: Finale) => Finale) => set((x) => ({ ...x, finali: x.finali!.map((f, i) => (i === fi ? fn(f) : f)) }));
  const replace = <V,>(list: V[], i: number, v: V) => list.map((x, j) => (j === i ? v : x));

  const removeCatena = async (ci: number) => {
    if (d.catene[ci].words.some(Boolean) && !(await ask(`Togliere la catena ${ci + 1}?`, 'Togli'))) return;
    set((x) => ({ ...x, catene: x.catene.filter((_, i) => i !== ci) }));
  };
  const removeFinale = async (fi: number) => {
    if ((d.finali![fi].answer || d.finali![fi].clues.some(Boolean)) && !(await ask(`Togliere la parola finale ${fi + 1}?`, 'Togli'))) return;
    set((x) => ({ ...x, finali: x.finali!.filter((_, i) => i !== fi) }));
  };

  const words = d.catene.flatMap((c) => c.words);
  const clues = d.finali!.flatMap((f) => [f.answer, ...f.clues]);
  const filled = [...words, ...clues];

  return (
    <CreatorPage
      game="catena"
      title="Crea le catene"
      tip={
        <>
          Ogni catena ha <b>{CHAIN_LENGTH} parole</b>, ognuna legata alla successiva (pane → burro → arachidi…): in gioco si vedono la
          prima e l'ultima. Il legame tra due parole è facoltativo e si vede a catena finita. Si salva tutto mentre scrivi.
        </>
      }
      validation={validateCatena(clean(d))}
      progress={{ done: filled.filter((w) => w.trim()).length, total: filled.length, label: 'parole scritte' }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder="Es. Catene della domenica" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Descrizione (facoltativa)</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🔗 Catene</h3>
      {d.catene.map((c, ci) => (
        <section key={ci} className="cr-cat">
          <div className="cr-head">
            <h2>Catena {ci + 1}</h2>
            {d.catene.length > 1 && <button className="btn ghost" onClick={() => removeCatena(ci)}>🗑</button>}
          </div>
          <div className="ct-edit">
            {c.words.map((w, wi) => {
              const err = wordProblem(w, c.words);
              const shown = wi === 0 || wi === CHAIN_LENGTH - 1;
              return (
                <Fragment key={wi}>
                  <label className={`ct-ed-word ${shown ? 'shown' : ''}`}>
                    <span>{wi + 1}</span>
                    <input
                      value={w}
                      onChange={(e) => setCatena(ci, (x) => ({ ...x, words: replace(x.words, wi, e.target.value) }))}
                      placeholder={shown ? (wi === 0 ? 'Prima parola (si vede)' : 'Ultima parola (si vede)') : 'Parola nascosta'}
                      autoCapitalize="off"
                    />
                  </label>
                  {err && <p className="cr-error">✗ {err}</p>}
                  {wi < CHAIN_LENGTH - 1 && (
                    <input
                      className="ct-link-input"
                      value={c.links![wi]}
                      onChange={(e) => setCatena(ci, (x) => ({ ...x, links: replace(x.links!, wi, e.target.value) }))}
                      placeholder="↓ legame (facoltativo)"
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>
      ))}
      {d.catene.length < MAX_CATENE && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, catene: [...x.catene, blankCatena()] }))}>＋ Aggiungi una catena</button>
      )}

      <h3 className="cr-section">🔔 Finale (facoltativo)</h3>
      <p className="cr-hint">
        Una parola misteriosa e {CLUES} indizi legati a lei, mostrati uno alla volta. Le squadre si prenotano: meno indizi servono, più punti.
      </p>
      {d.finali!.map((f, fi) => {
        const a = letters(f.answer);
        return (
          <section key={fi} className="cr-cat">
            <div className="cr-head">
              <h2>Parola finale {fi + 1}</h2>
              <button className="btn ghost" onClick={() => removeFinale(fi)}>🗑</button>
            </div>
            <label className="cr-field">
              <span className="cr-label">Parola da indovinare</span>
              <input className="cr-cat-name" value={f.answer} onChange={(e) => setFinale(fi, (x) => ({ ...x, answer: e.target.value }))} autoCapitalize="off" />
            </label>
            {f.answer.trim() && !WORD.test(f.answer.trim()) && <p className="cr-error">✗ una sola parola, solo lettere</p>}
            {f.clues.map((cl, i) => (
              <Fragment key={i}>
                <input
                  value={cl}
                  onChange={(e) => setFinale(fi, (x) => ({ ...x, clues: replace(x.clues, i, e.target.value) }))}
                  placeholder={`Indizio ${i + 1}${i === 0 ? ' (il più difficile)' : i === CLUES - 1 ? ' (il più facile)' : ''}`}
                />
                {a.length > 1 && cl.trim() && letters(cl).includes(a) && <p className="cr-error">✗ contiene la risposta</p>}
              </Fragment>
            ))}
          </section>
        );
      })}
      <button className="cr-add" onClick={() => set((x) => ({ ...x, finali: [...x.finali!, blankFinale()] }))}>＋ Aggiungi una parola finale</button>
    </CreatorPage>
  );
}
