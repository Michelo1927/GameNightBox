import { useCallback, useEffect, useMemo, useState } from 'react';
import QuestionModal from '../components/QuestionModal';
import { POINTS, validateQuiz, type Media, type Question, type Quiz } from '../quiz/schema';
import { devFileUrl, loadQuiz, saveQuiz } from './api';
import QuestionForm from './QuestionForm';


const MAX_CATEGORIES = 8;

function cleanMedia(m?: Media): Media | undefined {
  if (!m || !m.src.trim()) return undefined;
  const out: Media = { type: m.type, src: m.src.trim() };
  if (m.start !== undefined && !Number.isNaN(m.start)) out.start = m.start;
  if (m.end !== undefined && !Number.isNaN(m.end)) out.end = m.end;
  if (m.audioOnly) out.audioOnly = true;
  if (m.caption?.trim()) out.caption = m.caption.trim();
  return out;
}

/** Drops empty optional fields so quiz.json stays tidy. */
function cleanQuiz(quiz: Quiz): Quiz {
  const out: Quiz = { title: quiz.title.trim(), categories: [] };
  if (quiz.description?.trim()) out.description = quiz.description.trim();
  if (quiz.author?.trim()) out.author = quiz.author.trim();
  if (quiz.credits?.length) out.credits = quiz.credits;
  out.categories = quiz.categories.map((c) => ({
    name: c.name.trim(),
    questions: c.questions.map((q) => {
      const o: Question = { points: q.points, question: q.question.trim(), answer: q.answer.trim() };
      const media = cleanMedia(q.media);
      if (media) o.media = media;
      if (q.choices) {
        const choices = q.choices.map((x) => x.trim()).filter(Boolean);
        if (choices.length) o.choices = choices;
      }
      const answerMedia = cleanMedia(q.answerMedia);
      if (answerMedia) o.answerMedia = answerMedia;
      if (q.hostNote?.trim()) o.hostNote = q.hostNote.trim();
      return o;
    }),
  }));
  return out;
}

function mediaIcon(m?: Media) {
  if (!m?.src) return '';
  if (m.type === 'image') return '🖼';
  if (m.audioOnly || m.type === 'audio') return '🔊';
  return '🎬';
}

export default function QuizEditor({ slug }: { slug: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loadError, setLoadError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState({ c: 0, q: 0 });
  const [preview, setPreview] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    loadQuiz(slug).then(setQuiz, (e) => setLoadError(e.message));
  }, [slug]);

  const update = (fn: (q: Quiz) => Quiz) => {
    setQuiz((q) => (q ? fn(q) : q));
    setDirty(true);
    setStatus('');
  };

  const save = useCallback(async () => {
    if (!quiz) return;
    setStatus('Salvataggio…');
    try {
      const cleaned = cleanQuiz(quiz);
      await saveQuiz(slug, cleaned);
      setDirty(false);
      setStatus('Salvato ✓');
    } catch (e) {
      setStatus(`Errore: ${(e as Error).message}`);
    }
  }, [quiz, slug]);

  // Ctrl+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener('keydown', onKey);
    addEventListener('beforeunload', onLeave);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('beforeunload', onLeave);
    };
  }, [save, dirty]);

  const problems = useMemo(() => (quiz ? validateQuiz(cleanQuiz(quiz)) : { errors: [], warnings: [] }), [quiz]);
  const isIncomplete = (q: Question) => !q.answer.trim() || (!q.question.trim() && !q.media?.src);
  const incomplete = quiz ? quiz.categories.reduce((n, c) => n + c.questions.filter(isIncomplete).length, 0) : 0;

  if (loadError) return <div className="page"><a className="back" href="#/">← Editor</a><p className="error-text">{loadError}</p></div>;
  if (!quiz) return <div className="page muted">Caricamento…</div>;

  const cat = quiz.categories[sel.c];
  const question = cat?.questions[sel.q];
  const rows = Math.max(...quiz.categories.map((c) => c.questions.length));

  // Functional update: async changes (file uploads) must not overwrite edits made meanwhile.
  const setQuestion = (fn: (q: Question) => Question) => {
    const { c: sc, q: sq } = sel;
    update((z) => ({
      ...z,
      categories: z.categories.map((c, ci) => (ci === sc ? { ...c, questions: c.questions.map((x, qi) => (qi === sq ? fn(x) : x)) } : c)),
    }));
  };
  const setCatName = (ci: number, name: string) =>
    update((z) => ({ ...z, categories: z.categories.map((c, i) => (i === ci ? { ...c, name } : c)) }));
  const addCategory = () =>
    update((z) => ({
      ...z,
      categories: [...z.categories, { name: `Categoria ${z.categories.length + 1}`, questions: POINTS.map((points) => ({ points, question: '', answer: '' })) }],
    }));
  const removeCategory = (ci: number) => {
    if (!confirm(`Eliminare la categoria "${quiz.categories[ci].name}" con tutte le sue domande?`)) return;
    update((z) => ({ ...z, categories: z.categories.filter((_, i) => i !== ci) }));
    setSel({ c: Math.max(0, Math.min(sel.c, quiz.categories.length - 2)), q: sel.q });
  };
  const moveCategory = (ci: number, dir: -1 | 1) => {
    const to = ci + dir;
    if (to < 0 || to >= quiz.categories.length) return;
    update((z) => {
      const cats = [...z.categories];
      [cats[ci], cats[to]] = [cats[to], cats[ci]];
      return { ...z, categories: cats };
    });
    if (sel.c === ci) setSel({ ...sel, c: to });
  };

  return (
    <div className="editor">
      <header className="editor-header">
        <a className="back" href="#/" onClick={(e) => dirty && !confirm('Ci sono modifiche non salvate. Uscire lo stesso?') && e.preventDefault()}>
          ← Editor
        </a>
        <input className="title-input" value={quiz.title} onChange={(e) => update((z) => ({ ...z, title: e.target.value }))} aria-label="Titolo" placeholder="Titolo del quiz" />
        <span className={`status ${dirty ? 'dirty' : ''}`}>{dirty ? 'Modifiche non salvate' : status}</span>
        <button className={`problems ${problems.errors.length ? 'has' : 'ok'}`} onClick={() => setShowProblems((s) => !s)}>
          {incomplete ? `⚠ ${incomplete} domande da completare` : problems.errors.length ? `⚠ ${problems.errors.length} problemi` : '✓ Completo'}
        </button>
        <a className="btn ghost" href={`/#/q/${slug}/setup`} target="_blank" rel="noreferrer" title="Apre il quiz salvato in una nuova scheda">▶ Prova</a>
        <button className="btn primary" onClick={save} disabled={!dirty}>Salva <kbd>Ctrl+S</kbd></button>
      </header>

      {showProblems && (problems.errors.length > 0 || problems.warnings.length > 0) && (
        <ul className="problem-list">
          {problems.errors.map((e) => <li key={e}>{e}</li>)}
          {problems.warnings.map((w) => <li key={w} className="muted">{w}</li>)}
        </ul>
      )}

      <div className="editor-meta">
        <input value={quiz.description ?? ''} onChange={(e) => update((z) => ({ ...z, description: e.target.value }))} placeholder="Descrizione (facoltativa)" />
        <input value={quiz.author ?? ''} onChange={(e) => update((z) => ({ ...z, author: e.target.value }))} placeholder="Autore (facoltativo)" />
      </div>

      <div className="editor-body">
        <div className="editor-board-wrap">
          <div className="editor-board" style={{ gridTemplateColumns: `repeat(${quiz.categories.length}, minmax(110px, 1fr))` }}>
            {quiz.categories.map((c, ci) => (
              <div key={ci} className="ed-cat">
                <textarea rows={2} value={c.name} onChange={(e) => setCatName(ci, e.target.value)} aria-label={`Nome categoria ${ci + 1}`} />
                <div className="ed-cat-tools">
                  <button onClick={() => moveCategory(ci, -1)} disabled={ci === 0} title="Sposta a sinistra">◀</button>
                  <button onClick={() => removeCategory(ci)} disabled={quiz.categories.length <= 1} title="Elimina categoria">🗑</button>
                  <button onClick={() => moveCategory(ci, 1)} disabled={ci === quiz.categories.length - 1} title="Sposta a destra">▶</button>
                </div>
              </div>
            ))}
            {Array.from({ length: rows }, (_, qi) =>
              quiz.categories.map((c, ci) => {
                const q = c.questions[qi];
                if (!q) return <div key={`${ci}-${qi}`} />;
                const todo = isIncomplete(q);
                const selected = sel.c === ci && sel.q === qi;
                return (
                  <button key={`${ci}-${qi}`} className={`ed-cell ${selected ? 'sel' : ''} ${todo ? 'todo' : ''}`} onClick={() => setSel({ c: ci, q: qi })}>
                    <span className="ed-points">{q.points}</span>
                    <span className="ed-snippet">{q.question || (q.media?.src ? '' : 'vuota')}</span>
                    <span className="ed-icons">
                      {mediaIcon(q.media)}
                      {q.choices ? '☑' : ''}
                      {q.answerMedia?.src ? '💡' : ''}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
          {quiz.categories.length < MAX_CATEGORIES && (
            <button className="btn ghost small" onClick={addCategory}>+ Categoria</button>
          )}
        </div>

        {question && (
          <QuestionForm
            key={`${sel.c}-${sel.q}`}
            slug={slug}
            category={cat.name}
            question={question}
            onChange={setQuestion}
            onPreview={() => setPreview(true)}
          />
        )}
      </div>

      {preview && question && (
        <QuestionModal

          category={cat.name}
          question={cleanQuiz({ title: '', categories: [{ name: '', questions: [question] }] }).categories[0].questions[0]}
          teams={[]}
          results={{}}
          onResult={() => {}}
          onClose={() => setPreview(false)}
          resolveUrl={(src) => devFileUrl(slug, src)}
        />
      )}
    </div>
  );
}
