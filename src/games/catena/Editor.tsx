import { Fragment } from 'react';
import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { letters } from '../../hub/text';
import { CHAIN_LENGTH, CLUES, validateCatena, type Catena, type CatenaSet, type Finale } from './schema';
import { ask } from '../../hub/ask';
import { langField, newLangField, tr } from '../../hub/i18n';

const MAX_CATENE = 12;
const WORD = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,16}$/;

const blankCatena = (): Catena => ({ words: Array(CHAIN_LENGTH).fill(''), links: Array(CHAIN_LENGTH - 1).fill('') });
const blankFinale = (): Finale => ({ answer: '', clues: Array(CLUES).fill('') });
export const blank = (): CatenaSet => ({ title: '', ...newLangField(), catene: [blankCatena(), blankCatena(), blankCatena()], finali: [] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const fixed = (v: unknown, n: number) => Array.from({ length: n }, (_, i) => str(Array.isArray(v) ? v[i] : ''));

/** Whatever came in, with 8 words and 7 links per chain and 5 clues per final word. */
export function normalize(d: unknown): CatenaSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<CatenaSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ...langField(o),
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
    ...langField(n),
    catene: n.catene.map((c) => {
      const links = c.links!.map((l) => l.trim());
      return { words: c.words.map((w) => w.trim()), ...(links.some(Boolean) ? { links } : {}) };
    }),
    ...(finali.length ? { finali } : {}),
  };
}

const wordProblem = (w: string, all: string[]) => {
  if (!w.trim()) return '';
  if (!WORD.test(w.trim())) return tr('una sola parola, solo lettere', 'a single word, letters only');
  if (all.filter((x) => letters(x) === letters(w)).length > 1) return tr('ripetuta', 'repeated');
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
    if (d.catene[ci].words.some(Boolean) && !(await ask(tr(`Togliere la catena ${ci + 1}?`, `Remove chain ${ci + 1}?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, catene: x.catene.filter((_, i) => i !== ci) }));
  };
  const removeFinale = async (fi: number) => {
    if ((d.finali![fi].answer || d.finali![fi].clues.some(Boolean)) && !(await ask(tr(`Togliere la parola finale ${fi + 1}?`, `Remove final word ${fi + 1}?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, finali: x.finali!.filter((_, i) => i !== fi) }));
  };

  const words = d.catene.flatMap((c) => c.words);
  const clues = d.finali!.flatMap((f) => [f.answer, ...f.clues]);
  const filled = [...words, ...clues];

  return (
    <CreatorPage
      game="catena"
      title={tr('Crea le catene', 'Create the chains')}
      tip={
        tr(
          <>
            Ogni catena ha <b>{CHAIN_LENGTH} parole</b>, ognuna legata alla successiva (pane → burro → arachidi…): in gioco si vedono la
            prima e l'ultima. Il legame tra due parole è facoltativo e si vede a catena finita. Si salva tutto mentre scrivi.
          </>,
          <>
            Each chain has <b>{CHAIN_LENGTH} words</b>, each linked to the next (bread → butter → peanut…): in the game the first and the
            last are shown. The link between two words is optional and shows when the chain is done. Everything is saved as you type.
          </>,
        )
      }
      validation={validateCatena(clean(d))}
      progress={{ done: filled.filter((w) => w.trim()).length, total: filled.length, label: tr('parole scritte', 'words written') }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder={tr('Es. Catene della domenica', 'E.g. Sunday chains')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🔗 Catene</h3>
      {d.catene.map((c, ci) => (
        <section key={ci} className="cr-cat">
          <div className="cr-head">
            <h2>{tr('Catena', 'Chain')} {ci + 1}</h2>
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
                      placeholder={
                      shown
                        ? wi === 0
                          ? tr('Prima parola (si vede)', 'First word (shown)')
                          : tr('Ultima parola (si vede)', 'Last word (shown)')
                        : tr('Parola nascosta', 'Hidden word')
                    }
                      autoCapitalize="off"
                    />
                  </label>
                  {err && <p className="cr-error">✗ {err}</p>}
                  {wi < CHAIN_LENGTH - 1 && (
                    <input
                      className="ct-link-input"
                      value={c.links![wi]}
                      onChange={(e) => setCatena(ci, (x) => ({ ...x, links: replace(x.links!, wi, e.target.value) }))}
                      placeholder={tr('↓ legame (facoltativo)', '↓ link (optional)')}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>
      ))}
      {d.catene.length < MAX_CATENE && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, catene: [...x.catene, blankCatena()] }))}>＋ {tr('Aggiungi una catena', 'Add a chain')}</button>
      )}

      <h3 className="cr-section">🔔 {tr('Finale (facoltativo)', 'Final (optional)')}</h3>
      <p className="cr-hint">
        {tr(
          `Una parola misteriosa e ${CLUES} indizi legati a lei, mostrati uno alla volta. Le squadre si prenotano: meno indizi servono, più punti.`,
          `A mystery word and ${CLUES} clues linked to it, shown one at a time. Teams buzz in: the fewer clues needed, the more points.`,
        )}
      </p>
      {d.finali!.map((f, fi) => {
        const a = letters(f.answer);
        return (
          <section key={fi} className="cr-cat">
            <div className="cr-head">
              <h2>{tr('Parola finale', 'Final word')} {fi + 1}</h2>
              <button className="btn ghost" onClick={() => removeFinale(fi)}>🗑</button>
            </div>
            <label className="cr-field">
              <span className="cr-label">{tr('Parola da indovinare', 'Word to guess')}</span>
              <input className="cr-cat-name" value={f.answer} onChange={(e) => setFinale(fi, (x) => ({ ...x, answer: e.target.value }))} autoCapitalize="off" />
            </label>
            {f.answer.trim() && !WORD.test(f.answer.trim()) && <p className="cr-error">✗ {tr('una sola parola, solo lettere', 'a single word, letters only')}</p>}
            {f.clues.map((cl, i) => (
              <Fragment key={i}>
                <input
                  value={cl}
                  onChange={(e) => setFinale(fi, (x) => ({ ...x, clues: replace(x.clues, i, e.target.value) }))}
                  placeholder={`${tr('Indizio', 'Clue')} ${i + 1}${i === 0 ? tr(' (il più difficile)', ' (the hardest)') : i === CLUES - 1 ? tr(' (il più facile)', ' (the easiest)') : ''}`}
                />
                {a.length > 1 && cl.trim() && letters(cl).includes(a) && <p className="cr-error">✗ {tr('contiene la risposta', 'contains the answer')}</p>}
              </Fragment>
            ))}
          </section>
        );
      })}
      <button className="cr-add" onClick={() => set((x) => ({ ...x, finali: [...x.finali!, blankFinale()] }))}>＋ {tr('Aggiungi una parola finale', 'Add a final word')}</button>
    </CreatorPage>
  );
}
