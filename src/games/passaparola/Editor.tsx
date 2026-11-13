import { useState } from 'react';
import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { fits, lettersOf, misfit, siteLetters, validatePassaparola, type Item, type Passaparola, type Ruota } from './schema';
import { ask } from '../../hub/ask';
import { langField, newLangField, tr } from '../../hub/i18n';

const MAX_RUOTE = 10;

const blankRuota = (letters: string[]): Ruota => ({ items: letters.map((letter) => ({ letter, type: 'inizia', question: '', answer: '' })) });
export const blank = (): Passaparola => ({ title: '', ...newLangField(), ruote: [blankRuota(siteLetters()), blankRuota(siteLetters())] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Whatever came in (Claude, an old code) in the shape the creator needs: 21 letters per wheel (26 in English), in order. */
export function normalize(d: unknown): Passaparola {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<Passaparola>;
  const LETTERS = lettersOf(o);
  const ruote = Array.isArray(o.ruote) && o.ruote.length ? o.ruote.slice(0, MAX_RUOTE) : [blankRuota(LETTERS), blankRuota(LETTERS)];
  return {
    title: str(o.title),
    ...langField(o),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ruote: ruote.map((r) => {
      const items = Array.isArray(r?.items) ? r.items : [];
      return {
        items: LETTERS.map((letter) => {
          const it = (items.find((i) => i?.letter === letter) ?? {}) as Partial<Item>;
          return {
            letter,
            type: it.type === 'contiene' ? 'contiene' : 'inizia',
            question: str(it.question),
            answer: str(it.answer),
            ...(Array.isArray(it.accept) && it.accept.length ? { accept: it.accept.map(str) } : {}),
          };
        }),
      };
    }),
  };
}

export function clean(d: Passaparola): Passaparola {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    ...langField(n),
    ruote: n.ruote.map((r) => ({
      items: r.items.map((it) => {
        const accept = (it.accept ?? []).map((a) => a.trim()).filter(Boolean);
        return { letter: it.letter, type: it.type, question: it.question.trim(), answer: it.answer.trim(), ...(accept.length ? { accept } : {}) };
      }),
    })),
  };
}

const problem = (it: Item) => {
  const bad = [it.answer, ...(it.accept ?? [])].map((a) => a.trim()).filter(Boolean).find((a) => !fits(a, it.letter, it.type));
  return bad ? misfit('', bad, it.letter, it.type) : '';
};
const complete = (it: Item) => !!it.question.trim() && !!it.answer.trim() && !problem(it);

export default function Editor() {
  const { draft, update, reset, full } = useDraft<Passaparola>('passaparola', blank);
  const d = normalize(draft.data);
  const LETTERS = lettersOf(d);
  const [ri, setRi] = useState(0);
  const [li, setLi] = useState(0);
  const r = Math.min(ri, d.ruote.length - 1);
  const item = d.ruote[r].items[li];

  const set = (patch: Partial<Passaparola>) => update((x) => ({ ...normalize(x), ...patch }));
  const setItem = (patch: Partial<Item>) =>
    update((x) => {
      const n = normalize(x);
      return { ...n, ruote: n.ruote.map((w, i) => (i !== r ? w : { items: w.items.map((it, j) => (j === li ? { ...it, ...patch } : it)) })) };
    });
  const addRuota = () => {
    set({ ruote: [...d.ruote, blankRuota(LETTERS)] });
    setRi(d.ruote.length);
    setLi(0);
  };
  const removeRuota = async () => {
    const filled = d.ruote[r].items.some((it) => it.question || it.answer);
    if (filled && !(await ask(tr(`Togliere la ruota ${r + 1} con tutto quello che hai scritto?`, `Remove wheel ${r + 1} with everything you wrote?`), tr('Togli', 'Remove')))) return;
    set({ ruote: d.ruote.filter((_, i) => i !== r) });
    setRi(Math.max(0, r - 1));
  };
  const move = (step: number) => setLi((i) => (i + step + LETTERS.length) % LETTERS.length);

  const all = d.ruote.flatMap((w) => w.items);
  const err = problem(item);

  return (
    <CreatorPage
      game="passaparola"
      title={tr('Crea un Passaparola', 'Create an Alphabet Wheel')}
      tip={
        tr(
          <>
            Una <b>ruota per squadra</b>, con una definizione per ognuna delle {LETTERS.length} lettere. La risposta <b>inizia</b> con la
            lettera, oppure la <b>contiene</b> (comodo per H, Q, Z). Si salva tutto mentre scrivi.
          </>,
          <>
            One <b>wheel per team</b>, with a clue for each of the {LETTERS.length} letters. The answer <b>starts</b> with the letter, or{' '}
            <b>contains</b> it (handy for Q, X, Z). Everything is saved as you type.
          </>,
        )
      }
      validation={validatePassaparola(clean(d))}
      progress={{ done: all.filter(complete).length, total: all.length, label: tr('lettere pronte', 'letters ready') }}
      full={full}
      onReset={() => {
        reset();
        setRi(0);
        setLi(0);
      }}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr('Es. Passaparola di Natale', 'E.g. Christmas Alphabet Wheel')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder={tr('Es. Cultura generale, livello facile', 'E.g. General knowledge, easy level')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set({ author: e.target.value })} />
      </label>

      <div className="cr-seg">
        {d.ruote.map((w, i) => (
          <button key={i} className={i === r ? 'on' : ''} onClick={() => setRi(i)}>
            🎡 {tr('Ruota', 'Wheel')} {i + 1} <small>{w.items.filter(complete).length}/{LETTERS.length}</small>
          </button>
        ))}
        {d.ruote.length < MAX_RUOTE && <button onClick={addRuota}>＋ {tr('Ruota', 'Wheel')}</button>}
      </div>
      <p className="cr-hint">
        {tr('Servono tante ruote quante squadre (ognuna gioca la sua).', 'You need as many wheels as teams (each plays its own).')}{' '}
        {d.ruote.length > 1 && (
          <button className="link" onClick={removeRuota}>
            {tr(`Togli la ruota ${r + 1}`, `Remove wheel ${r + 1}`)}
          </button>
        )}
      </p>

      <div className="pp-letters">
        {d.ruote[r].items.map((it, j) => (
          <button key={it.letter} className={`${j === li ? 'on' : ''} ${complete(it) ? 'done' : problem(it) ? 'bad' : ''}`} onClick={() => setLi(j)}>
            {it.letter}
          </button>
        ))}
      </div>

      <section className="cr-cat">
        <div className="pp-edit-head">
          <span className="pp-big">{item.letter}</span>
          <div className="cr-seg">
            <button className={item.type === 'inizia' ? 'on' : ''} onClick={() => setItem({ type: 'inizia' })}>{tr(`Inizia con ${item.letter}`, `Starts with ${item.letter}`)}</button>
            <button className={item.type === 'contiene' ? 'on' : ''} onClick={() => setItem({ type: 'contiene' })}>{tr(`Contiene la ${item.letter}`, `Contains ${item.letter}`)}</button>
          </div>
        </div>
        <label className="cr-field">
          <span className="cr-label">{tr('Definizione', 'Clue')}</span>
          <textarea rows={3} value={item.question} onChange={(e) => setItem({ question: e.target.value })} placeholder={tr('Es. Lo si spalma sul pane a colazione', 'E.g. You spread it on toast at breakfast')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Risposta', 'Answer')}</span>
          <input
            value={item.answer}
            onChange={(e) => setItem({ answer: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && move(1)}
            placeholder={item.type === 'inizia' ? tr(`Inizia con ${item.letter}`, `Starts with ${item.letter}`) : tr(`Contiene la ${item.letter}`, `Contains ${item.letter}`)}
          />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Altre risposte giuste (facoltative, separate da virgola)', 'Other right answers (optional, separated by commas)')}</span>
          <input
            value={(item.accept ?? []).join(', ')}
            onChange={(e) => setItem({ accept: e.target.value ? e.target.value.split(',').map((a) => a.trimStart()) : [] })}
            placeholder={tr('Sinonimi o altri modi di scriverla', 'Synonyms or other spellings')}
          />
        </label>
        {err && <p className="cr-error">✗ {err}</p>}
        <div className="cr-nav" style={{ display: 'flex' }}>
          <button className="btn ghost" onClick={() => move(-1)}>‹ {LETTERS[(li + LETTERS.length - 1) % LETTERS.length]}</button>
          <button className="btn primary" onClick={() => move(1)}>{LETTERS[(li + 1) % LETTERS.length]} ›</button>
        </div>
      </section>
    </CreatorPage>
  );
}
