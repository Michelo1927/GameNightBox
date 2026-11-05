import { useEffect, useMemo, useState } from 'react';
import QuestionModal from '../components/QuestionModal';
import { cleanFinal, cleanQuestion, cleanQuiz, isQuestionComplete } from '../quiz/clean';
import { saveImported } from '../quiz/imported';
import { findCorrectChoice, validateQuiz, type FinalQuestion, type Question, type Quiz } from '../quiz/schema';
import { encodeQuiz } from '../quiz/share';
import { go } from '../nav';
import { blankQuiz, copyText, loadDraft, saveDraft } from './draft';
import MediaPicker from './MediaPicker';

const DIFFICULTY: Record<number, string> = { 100: 'facilissima', 200: 'facile', 300: 'media', 400: 'difficile', 500: 'da esperti' };

// Routes: #/crea (board)  #/crea/<c>-<q> (one question)  #/crea/codice (share)
export default function Creator({ sub }: { sub: string }) {
  const [quiz, setQuiz] = useState<Quiz>(() => loadDraft() ?? blankQuiz());
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    setStorageFull(!saveDraft(quiz));
  }, [quiz]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sub]);

  const cell = /^(\d+)-(\d+)$/.exec(sub);
  return (
    <div className="creator">
      {storageFull && <div className="cr-warning">⚠ Memoria del browser piena: le ultime modifiche non sono salvate. Usa foto più piccole o link alle immagini.</div>}
      {cell ? (
        <QuestionStep quiz={quiz} setQuiz={setQuiz} c={Number(cell[1])} q={Number(cell[2])} />
      ) : sub === 'finale' ? (
        <FinalStep quiz={quiz} setQuiz={setQuiz} />
      ) : sub === 'codice' ? (
        <ShareStep quiz={quiz} />
      ) : (
        <BoardStep quiz={quiz} setQuiz={setQuiz} />
      )}
    </div>
  );
}

type SetQuiz = React.Dispatch<React.SetStateAction<Quiz>>;

function missing(quiz: Quiz) {
  const list: { label: string; href: string }[] = [];
  if (!quiz.title.trim()) list.push({ label: 'Titolo del quiz', href: '#/crea' });
  quiz.categories.forEach((cat, ci) => {
    if (!cat.name.trim()) list.push({ label: `Nome della categoria ${ci + 1}`, href: '#/crea' });
    cat.questions.forEach((q, qi) => {
      if (!isQuestionComplete(q)) list.push({ label: `${cat.name || `Categoria ${ci + 1}`} ${q.points}`, href: `#/crea/${ci}-${qi}` });
    });
  });
  // The final question is optional, but once started it must be complete.
  const f = cleanFinal(quiz.final);
  if (f && (!f.category || !f.answer || (!f.question && !f.media))) list.push({ label: 'Domanda finale', href: '#/crea/finale' });
  return list;
}

function BoardStep({ quiz, setQuiz }: { quiz: Quiz; setQuiz: SetQuiz }) {
  const todo = missing(quiz);
  const total = quiz.categories.length * 5;
  const done = quiz.categories.reduce((n, c) => n + c.questions.filter(isQuestionComplete).length, 0);

  const setCat = (ci: number, name: string) =>
    setQuiz((z) => ({ ...z, categories: z.categories.map((c, i) => (i === ci ? { ...c, name } : c)) }));
  const reset = () => {
    if (confirm('Cancellare tutto il quiz e ricominciare da zero?')) setQuiz(blankQuiz());
  };

  return (
    <>
      <header className="cr-header">
        <a className="back" href="#/">←</a>
        <h1>Crea un quiz</h1>
      </header>

      <p className="cr-tip">
        5 categorie × 5 domande, da <b>100</b> (facilissima) a <b>500</b> (da esperti). Si salva da solo su questo dispositivo: puoi
        chiudere e riprendere quando vuoi.
      </p>

      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={quiz.title} onChange={(e) => setQuiz((z) => ({ ...z, title: e.target.value }))} placeholder="Es. Cena di Natale 2026" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={quiz.author ?? ''} onChange={(e) => setQuiz((z) => ({ ...z, author: e.target.value }))} placeholder="Il tuo nome" />
      </label>

      {quiz.categories.map((cat, ci) => (
        <section key={ci} className="cr-cat">
          <input className="cr-cat-name" value={cat.name} onChange={(e) => setCat(ci, e.target.value)} placeholder={`Nome categoria ${ci + 1}`} />
          <div className="cr-chips">
            {cat.questions.map((q, qi) => (
              <a key={qi} href={`#/crea/${ci}-${qi}`} className={isQuestionComplete(q) ? 'done' : ''}>
                {q.points}
                <small>{isQuestionComplete(q) ? '✓' : '+'}</small>
              </a>
            ))}
          </div>
        </section>
      ))}

      <a className={`cr-final ${cleanFinal(quiz.final) ? 'done' : ''}`} href="#/crea/finale">
        🏆 Domanda finale <small>{cleanFinal(quiz.final) ? '✓' : 'facoltativa: ogni squadra scommette i suoi punti'}</small>
      </a>

      <div className="cr-secondary">
        <a className="btn ghost" href="#/carica">📥 Modifica un quiz da codice</a>
        <button className="btn ghost" onClick={reset}>🗑 Ricomincia da zero</button>
      </div>

      <footer className="cr-bar">
        <div className="cr-progress">
          <div style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {todo.length === 0 ? (
          <a className="btn primary big" href="#/crea/codice">✨ Genera il codice</a>
        ) : (
          <a className="btn primary big" href={(todo.find((t) => t.href !== '#/crea') ?? todo[0]).href} onClick={() => window.scrollTo(0, 0)}>
            {done}/{total} domande · Continua →
          </a>
        )}
        {todo.length > 0 && (todo.length <= 4 || todo.some((t) => t.href === '#/crea')) && (
          <p className="cr-missing">Manca: {todo.slice(0, 4).map((t) => t.label).join(', ')}{todo.length > 4 ? '…' : ''}</p>
        )}
      </footer>
    </>
  );
}

function QuestionStep({ quiz, setQuiz, c, q }: { quiz: Quiz; setQuiz: SetQuiz; c: number; q: number }) {
  const [preview, setPreview] = useState(false);
  const cat = quiz.categories[c];
  const question = cat?.questions[q];
  if (!question) return <p className="cr-error">Domanda non trovata. <a href="#/crea">Torna al tabellone</a></p>;

  const set = (patch: Partial<Question>) =>
    setQuiz((z) => ({
      ...z,
      categories: z.categories.map((cc, ci) => (ci === c ? { ...cc, questions: cc.questions.map((x, qi) => (qi === q ? { ...x, ...patch } : x)) } : cc)),
    }));

  // Flat order: category by category, 100 -> 500.
  const flat = quiz.categories.flatMap((cc, ci) => cc.questions.map((_, qi) => `${ci}-${qi}`));
  const idx = flat.indexOf(`${c}-${q}`);
  const prev = flat[idx - 1];
  const next = flat[idx + 1];

  const correct = question.choices ? findCorrectChoice(question.choices, question.answer) : -1;
  const setChoice = (i: number, text: string) => {
    const choices = [...(question.choices ?? [])];
    choices[i] = text;
    set(i === correct ? { choices, answer: text } : { choices });
  };

  return (
    <>
      <header className="cr-header">
        <a className="back" href="#/crea">←</a>
        <h1>
          {cat.name || `Categoria ${c + 1}`} <span className="gold">{question.points}</span>
        </h1>
        <span className="cr-count">{idx + 1}/{flat.length}</span>
      </header>
      <p className="cr-tip small">Difficoltà: <b>{DIFFICULTY[question.points] ?? 'a scelta'}</b></p>

      <label className="cr-field">
        <span className="cr-label">Domanda</span>
        <textarea rows={3} value={question.question} onChange={(e) => set({ question: e.target.value })} placeholder="Scrivi la domanda (può restare vuota se metti una foto o un video)" />
      </label>

      <MediaPicker key={`q-${c}-${q}`} label="Foto o video con la domanda (facoltativo)" media={question.media} onChange={(media) => set({ media })} />

      <label className="cr-check">
        <input
          type="checkbox"
          checked={!!question.choices}
          onChange={(e) => set({ choices: e.target.checked ? [question.answer, '', '', ''] : undefined })}
        />
        Risposta multipla (A, B, C, D)
      </label>
      {question.choices && (
        <div className="cr-choices">
          {question.choices.map((ch, i) => (
            <div key={i} className="cr-choice">
              <input type="radio" name={`ok-${c}-${q}`} checked={i === correct && ch !== ''} onChange={() => set({ answer: ch })} aria-label="Risposta giusta" />
              <b className="gold">{'ABCD'[i]}</b>
              <input value={ch} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Opzione ${'ABCD'[i]}`} />
            </div>
          ))}
          <p className="cr-hint">Tocca il pallino accanto alla risposta giusta.</p>
        </div>
      )}

      <label className="cr-field">
        <span className="cr-label">Risposta</span>
        <input value={question.answer} onChange={(e) => set({ answer: e.target.value })} placeholder="La risposta giusta" />
      </label>

      <details className="cr-more" open={!!(question.rules || question.hostNote || question.answerMedia)}>
        <summary>Altre opzioni</summary>
        <label className="cr-field">
          <span className="cr-label">Regole (le vedono tutti con la domanda)</span>
          <input value={question.rules ?? ''} onChange={(e) => set({ rules: e.target.value })} placeholder="Es. servono titolo e artista" />
        </label>
        <label className="cr-field">
          <span className="cr-label">Nota per l'host (compare solo dopo la risposta)</span>
          <input value={question.hostNote ?? ''} onChange={(e) => set({ hostNote: e.target.value })} placeholder="Es. accettare anche il solo cognome" />
        </label>
        <MediaPicker key={`a-${c}-${q}`} label="Foto o video con la risposta" media={question.answerMedia} onChange={(answerMedia) => set({ answerMedia })} />
      </details>

      <footer className="cr-bar cr-nav">
        <button className="btn ghost" disabled={!prev} onClick={() => prev && go(`/crea/${prev}`)}>‹</button>
        <button className="btn ghost" onClick={() => setPreview(true)}>👁 Anteprima</button>
        <button className="btn primary" onClick={() => go(next ? `/crea/${next}` : '/crea')}>
          {next ? 'Avanti ›' : 'Fatto ✓'}
        </button>
      </footer>

      {preview && (
        <QuestionModal
          category={cat.name || `Categoria ${c + 1}`}
          question={cleanQuestion(question)}
          teams={[]}
          results={{}}
          onResult={() => {}}
          onClose={() => setPreview(false)}
          resolveUrl={(src) => src}
        />
      )}
    </>
  );
}

const EMPTY_FINAL: FinalQuestion = { category: '', question: '', answer: '' };

function FinalStep({ quiz, setQuiz }: { quiz: Quiz; setQuiz: SetQuiz }) {
  const f = quiz.final ?? EMPTY_FINAL;
  const set = (patch: Partial<FinalQuestion>) => setQuiz((z) => ({ ...z, final: { ...(z.final ?? EMPTY_FINAL), ...patch } }));
  const remove = () => {
    if (confirm('Togliere la domanda finale?')) {
      setQuiz((z) => ({ ...z, final: undefined }));
      go('/crea');
    }
  };
  return (
    <>
      <header className="cr-header">
        <a className="back" href="#/crea">←</a>
        <h1>🏆 Domanda finale</h1>
      </header>
      <p className="cr-tip small">
        Si gioca dopo l'ultima casella. Prima si vede solo la categoria: ogni squadra scommette quanti punti vuole (fino al suo punteggio), poi
        arriva la domanda. Meglio una domanda difficile ma "giusta".
      </p>
      <label className="cr-field">
        <span className="cr-label">Categoria</span>
        <input value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder="Es. Storia d'Italia" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Domanda</span>
        <textarea rows={3} value={f.question} onChange={(e) => set({ question: e.target.value })} placeholder="Scrivi la domanda" />
      </label>
      <MediaPicker key="final-q" label="Foto o video con la domanda (facoltativo)" media={f.media} onChange={(media) => set({ media })} />
      <label className="cr-field">
        <span className="cr-label">Risposta</span>
        <input value={f.answer} onChange={(e) => set({ answer: e.target.value })} placeholder="La risposta giusta" />
      </label>
      <details className="cr-more" open={!!(f.rules || f.hostNote || f.answerMedia)}>
        <summary>Altre opzioni</summary>
        <label className="cr-field">
          <span className="cr-label">Regole (le vedono tutti con la domanda)</span>
          <input value={f.rules ?? ''} onChange={(e) => set({ rules: e.target.value })} />
        </label>
        <label className="cr-field">
          <span className="cr-label">Nota per l'host (compare solo dopo la risposta)</span>
          <input value={f.hostNote ?? ''} onChange={(e) => set({ hostNote: e.target.value })} />
        </label>
        <MediaPicker key="final-a" label="Foto o video con la risposta" media={f.answerMedia} onChange={(answerMedia) => set({ answerMedia })} />
      </details>
      <footer className="cr-bar cr-nav">
        {quiz.final && <button className="btn ghost" onClick={remove}>🗑 Togli</button>}
        <button className="btn primary" onClick={() => go('/crea')}>Fatto ✓</button>
      </footer>
    </>
  );
}

const WHATSAPP_LIMIT = 60000;

function ShareStep({ quiz }: { quiz: Quiz }) {
  const cleaned = useMemo(() => cleanQuiz(quiz), [quiz]);
  const { errors } = validateQuiz(cleaned);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const todo = missing(quiz);

  useEffect(() => {
    if (todo.length === 0 && errors.length === 0) encodeQuiz(cleaned).then(setCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned]);

  if (todo.length || errors.length) {
    return (
      <>
        <header className="cr-header">
          <a className="back" href="#/crea">←</a>
          <h1>Quasi pronto</h1>
        </header>
        <p className="cr-tip">Completa prima queste parti:</p>
        <ul className="cr-todo">
          {todo.map((t) => (
            <li key={t.label}>
              <a href={t.href}>{t.label} →</a>
            </li>
          ))}
          {todo.length === 0 && errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </>
    );
  }

  const link = `${location.origin}${location.pathname}#/carica/${code}`;
  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };
  const copy = async (text: string, what: string) => flash((await copyText(text)) ? `${what} copiato ✓` : 'Copia non riuscita: tieni premuto sul testo e copialo a mano');
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: cleaned.title, text: `Quiz "${cleaned.title}": apri il link per giocare`, url: link });
      } catch {
        /* share sheet closed */
      }
    } else copy(link, 'Link');
  };
  const fileName = `${cleaned.title.replace(/[^\w\s-]/g, '').trim() || 'quiz'}.txt`;
  const long = code.length > WHATSAPP_LIMIT;
  // On phones this opens the share sheet with a .txt file (e.g. to send on WhatsApp).
  const shareFile = async () => {
    const file = new File([code], fileName, { type: 'text/plain' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: cleaned.title });
      } catch {
        /* share sheet closed */
      }
    } else download();
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const play = () => go(`/q/${saveImported(cleaned)}/setup`);

  return (
    <>
      <header className="cr-header">
        <a className="back" href="#/crea">←</a>
        <h1>Quiz pronto! 🎉</h1>
      </header>
      <p className="cr-tip">
        Manda il <b>link</b> o il <b>codice</b> a chi farà da host. Per giocare: apri il sito, tocca <b>📥 Carica un quiz</b> e incolla il
        codice, oppure apri direttamente il link.
      </p>

      {!code ? (
        <p className="muted">Preparazione del codice…</p>
      ) : (
        <>
          <textarea className="cr-code" readOnly rows={5} value={code} onFocus={(e) => e.target.select()} />
          <p className="cr-hint">
            {code.length.toLocaleString('it-IT')} caratteri
            {long && (
              <span className="cr-error">
                {' '}
                · Troppo lungo per un messaggio (colpa delle foto): condividilo come file, che si apre con «📂 Apri un file».
              </span>
            )}
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
            <button className="btn ghost" onClick={play}>▶ Gioca su questo dispositivo</button>
          </div>
          {msg && <div className="cr-toast">{msg}</div>}
        </>
      )}
      <p className="cr-hint">Il quiz resta salvato qui: puoi tornare indietro e modificarlo, poi rigenerare il codice.</p>
    </>
  );
}

