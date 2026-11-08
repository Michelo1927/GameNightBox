import { useEffect, useState } from 'react';
import { go } from '../../../hub/nav';
import { saveImported } from '../quiz/imported';
import type { Quiz } from '../quiz/schema';
import { decodeQuiz } from '../quiz/share';
import { replaceDraft } from './draft';

// #/carica          paste a code / open a file
// #/carica/<code>   opened from a shared link: load and go straight to the game
export default function ImportPage({ code }: { code?: string }) {
  const [text, setText] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!code) return;
    setBusy(true);
    decodeQuiz(code)
      .then((q) => location.replace(`#/q/${saveImported(q)}/setup`))
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
      go(`/q/${saveImported(quiz!)}/setup`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const edit = () => {
    if (replaceDraft(quiz!)) go('/crea');
  };

  if (code)
    return (
      <div className="import-page">
        <h1 className="title">Carico il quiz…</h1>
        {busy && <p className="muted">Un attimo…</p>}
        {error && (
          <>
            <p className="cr-error">{error}</p>
            <a className="btn ghost" href="#/carica">Prova a incollare il codice</a>
          </>
        )}
      </div>
    );

  return (
    <div className="import-page">
      <header className="cr-header">
        <a className="back" href="#/jeopardy">←</a>
        <h1>Carica un quiz</h1>
      </header>
      <p className="cr-tip">Incolla il codice (inizia con <b>JQ1.</b>) o il link che ti hanno mandato, oppure apri il file scaricato.</p>
      <textarea
        rows={6}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          read(e.target.value);
        }}
        placeholder="Incolla qui il codice…"
      />
      <label className="cr-file">
        📂 Apri un file
        <input type="file" accept=".txt,.json,text/plain,application/json" hidden onChange={(e) => openFile(e.target.files?.[0])} />
      </label>
      {busy && <p className="muted">Lettura…</p>}
      {error && <p className="cr-error">{error}</p>}
      {quiz && (
        <div className="cr-cat">
          <h2 style={{ margin: 0 }}>{quiz.title}</h2>
          {quiz.author && <p className="muted" style={{ margin: 0 }}>di {quiz.author}</p>}
          <div className="tags">
            {quiz.categories.map((c) => (
              <span key={c.name}>{c.name}</span>
            ))}
          </div>
          <button className="btn primary big" onClick={play}>▶ Gioca</button>
          <button className="btn ghost" onClick={edit}>✏️ Modifica</button>
        </div>
      )}
    </div>
  );
}
