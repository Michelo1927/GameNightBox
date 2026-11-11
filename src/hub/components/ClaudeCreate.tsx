import { useState, type ReactNode } from 'react';
import type { Validation } from '../content';
import { copyText } from '../text';
import { BackPill } from './BackButton';

export interface Field {
  key: string;
  label: string;
  placeholder?: string;
  /** text (default), a number picker, or a checkbox. */
  type?: 'text' | 'number' | 'check';
  options?: number[];
}

type Form = Record<string, string | number | boolean>;

interface Props<T> {
  back: string;
  title: string;
  intro: ReactNode;
  fields: Field[];
  initial: Form;
  prompt: (form: Form) => string;
  validate: (data: unknown) => Validation;
  /** What was read, before playing. `update` lets the preview fix things (e.g. a YouTube link). */
  preview: (data: T, update: (data: T) => void) => ReactNode;
  onPlay: (data: T) => void;
  /** Opens the result in the game's creator, to change it before playing. */
  onEdit?: (data: T) => void;
}

/** Claude may wrap the JSON in ``` fences or add a sentence: keep only the outermost {...}. */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** #/<game>/claude: builds a prompt for claude.ai; the JSON it answers with is pasted back here and played. */
export default function ClaudeCreate<T>({ back, title, intro, fields, initial, prompt, validate, preview, onPlay, onEdit }: Props<T>) {
  const [form, setForm] = useState<Form>(initial);
  const [copied, setCopied] = useState('');
  const [answer, setAnswer] = useState('');
  const [data, setData] = useState<T | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const text = prompt(form);
  const set = (patch: Form) => {
    setForm((f) => ({ ...f, ...patch }));
    setCopied('');
  };
  const copy = async (what: string, value: string) => setCopied((await copyText(value)) ? what : '');

  const read = (value: string) => {
    setAnswer(value);
    setData(null);
    setErrors([]);
    if (!value.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(value));
    } catch {
      setErrors(['Non riesco a leggere la risposta: copia tutto il blocco JSON che ha scritto Claude.']);
      return;
    }
    const v = validate(parsed);
    setErrors(v.errors);
    setData(parsed as T);
  };
  const update = (d: T) => {
    setData(d);
    setErrors(validate(d).errors);
  };
  const fix = `Nel JSON che mi hai dato ci sono questi errori:\n${errors.map((e) => `- ${e}`).join('\n')}\n\nCorreggili e rispondi di nuovo SOLO con il JSON completo.`;

  return (
    <div className="creator claude-page">
      <header className="cr-header">
        <BackPill href={back} label="Esci" />
        <h1>🤖 {title}</h1>
      </header>
      <p className="cr-tip">{intro}</p>

      <section className="cr-cat">
        <div className="cr-label">1 · Cosa vuoi</div>
        {fields.map((f) =>
          f.type === 'check' ? (
            <label className="cr-check" key={f.key}>
              <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set({ [f.key]: e.target.checked })} />
              {f.label}
            </label>
          ) : f.type === 'number' ? (
            <div className="cr-field" key={f.key}>
              <span className="cr-label">{f.label}</span>
              <div className="seg">
                {f.options!.map((n) => (
                  <button key={n} className={form[f.key] === n ? 'on' : ''} onClick={() => set({ [f.key]: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <label className="cr-field" key={f.key}>
              <span className="cr-label">{f.label}</span>
              <input value={String(form[f.key] ?? '')} onChange={(e) => set({ [f.key]: e.target.value })} placeholder={f.placeholder} />
            </label>
          ),
        )}
      </section>

      <section className="cr-cat">
        <div className="cr-label">2 · Chiedi a Claude</div>
        <button className="btn primary big" onClick={() => copy('prompt', text)}>
          {copied === 'prompt' ? '✓ Prompt copiato' : '📋 Copia il prompt'}
        </button>
        <a className="btn ghost" href="https://claude.ai/new" target="_blank" rel="noreferrer">
          Apri claude.ai ↗
        </a>
        <details className="cr-more">
          <summary>Vedi il prompt</summary>
          <pre className="prompt-text">{text}</pre>
        </details>
      </section>

      <section className="cr-cat">
        <div className="cr-label">3 · Incolla la risposta</div>
        <textarea rows={6} value={answer} onChange={(e) => read(e.target.value)} placeholder="Incolla qui tutto quello che ha risposto Claude…" />
        {errors.length > 0 && (
          <>
            <ul className="cr-error">
              {errors.slice(0, 8).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {errors.length > 8 && <li>…e altri {errors.length - 8}</li>}
            </ul>
            {data && (
              <button className="btn ghost" onClick={() => copy('fix', fix)}>
                {copied === 'fix' ? '✓ Copiato: incollalo nella chat con Claude' : '🔧 Copia la richiesta di correzione per Claude'}
              </button>
            )}
          </>
        )}
        {data && preview(data, update)}
        {data && (
          <button className="btn primary big" disabled={errors.length > 0} onClick={() => onPlay(data)}>
            ▶ Salva e gioca
          </button>
        )}
        {data && onEdit && (
          <button className="btn ghost" onClick={() => onEdit(data)}>
            ✏️ {errors.length ? 'Correggilo a mano nel creatore' : 'Modificalo nel creatore'}
          </button>
        )}
      </section>
    </div>
  );
}
