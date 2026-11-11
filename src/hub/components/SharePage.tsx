import { useEffect, useState } from 'react';
import type { Library, Validation } from '../content';
import { fingerprint, loadDraft, saveDraft } from '../draft';
import { go } from '../nav';
import { encode, MESSAGE_LIMIT } from '../share';
import { copyText } from '../text';
import { BackPill } from './BackButton';

interface Props<T> {
  game: string;
  prefix: string;
  lib: Library<T>;
  validate: (d: unknown) => Validation;
  clean: (d: T) => T;
}

/** #/<game>/crea/codice: saves the draft on this device and shows its code and link to share. */
export default function SharePage<T extends { title: string }>({ game, prefix, lib, validate, clean }: Props<T>) {
  const [draft] = useState(() => {
    const d = loadDraft<T>(game);
    return d && { ...d, data: clean(d.data) };
  });
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [msg, setMsg] = useState('');
  const errors = draft ? validate(draft.data).errors : ['Niente da condividere'];

  useEffect(() => {
    if (!draft || errors.length) return;
    try {
      const s = lib.saveLocal(draft.data, draft.slug);
      setSlug(s);
      saveDraft(game, { ...draft, slug: s, shared: fingerprint(draft.data) });
    } catch {
      /* no room left: the code still works */
    }
    encode(prefix, draft.data).then(setCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = (
    <header className="cr-header">
      <BackPill label="Indietro" />
      <h1>{errors.length ? 'Quasi pronto' : 'Pronto! 🎉'}</h1>
    </header>
  );
  if (!draft || errors.length)
    return (
      <div className="creator">
        {back}
        <p className="cr-tip">Completa prima queste parti:</p>
        <ul className="cr-todo">
          {errors.slice(0, 12).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <a className="btn primary" href={`#/${game}/crea`}>Torna al creatore</a>
      </div>
    );

  const title = draft.data.title;
  const link = `${location.origin}${location.pathname}#/${game}/carica/${code}`;
  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };
  const copy = async (text: string, label: string) => flash((await copyText(text)) ? `${label} copiato ✓` : 'Copia non riuscita: tieni premuto sul testo e copialo a mano');
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `"${title}": apri il link per giocare`, url: link });
      } catch {
        /* share sheet closed */
      }
    } else copy(link, 'Link');
  };
  const fileName = `${title.replace(/[^\w\s-]/g, '').trim() || game}.txt`;
  const long = code.length > MESSAGE_LIMIT;
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const shareFile = async () => {
    const file = new File([code], fileName, { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
      } catch {
        /* share sheet closed */
      }
    } else download();
  };

  return (
    <div className="creator">
      {back}
      <p className="cr-tip">
        Manda il <b>link</b> o il <b>codice</b> a chi farà da host. Per giocare: apri il sito, scegli il gioco, tocca <b>📥 Carica</b> e
        incolla il codice, oppure apri direttamente il link.
      </p>
      {!code ? (
        <p className="muted">Preparazione del codice…</p>
      ) : (
        <>
          <textarea className="cr-code" readOnly rows={5} value={code} onFocus={(e) => e.target.select()} />
          <p className="cr-hint">
            {code.length.toLocaleString('it-IT')} caratteri
            {long && <span className="cr-error"> · Troppo lungo per un messaggio: condividilo come file.</span>}
          </p>
          <div className="cr-share">
            {long ? (
              <button className="btn primary big" onClick={shareFile}>📤 Condividi file</button>
            ) : (
              <button className="btn primary big" onClick={share}>📤 Condividi link</button>
            )}
            <button className="btn ghost" onClick={() => copy(code, 'Codice')}>📋 Copia codice</button>
            {!long && <button className="btn ghost" onClick={() => copy(link, 'Link')}>🔗 Copia link</button>}
            <button className="btn ghost" onClick={download}>💾 Scarica file</button>
            {slug && <button className="btn ghost" onClick={() => go(`/${game}/${slug}/setup`)}>▶ Gioca su questo dispositivo</button>}
          </div>
          {msg && <div className="cr-toast">{msg}</div>}
        </>
      )}
      <p className="cr-hint">Salvato anche su questo dispositivo: puoi tornare indietro, modificare e rigenerare il codice.</p>
    </div>
  );
}
