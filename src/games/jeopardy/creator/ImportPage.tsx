import { useEffect, useState } from 'react';
import { go, redirect } from '../../../hub/nav';
import { saveImported } from '../quiz/imported';
import type { Quiz } from '../quiz/schema';
import { decodeQuiz } from '../quiz/share';
import { replaceDraft } from './draft';
import { BackPill } from '../../../hub/components/BackButton';
import TutorialButton from '../../../hub/components/Tutorial';
import { IMPORT_TUTORIAL } from '../../../hub/tutorials';
import { tr } from '../../../hub/i18n';

// #/jeopardy/carica          paste a code / open a file
// #/jeopardy/carica/<code>   opened from a shared link: load and go straight to the game
export default function ImportPage({ code }: { code?: string }) {
  const [text, setText] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    setBusy(true);
    decodeQuiz(code)
      .then((q) => redirect(`#/jeopardy/${saveImported(q)}/setup`))
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [code]);

  const read = async (input: string) => {
    setError('');
    setQuiz(null);
    if (!input.trim()) return;
    setBusy(true);
    try {
      setQuiz(await decodeQuiz(input));
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
    read(content);
  };

  const play = () => {
    try {
      go(`/jeopardy/${saveImported(quiz!)}/setup`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const edit = async () => {
    if (await replaceDraft(quiz!)) go('/jeopardy/crea');
  };

  if (code)
    return (
      <div className="import-page">
        <h1 className="title">{tr('Carico il quiz…', 'Loading the quiz…')}</h1>
        {busy && <p className="muted">{tr('Un attimo…', 'Just a moment…')}</p>}
        {error && (
          <>
            <p className="cr-error">{error}</p>
            <a className="btn ghost" href="#/jeopardy/carica">{tr('Prova a incollare il codice', 'Try pasting the code')}</a>
          </>
        )}
      </div>
    );

  return (
    <div className="import-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>{tr('Carica un quiz', 'Load a quiz')}</h1>
        <TutorialButton tutorial={IMPORT_TUTORIAL} />
      </header>
      <p className="cr-tip">
        {tr(
          <>Incolla il codice (inizia con <b>JQ1.</b>) o il link che ti hanno mandato, oppure apri il file scaricato.</>,
          <>Paste the code (it starts with <b>JQ1.</b>) or the link you were sent, or open the downloaded file.</>,
        )}
      </p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          read(e.target.value);
        }}
        placeholder={tr('Incolla qui il codice…', 'Paste the code here…')}
      />
      <label className="cr-file">
        📂 {tr('Apri un file', 'Open a file')}
        <input type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={(e) => openFile(e.target.files?.[0])} />
      </label>
      {busy && <p className="muted">{tr('Lettura…', 'Reading…')}</p>}
      {error && <p className="cr-error">{error}</p>}
      {quiz && (
        <div className="cr-cat">
          <h2 style={{ margin: 0 }}>{quiz.title}</h2>
          {quiz.author && <p className="muted" style={{ margin: 0 }}>{tr('di', 'by')} {quiz.author}</p>}
          <div className="tags">
            {quiz.categories.map((c) => (
              <span key={c.name}>{c.name}</span>
            ))}
          </div>
          <button className="btn primary big" onClick={play}>▶ {tr('Gioca', 'Play')}</button>
          <button className="btn ghost" onClick={edit}>✏️ {tr('Modifica', 'Edit')}</button>
        </div>
      )}
    </div>
  );
}
