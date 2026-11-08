import { useState } from 'react';
import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { fits, LETTERS, validatePassaparola, type Item, type Passaparola, type Ruota } from './schema';
import { ask } from '../../hub/ask';

const MAX_RUOTE = 10;

const blankRuota = (): Ruota => ({ items: LETTERS.map((letter) => ({ letter, type: 'inizia', question: '', answer: '' })) });
export const blank = (): Passaparola => ({ title: '', ruote: [blankRuota(), blankRuota()] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Whatever came in (Claude, an old code) in the shape the creator needs: 21 letters per wheel, in order. */
export function normalize(d: unknown): Passaparola {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<Passaparola>;
  const ruote = Array.isArray(o.ruote) && o.ruote.length ? o.ruote.slice(0, MAX_RUOTE) : blank().ruote;
  return {
    title: str(o.title),
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
  return bad ? `"${bad}" non ${it.type === 'inizia' ? 'inizia con' : 'contiene'} la ${it.letter}` : '';
};
const complete = (it: Item) => !!it.question.trim() && !!it.answer.trim() && !problem(it);

export default function Editor() {
  const { draft, update, reset, full } = useDraft<Passaparola>('passaparola', blank);
  const d = normalize(draft.data);
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
    set({ ruote: [...d.ruote, blankRuota()] });
    setRi(d.ruote.length);
    setLi(0);
  };
  const removeRuota = async () => {
    const filled = d.ruote[r].items.some((it) => it.question || it.answer);
    if (filled && !(await ask(`Togliere la ruota ${r + 1} con tutto quello che hai scritto?`, 'Togli'))) return;
    set({ ruote: d.ruote.filter((_, i) => i !== r) });
    setRi(Math.max(0, r - 1));
  };
  const move = (step: number) => setLi((i) => (i + step + LETTERS.length) % LETTERS.length);

  const all = d.ruote.flatMap((w) => w.items);
  const err = problem(item);

  return (
    <CreatorPage
      game="passaparola"
      title="Crea un Passaparola"
      tip={
        <>
          Una <b>ruota per squadra</b>, con una definizione per ognuna delle {LETTERS.length} lettere. La risposta <b>inizia</b> con la
          lettera, oppure la <b>contiene</b> (comodo per H, Q, Z). Si salva tutto mentre scrivi.
        </>
      }
      validation={validatePassaparola(clean(d))}
      progress={{ done: all.filter(complete).length, total: all.length, label: 'lettere pronte' }}
      full={full}
      onReset={() => {
        reset();
        setRi(0);
        setLi(0);
      }}
    >
      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Es. Passaparola di Natale" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Descrizione (facoltativa)</span>
        <input value={d.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="Es. Cultura generale, livello facile" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={d.author ?? ''} onChange={(e) => set({ author: e.target.value })} />
      </label>

      <div className="cr-seg">
        {d.ruote.map((w, i) => (
          <button key={i} className={i === r ? 'on' : ''} onClick={() => setRi(i)}>
            🎡 Ruota {i + 1} <small>{w.items.filter(complete).length}/{LETTERS.length}</small>
          </button>
        ))}
        {d.ruote.length < MAX_RUOTE && <button onClick={addRuota}>＋ Ruota</button>}
      </div>
      <p className="cr-hint">
        Servono tante ruote quante squadre (ognuna gioca la sua). {d.ruote.length > 1 && <button className="link" onClick={removeRuota}>Togli la ruota {r + 1}</button>}
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
            <button className={item.type === 'inizia' ? 'on' : ''} onClick={() => setItem({ type: 'inizia' })}>Inizia con {item.letter}</button>
            <button className={item.type === 'contiene' ? 'on' : ''} onClick={() => setItem({ type: 'contiene' })}>Contiene la {item.letter}</button>
          </div>
        </div>
        <label className="cr-field">
          <span className="cr-label">Definizione</span>
          <textarea rows={3} value={item.question} onChange={(e) => setItem({ question: e.target.value })} placeholder="Es. Lo si spalma sul pane a colazione" />
        </label>
        <label className="cr-field">
          <span className="cr-label">Risposta</span>
          <input
            value={item.answer}
            onChange={(e) => setItem({ answer: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && move(1)}
            placeholder={item.type === 'inizia' ? `Inizia con ${item.letter}` : `Contiene la ${item.letter}`}
          />
        </label>
        <label className="cr-field">
          <span className="cr-label">Altre risposte giuste (facoltative, separate da virgola)</span>
          <input
            value={(item.accept ?? []).join(', ')}
            onChange={(e) => setItem({ accept: e.target.value ? e.target.value.split(',').map((a) => a.trimStart()) : [] })}
            placeholder="Sinonimi o altri modi di scriverla"
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
