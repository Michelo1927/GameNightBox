import { useEffect, useState } from 'react';
import type { Library, Validation } from '../content';
import { startDraft } from '../draft';
import { go, redirect } from '../nav';
import { decode } from '../share';
import { BackPill } from './BackButton';
import TutorialButton from './Tutorial';
import { IMPORT_TUTORIAL } from '../tutorials';
import { tr } from '../i18n';

interface Props<T> {
  game: string;
  /** "un Passaparola", "una catena"… */
  what: string;
  prefix: string;
  lib: Library<T>;
  validate: (d: unknown) => Validation;
  /** Shared link: load and go straight to the game. */
  code?: string;
  summary: (d: T) => string;
}

/** #/<game>/carica[/<code>]: paste a code or a link, or open a downloaded file. */
export default function ImportCode<T extends { title: string; author?: string }>({ game, what, prefix, lib, validate, code, summary }: Props<T>) {
  const [text, setText] = useState('');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const read = async (input: string): Promise<T | null> => {
    const d = await decode(input, prefix);
    const { errors } = validate(d);
    if (errors.length) throw new Error(`${tr('Ci sono errori', 'There are errors')}: ${errors.slice(0, 3).join('; ')}`);
    return d as T;
  };

  useEffect(() => {
    if (!code) return;
    setBusy(true);
    read(code)
      .then((d) => d && redirect(`#/${game}/${lib.saveLocal(d)}/setup`))
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const onText = async (input: string) => {
    setError('');
    setData(null);
    if (!input.trim()) return;
    setBusy(true);
    try {
      setData(await read(input));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openFile = async (file?: File) => {
    if (!file) return;
    const content = await file.text();
    setText(content.length > 2000 ? `${content.slice(0, 2000)}…` : content);
    onText(content);
  };

  if (code)
    return (
      <div className="import-page">
        <h1 className="title">{tr(`Carico ${what}…`, `Loading ${what}…`)}</h1>
        {busy && <p className="muted">{tr('Un attimo…', 'Just a moment…')}</p>}
        {error && (
          <>
            <p className="cr-error">{error}</p>
            <a className="btn ghost" href={`#/${game}/carica`}>{tr('Prova a incollare il codice', 'Try pasting the code')}</a>
          </>
        )}
      </div>
    );

  return (
    <div className="import-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>{tr(`Carica ${what}`, `Load ${what}`)}</h1>
        <TutorialButton tutorial={IMPORT_TUTORIAL} />
      </header>
      <p className="cr-tip">
        {tr(
          <>Incolla il codice (inizia con <b>{prefix}</b>) o il link che ti hanno mandato, oppure apri il file scaricato.</>,
          <>Paste the code (it starts with <b>{prefix}</b>) or the link you were sent, or open the downloaded file.</>,
        )}
      </p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onText(e.target.value);
        }}
        placeholder={tr('Incolla qui il codice…', 'Paste the code here…')}
      />
      <label className="cr-file">
        📂 {tr('Apri un file', 'Open a file')}
        <input type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={(e) => openFile(e.target.files?.[0])} />
      </label>
      {busy && <p className="muted">{tr('Lettura…', 'Reading…')}</p>}
      {error && <p className="cr-error">{error}</p>}
      {data && (
        <div className="cr-cat">
          <h2 style={{ margin: 0 }}>{data.title}</h2>
          {data.author && <p className="muted" style={{ margin: 0 }}>{tr('di', 'by')} {data.author}</p>}
          <p className="muted" style={{ margin: 0 }}>{summary(data)}</p>
          <button className="btn primary big" onClick={() => go(`/${game}/${lib.saveLocal(data)}/setup`)}>▶ {tr('Gioca', 'Play')}</button>
          <button className="btn ghost" onClick={async () => (await startDraft(game, data)) && go(`/${game}/crea`)}>✏️ {tr('Modifica', 'Edit')}</button>
        </div>
      )}
    </div>
  );
}
