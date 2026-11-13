import { useState, type ReactNode } from 'react';
import type { Validation } from '../content';
import { copyText } from '../text';
import { BackPill } from './BackButton';
import TutorialButton from './Tutorial';
import { CLAUDE_TUTORIAL } from '../tutorials';
import { lang, tr } from '../i18n';

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

/** Where to paste the prompt: any AI chat works, these are the best known. */
export const AI_CHATS = [
  { name: 'ChatGPT', href: 'https://chatgpt.com/' },
  { name: 'Claude', href: 'https://claude.ai/new' },
  { name: 'Gemini', href: 'https://gemini.google.com/app' },
];

/** Links to open an AI chat in a new tab. */
export function AiLinks() {
  return (
    <div className="ai-links">
      <span className="muted">{tr('Apri:', 'Open:')}</span>
      {AI_CHATS.map((c) => (
        <a key={c.name} className="btn ghost" href={c.href} target="_blank" rel="noreferrer">
          {c.name} ↗
        </a>
      ))}
    </div>
  );
}

/** The AI may wrap the JSON in ``` fences or add a sentence: keep only the outermost {...}. */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** #/<game>/claude: builds a prompt for any AI chat (ChatGPT, Claude, Gemini…); the JSON it answers with is pasted back here and played. */
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
      setErrors([tr("Non riesco a leggere la risposta: copia tutto il blocco JSON che ha scritto l'IA.", "I can't read the answer: copy the whole JSON block the AI wrote.")]);
      return;
    }
    // Made from the English prompt: English content, even if the AI forgot the field.
    if (lang === 'en' && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !('lang' in parsed)) (parsed as Record<string, unknown>).lang = 'en';
    const v = validate(parsed);
    setErrors(v.errors);
    setData(parsed as T);
  };
  const update = (d: T) => {
    setData(d);
    setErrors(validate(d).errors);
  };
  const list = errors.map((e) => `- ${e}`).join('\n');
  const fix = tr(
    `Nel JSON che mi hai dato ci sono questi errori:\n${list}\n\nCorreggili e rispondi di nuovo SOLO con il JSON completo.`,
    `The JSON you gave me has these errors:\n${list}\n\nFix them and answer again with ONLY the complete JSON.`,
  );

  return (
    <div className="creator claude-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>🤖 {title}</h1>
        <TutorialButton tutorial={CLAUDE_TUTORIAL} />
      </header>
      <p className="cr-tip">{intro}</p>

      <section className="cr-cat">
        <div className="cr-label">1 · {tr('Cosa vuoi', 'What you want')}</div>
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
        <div className="cr-label">2 · {tr("Chiedi all'IA", 'Ask the AI')}</div>
        <button className="btn primary big" onClick={() => copy('prompt', text)}>
          {copied === 'prompt' ? tr('✓ Prompt copiato', '✓ Prompt copied') : tr('📋 Copia il prompt', '📋 Copy the prompt')}
        </button>
        <AiLinks />
        <details className="cr-more">
          <summary>{tr('Vedi il prompt', 'See the prompt')}</summary>
          <pre className="prompt-text">{text}</pre>
        </details>
      </section>

      <section className="cr-cat">
        <div className="cr-label">3 · {tr('Incolla la risposta', 'Paste the answer')}</div>
        <textarea rows={6} value={answer} onChange={(e) => read(e.target.value)} placeholder={tr("Incolla qui tutto quello che ha risposto l'IA…", 'Paste here everything the AI answered…')} />
        {errors.length > 0 && (
          <>
            <ul className="cr-error">
              {errors.slice(0, 8).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {errors.length > 8 && <li>{tr(`…e altri ${errors.length - 8}`, `…and ${errors.length - 8} more`)}</li>}
            </ul>
            {data && (
              <button className="btn ghost" onClick={() => copy('fix', fix)}>
                {copied === 'fix'
                  ? tr('✓ Copiato: incollalo nella stessa chat', '✓ Copied: paste it in the same chat')
                  : tr("🔧 Copia la richiesta di correzione per l'IA", '🔧 Copy the fix request for the AI')}
              </button>
            )}
          </>
        )}
        {data && preview(data, update)}
        {data && (
          <button className="btn primary big" disabled={errors.length > 0} onClick={() => onPlay(data)}>
            ▶ {tr('Salva e gioca', 'Save and play')}
          </button>
        )}
        {data && onEdit && (
          <button className="btn ghost" onClick={() => onEdit(data)}>
            ✏️ {errors.length ? tr('Correggilo a mano nel creatore', 'Fix it by hand in the creator') : tr('Modificalo nel creatore', 'Edit it in the creator')}
          </button>
        )}
      </section>
    </div>
  );
}
