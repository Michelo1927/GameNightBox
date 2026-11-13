import type { ClipboardEvent } from 'react';
import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { ask } from '../../hub/ask';
import { MAX_THEMES, MIN_THEMES, validateAsta, type AstaSet } from './schema';
import { langField, newLangField, tr } from '../../hub/i18n';

export const blank = (): AstaSet => ({ title: '', ...newLangField(), temi: Array.from({ length: MIN_THEMES }, () => '') });

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Whatever came in, with every field present. */
export function normalize(d: unknown): AstaSet {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<AstaSet>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ...langField(o),
    temi: (Array.isArray(o.temi) && o.temi.length ? o.temi.slice(0, MAX_THEMES) : blank().temi).map(str),
  };
}

export function clean(d: AstaSet): AstaSet {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    ...langField(n),
    temi: n.temi.map((t) => t.trim()).filter(Boolean),
  };
}

export default function Editor() {
  const { draft, update, reset, full } = useDraft<AstaSet>('asta', blank);
  const d = normalize(draft.data);
  const set = (fn: (d: AstaSet) => AstaSet) => update((x) => fn(normalize(x)));
  const setTheme = (i: number, text: string) => set((x) => ({ ...x, temi: x.temi.map((t, j) => (j === i ? text : t)) }));
  const remove = async (i: number) => {
    if (d.temi[i].trim() && !(await ask(tr(`Togliere il tema "${d.temi[i].trim()}"?`, `Remove the theme "${d.temi[i].trim()}"?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, temi: x.temi.filter((_, j) => j !== i) }));
  };
  // Pasting a list (one theme per line) fills this box and the ones after it.
  const paste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const lines = e.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    set((x) => {
      const temi = [...x.temi];
      lines.forEach((l, k) => {
        const at = i + k;
        if (at < temi.length && !(k > 0 && temi[at].trim())) temi[at] = l;
        else temi.splice(at, 0, l);
      });
      return { ...x, temi: temi.slice(0, MAX_THEMES) };
    });
  };
  const ready = d.temi.filter((t) => t.trim()).length;

  return (
    <CreatorPage
      game="asta"
      title={tr("Crea All'asta!", 'Create Going Once!')}
      tip={
        tr(
          <>
            Basta una lista di <b>temi</b>: le squadre si contendono all'asta quante risposte sanno dire su ognuno, e l'host le conta fidandosi.
            Funzionano bene i temi con tante risposte possibili (es. "Animali della savana", "Cose che trovi in un bagno"). Servono almeno {MIN_THEMES}{' '}
            temi, meglio 20 o più. Puoi incollare una lista intera, un tema per riga. Si salva tutto mentre scrivi.
          </>,
          <>
            A list of <b>themes</b> is all you need: the teams bid on how many answers they can say on each, and the host counts them on trust.
            Themes with many possible answers work well (e.g. "Animals of the savannah", "Things you find in a bathroom"). At least {MIN_THEMES}{' '}
            themes are needed, 20 or more is better. You can paste a whole list, one theme per line. Everything is saved as you type.
          </>,
        )
      }
      validation={validateAsta(clean(d))}
      progress={{ done: ready, total: Math.max(d.temi.length, MIN_THEMES), label: tr('temi pronti', 'themes ready') }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder={tr("Es. All'asta! in famiglia", 'E.g. Family Going Once!')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🔨 {tr('Temi', 'Themes')} ({d.temi.length})</h3>
      {d.temi.map((t, i) => (
        <div key={i} className="as-ed">
          <span>{i + 1}</span>
          <input
            value={t}
            onChange={(e) => setTheme(i, e.target.value)}
            onPaste={(e) => paste(i, e)}
            placeholder={i === 0 ? tr('Es. Animali della savana', 'E.g. Animals of the savannah') : tr(`Tema ${i + 1}`, `Theme ${i + 1}`)}
          />
          <button className="btn ghost" onClick={() => remove(i)} title={tr('Togli', 'Remove')}>🗑</button>
        </div>
      ))}
      {d.temi.length < MAX_THEMES && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, temi: [...x.temi, ''] }))}>＋ {tr('Aggiungi un tema', 'Add a theme')}</button>
      )}
    </CreatorPage>
  );
}
