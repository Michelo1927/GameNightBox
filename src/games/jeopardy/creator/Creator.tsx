import { useEffect, useMemo, useState } from 'react';
import QuestionModal from '../components/QuestionModal';
import { cleanFinal, cleanQuestion, cleanQuiz, isQuestionComplete } from '../quiz/clean';
import { removeImported, saveImported } from '../quiz/imported';
import { findCorrectChoice, validateQuiz, type FinalQuestion, type Question, type Quiz } from '../quiz/schema';
import { encodeQuiz } from '../quiz/share';
import { go, redirect } from '../../../hub/nav';
import { blankQuiz, clearDraft, copyText, lastSavedSlug, loadDraft, markDraftDone, saveDraft, savedSlugOf } from './draft';
import MediaPicker from './MediaPicker';
import { ask } from '../../../hub/ask';
import { BackPill } from '../../../hub/components/BackButton';
import TutorialButton from '../../../hub/components/Tutorial';
import { SHARE_TUTORIAL } from '../../../hub/tutorials';
import { BOARD_TUTORIAL, QUESTION_TUTORIAL } from './tutorials';
import { locale, tr } from '../../../hub/i18n';

const DIFFICULTY: Record<number, string> = tr(
  { 100: 'facilissima', 200: 'facile', 300: 'media', 400: 'difficile', 500: 'da esperti' },
  { 100: 'very easy', 200: 'easy', 300: 'medium', 400: 'hard', 500: 'for experts' },
);

// Routes: #/jeopardy/crea (board)  #/jeopardy/crea/<c>-<q> (one question)  #/jeopardy/crea/codice (share)
export default function Creator({ sub }: { sub: string }) {
  const [quiz, setQuiz] = useState<Quiz>(() => {
    const draft = loadDraft();
    // "Crea un quiz" from the home page: a finished quiz is already saved on the device, so start a new one.
    if (sub === 'nuovo' && draft && savedSlugOf(draft)) {
      clearDraft();
      return blankQuiz();
    }
    return draft ?? blankQuiz();
  });
  const [storageFull, setStorageFull] = useState(false);

  useEffect(() => {
    if (sub === 'nuovo') redirect('#/jeopardy/crea');
  }, [sub]);

  useEffect(() => {
    setStorageFull(!saveDraft(quiz));
  }, [quiz]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [sub]);

  const cell = /^(\d+)-(\d+)$/.exec(sub);
  return (
    <div className="creator theme-jeopardy">
      {storageFull && <div className="cr-warning">
          ⚠{' '}
          {tr(
            'Memoria del browser piena: le ultime modifiche non sono salvate. Usa foto più piccole o link alle immagini.',
            'The browser memory is full: the latest changes are not saved. Use smaller photos or links to images.',
          )}
        </div>}
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
  if (!quiz.title.trim()) list.push({ label: tr('Titolo del quiz', 'Quiz title'), href: '#/jeopardy/crea' });
  quiz.categories.forEach((cat, ci) => {
    if (!cat.name.trim()) list.push({ label: tr(`Nome della categoria ${ci + 1}`, `Name of category ${ci + 1}`), href: '#/jeopardy/crea' });
    cat.questions.forEach((q, qi) => {
      if (!isQuestionComplete(q)) list.push({ label: `${cat.name || tr(`Categoria ${ci + 1}`, `Category ${ci + 1}`)} ${q.points}`, href: `#/jeopardy/crea/${ci}-${qi}` });
    });
  });
  // The final question is optional, but once started it must be complete.
  const f = cleanFinal(quiz.final);
  if (f && (!f.category || !f.answer || (!f.question && !f.media))) list.push({ label: tr('Domanda finale', 'Final question'), href: '#/jeopardy/crea/finale' });
  return list;
}

function BoardStep({ quiz, setQuiz }: { quiz: Quiz; setQuiz: SetQuiz }) {
  const todo = missing(quiz);
  const total = quiz.categories.length * 5;
  const done = quiz.categories.reduce((n, c) => n + c.questions.filter(isQuestionComplete).length, 0);

  const setCat = (ci: number, name: string) =>
    setQuiz((z) => ({ ...z, categories: z.categories.map((c, i) => (i === ci ? { ...c, name } : c)) }));
  const reset = async () => {
    if (!(await ask(tr('Cancellare tutto il quiz e ricominciare da zero?', 'Delete the whole quiz and start from scratch?'), tr('Cancella tutto', 'Delete everything')))) return;
    clearDraft();
    setQuiz(blankQuiz());
  };

  return (
    <>
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>{tr('Crea un quiz', 'Create a quiz')}</h1>
        <TutorialButton tutorial={BOARD_TUTORIAL} />
      </header>

      <p className="cr-tip">
        {tr(
          <>
            5 categorie × 5 domande, da <b>100</b> (facilissima) a <b>500</b> (da esperti). Si salva da solo su questo dispositivo: puoi
            chiudere e riprendere quando vuoi.
          </>,
          <>
            5 categories × 5 questions, from <b>100</b> (very easy) to <b>500</b> (for experts). It saves itself on this device: you can
            close it and pick it up whenever you like.
          </>,
        )}
      </p>

      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={quiz.title} onChange={(e) => setQuiz((z) => ({ ...z, title: e.target.value }))} placeholder={tr('Es. Cena di Natale 2026', 'E.g. Christmas dinner 2026')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={quiz.author ?? ''} onChange={(e) => setQuiz((z) => ({ ...z, author: e.target.value }))} placeholder={tr('Il tuo nome', 'Your name')} />
      </label>

      {quiz.categories.map((cat, ci) => (
        <section key={ci} className="cr-cat">
          <input className="cr-cat-name" value={cat.name} onChange={(e) => setCat(ci, e.target.value)} placeholder={tr(`Nome categoria ${ci + 1}`, `Category name ${ci + 1}`)} />
          <div className="cr-chips">
            {cat.questions.map((q, qi) => (
              <a key={qi} href={`#/jeopardy/crea/${ci}-${qi}`} className={isQuestionComplete(q) ? 'done' : ''}>
                {q.points}
                <small>{isQuestionComplete(q) ? '✓' : '+'}</small>
              </a>
            ))}
          </div>
        </section>
      ))}

      <a className={`cr-final ${cleanFinal(quiz.final) ? 'done' : ''}`} href="#/jeopardy/crea/finale">
        🏆 {tr('Domanda finale', 'Final question')}{' '}
        <small>{cleanFinal(quiz.final) ? '✓' : tr('facoltativa: ogni squadra scommette i suoi punti', 'optional: each team bets its points')}</small>
      </a>

      <div className="cr-secondary">
        <a className="btn ghost" href="#/jeopardy/carica">📥 {tr('Modifica un quiz da codice', 'Edit a quiz from a code')}</a>
        <button className="btn ghost" onClick={reset}>🗑 {tr('Ricomincia da zero', 'Start from scratch')}</button>
      </div>

      <footer className="cr-bar">
        <div className="cr-progress">
          <div style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {todo.length === 0 ? (
          <a className="btn primary big" href="#/jeopardy/crea/codice">✨ {tr('Genera il codice', 'Make the code')}</a>
        ) : (
          <a className="btn primary big" href={(todo.find((t) => t.href !== '#/jeopardy/crea') ?? todo[0]).href} onClick={() => window.scrollTo(0, 0)}>
            {done}/{total} {tr('domande · Continua →', 'questions · Continue →')}
          </a>
        )}
        {todo.length > 0 && (todo.length <= 4 || todo.some((t) => t.href === '#/jeopardy/crea')) && (
          <p className="cr-missing">{tr('Manca', 'Missing')}: {todo.slice(0, 4).map((t) => t.label).join(', ')}{todo.length > 4 ? '…' : ''}</p>
        )}
      </footer>
    </>
  );
}

function QuestionStep({ quiz, setQuiz, c, q }: { quiz: Quiz; setQuiz: SetQuiz; c: number; q: number }) {
  const [preview, setPreview] = useState(false);
  const cat = quiz.categories[c];
  const question = cat?.questions[q];
  if (!question) return <p className="cr-error">
        {tr('Domanda non trovata.', 'Question not found.')} <a href="#/jeopardy/crea">{tr('Torna al tabellone', 'Back to the board')}</a>
      </p>;

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
        <BackPill label={tr('Indietro', 'Back')} />
        <h1>
          {cat.name || tr(`Categoria ${c + 1}`, `Category ${c + 1}`)} <span className="gold">{question.points}</span>
        </h1>
        <span className="cr-count">{idx + 1}/{flat.length}</span>
        <TutorialButton tutorial={QUESTION_TUTORIAL} />
      </header>
      <p className="cr-tip small">
        {tr('Difficoltà', 'Difficulty')}: <b>{DIFFICULTY[question.points] ?? tr('a scelta', 'your choice')}</b>
      </p>

      <label className="cr-field">
        <span className="cr-label">{tr('Domanda', 'Question')}</span>
        <textarea rows={3} value={question.question} onChange={(e) => set({ question: e.target.value })} placeholder={tr('Scrivi la domanda (può restare vuota se metti una foto o un video)', 'Write the question (it can stay empty if you add a photo or a video)')} />
      </label>

      <MediaPicker key={`q-${c}-${q}`} label={tr('Foto o video con la domanda (facoltativo)', 'Photo or video with the question (optional)')} media={question.media} onChange={(media) => set({ media })} />

      <label className="cr-check">
        <input
          type="checkbox"
          checked={!!question.choices}
          onChange={(e) => set({ choices: e.target.checked ? [question.answer, '', '', ''] : undefined })}
        />
        {tr('Risposta multipla (A, B, C, D)', 'Multiple choice (A, B, C, D)')}
      </label>
      {question.choices && (
        <div className="cr-choices">
          {question.choices.map((ch, i) => (
            <div key={i} className="cr-choice">
              <input type="radio" name={`ok-${c}-${q}`} checked={i === correct && ch !== ''} onChange={() => set({ answer: ch })} aria-label={tr('Risposta giusta', 'Right answer')} />
              <b className="gold">{'ABCD'[i]}</b>
              <input value={ch} onChange={(e) => setChoice(i, e.target.value)} placeholder={`${tr('Opzione', 'Option')} ${'ABCD'[i]}`} />
            </div>
          ))}
          <p className="cr-hint">{tr('Tocca il pallino accanto alla risposta giusta.', 'Tap the dot next to the right answer.')}</p>
        </div>
      )}

      <label className="cr-field">
        <span className="cr-label">{tr('Risposta', 'Answer')}</span>
        <input value={question.answer} onChange={(e) => set({ answer: e.target.value })} placeholder={tr('La risposta giusta', 'The right answer')} />
      </label>

      <details className="cr-more" open={!!(question.rules || question.hostNote || question.answerMedia)}>
        <summary>{tr('Altre opzioni', 'More options')}</summary>
        <label className="cr-field">
          <span className="cr-label">{tr('Regole (le vedono tutti con la domanda)', 'Rules (everyone sees them with the question)')}</span>
          <input value={question.rules ?? ''} onChange={(e) => set({ rules: e.target.value })} placeholder={tr('Es. servono titolo e artista', 'E.g. title and artist needed')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr("Nota per l'host (compare solo dopo la risposta)", 'Note for the host (shown only after the answer)')}</span>
          <input value={question.hostNote ?? ''} onChange={(e) => set({ hostNote: e.target.value })} placeholder={tr('Es. accettare anche il solo cognome', 'E.g. accept the surname alone')} />
        </label>
        <MediaPicker key={`a-${c}-${q}`} label={tr('Foto o video con la risposta', 'Photo or video with the answer')} media={question.answerMedia} onChange={(answerMedia) => set({ answerMedia })} />
      </details>

      <footer className="cr-bar cr-nav">
        <button className="btn ghost" disabled={!prev} onClick={() => prev && go(`/jeopardy/crea/${prev}`)}>‹</button>
        <button className="btn ghost" onClick={() => setPreview(true)}>👁 {tr('Anteprima', 'Preview')}</button>
        <button className="btn primary" onClick={() => go(next ? `/crea/${next}` : '/crea')}>
          {next ? tr('Avanti ›', 'Next ›') : tr('Fatto ✓', 'Done ✓')}
        </button>
      </footer>

      {preview && (
        <QuestionModal
          category={cat.name || tr(`Categoria ${c + 1}`, `Category ${c + 1}`)}
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
  const remove = async () => {
    if (await ask(tr('Togliere la domanda finale?', 'Remove the final question?'), tr('Togli', 'Remove'))) {
      setQuiz((z) => ({ ...z, final: undefined }));
      go('/jeopardy/crea');
    }
  };
  return (
    <>
      <header className="cr-header">
        <BackPill label={tr('Indietro', 'Back')} />
        <h1>🏆 {tr('Domanda finale', 'Final question')}</h1>
      </header>
      <p className="cr-tip small">
        {tr(
          `Si gioca dopo l'ultima casella. Prima si vede solo la categoria: ogni squadra scommette quanti punti vuole (fino al suo punteggio), poi arriva la domanda. Meglio una domanda difficile ma "giusta".`,
          `It's played after the last square. First only the category is shown: each team bets as many points as it likes (up to its score), then the question comes. Better a hard but "fair" question.`,
        )}
      </p>
      <label className="cr-field">
        <span className="cr-label">{tr('Categoria', 'Category')}</span>
        <input value={f.category} onChange={(e) => set({ category: e.target.value })} placeholder={tr("Es. Storia d'Italia", 'E.g. World history')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Domanda', 'Question')}</span>
        <textarea rows={3} value={f.question} onChange={(e) => set({ question: e.target.value })} placeholder={tr('Scrivi la domanda', 'Write the question')} />
      </label>
      <MediaPicker key="final-q" label={tr('Foto o video con la domanda (facoltativo)', 'Photo or video with the question (optional)')} media={f.media} onChange={(media) => set({ media })} />
      <label className="cr-field">
        <span className="cr-label">{tr('Risposta', 'Answer')}</span>
        <input value={f.answer} onChange={(e) => set({ answer: e.target.value })} placeholder={tr('La risposta giusta', 'The right answer')} />
      </label>
      <details className="cr-more" open={!!(f.rules || f.hostNote || f.answerMedia)}>
        <summary>{tr('Altre opzioni', 'More options')}</summary>
        <label className="cr-field">
          <span className="cr-label">{tr('Regole (le vedono tutti con la domanda)', 'Rules (everyone sees them with the question)')}</span>
          <input value={f.rules ?? ''} onChange={(e) => set({ rules: e.target.value })} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr("Nota per l'host (compare solo dopo la risposta)", 'Note for the host (shown only after the answer)')}</span>
          <input value={f.hostNote ?? ''} onChange={(e) => set({ hostNote: e.target.value })} />
        </label>
        <MediaPicker key="final-a" label={tr('Foto o video con la risposta', 'Photo or video with the answer')} media={f.answerMedia} onChange={(answerMedia) => set({ answerMedia })} />
      </details>
      <footer className="cr-bar cr-nav">
        {quiz.final && <button className="btn ghost" onClick={remove}>🗑 {tr('Togli', 'Remove')}</button>}
        <button className="btn primary" onClick={() => go('/jeopardy/crea')}>{tr('Fatto ✓', 'Done ✓')}</button>
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
    if (todo.length !== 0 || errors.length !== 0) return;
    encodeQuiz(cleaned).then(setCode);
    // Keep the finished quiz on the device (replacing its older version), so a new quiz can start from scratch.
    try {
      const old = lastSavedSlug();
      const slug = saveImported(cleaned);
      if (old && old !== slug) removeImported(old);
      markDraftDone(quiz, slug);
    } catch {
      /* no room left: the draft stays as it is */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned]);

  if (todo.length || errors.length) {
    return (
      <>
        <header className="cr-header">
          <BackPill label={tr('Indietro', 'Back')} />
          <h1>{tr('Quasi pronto', 'Almost ready')}</h1>
        </header>
        <p className="cr-tip">{tr('Completa prima queste parti:', 'First complete these parts:')}</p>
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

  const link = `${location.origin}${location.pathname}#/jeopardy/carica/${code}`;
  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };
  const copy = async (text: string, what: string) => flash(
      (await copyText(text))
        ? tr(`${what} copiato ✓`, `${what} copied ✓`)
        : tr('Copia non riuscita: tieni premuto sul testo e copialo a mano', "Couldn't copy: press and hold on the text and copy it by hand"),
    );
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: cleaned.title, text: tr(`Quiz "${cleaned.title}": apri il link per giocare`, `Quiz "${cleaned.title}": open the link to play`), url: link });
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
  const play = () => go(`/jeopardy/${saveImported(cleaned)}/setup`);

  return (
    <>
      <header className="cr-header">
        <BackPill label={tr('Indietro', 'Back')} />
        <h1>{tr('Quiz pronto! 🎉', 'Quiz ready! 🎉')}</h1>
        <TutorialButton tutorial={SHARE_TUTORIAL} />
      </header>
      <p className="cr-tip">
        {tr(
          <>
            Manda il <b>link</b> o il <b>codice</b> a chi farà da host. Per giocare: apri il sito, tocca <b>📥 Carica un quiz</b> e incolla
            il codice, oppure apri direttamente il link.
          </>,
          <>
            Send the <b>link</b> or the <b>code</b> to whoever will host. To play: open the site, tap <b>📥 Load a quiz</b> and paste the
            code, or just open the link.
          </>,
        )}
      </p>

      {!code ? (
        <p className="muted">{tr('Preparazione del codice…', 'Making the code…')}</p>
      ) : (
        <>
          <textarea className="cr-code" readOnly rows={5} value={code} onFocus={(e) => e.target.select()} />
          <p className="cr-hint">
            {code.length.toLocaleString(locale)} {tr('caratteri', 'characters')}
            {long && (
              <span className="cr-error">
                {' '}
                ·{' '}
                {tr(
                  'Troppo lungo per un messaggio (colpa delle foto): condividilo come file, che si apre con «📂 Apri un file».',
                  'Too long for a message (the photos): share it as a file, which opens with “📂 Open a file”.',
                )}
              </span>
            )}
          </p>
          <div className="cr-share">
            {long ? (
              <button className="btn primary big" onClick={shareFile}>📤 {tr('Condividi file', 'Share file')}</button>
            ) : (
              <button className="btn primary big" onClick={share}>📤 {tr('Condividi link', 'Share link')}</button>
            )}
            <button className="btn ghost" onClick={() => copy(code, tr('Codice', 'Code'))}>📋 {tr('Copia codice', 'Copy code')}</button>
            {!long && <button className="btn ghost" onClick={() => copy(link, 'Link')}>🔗 {tr('Copia link', 'Copy link')}</button>}
            <button className="btn ghost" onClick={download}>💾 {tr('Scarica file', 'Download file')}</button>
            <button className="btn ghost" onClick={play}>▶ {tr('Gioca su questo dispositivo', 'Play on this device')}</button>
          </div>
          {msg && <div className="cr-toast">{msg}</div>}
        </>
      )}
      <p className="cr-hint">{tr('Il quiz resta salvato qui: puoi tornare indietro e modificarlo, poi rigenerare il codice.', 'The quiz stays saved here: you can go back and edit it, then make the code again.')}</p>
    </>
  );
}

