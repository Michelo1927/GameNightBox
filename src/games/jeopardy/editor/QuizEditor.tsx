import { useCallback, useEffect, useMemo, useState } from 'react';
import QuestionModal from '../components/QuestionModal';
import { POINTS, validateQuiz, type FinalQuestion, type Media, type Question, type Quiz } from '../quiz/schema';
import { cleanQuestion, cleanQuiz, isQuestionComplete } from '../quiz/clean';
import { devFileUrl, loadQuiz, saveQuiz } from './api';
import QuestionForm from './QuestionForm';
import { ask } from '../../../hub/ask';

const MAX_CATEGORIES = 8;

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
  const isIncomplete = (q: Question) => !isQuestionComplete(q);
  const incomplete = quiz ? quiz.categories.reduce((n, c) => n + c.questions.filter(isIncomplete).length, 0) : 0;

  if (loadError) return <div className="page"><a className="back" href="#/">← Editor</a><p className="error-text">{loadError}</p></div>;
  if (!quiz) return <div className="page muted">Caricamento…</div>;

  // sel.c === -1 is the final question.
  const isFinal = sel.c === -1;
  const final: FinalQuestion = quiz.final ?? { category: '', question: '', answer: '' };
  const cat = isFinal ? { name: final.category, questions: [] } : quiz.categories[sel.c];
  const question: Question | undefined = isFinal ? { ...final, points: 0 } : cat?.questions[sel.q];
  const rows = Math.max(...quiz.categories.map((c) => c.questions.length));

  // Functional update: async changes (file uploads) must not overwrite edits made meanwhile.
  const setFinal = (fn: (f: FinalQuestion) => FinalQuestion) =>
    update((z) => ({ ...z, final: fn(z.final ?? { category: '', question: '', answer: '' }) }));
  const setQuestion = (fn: (q: Question) => Question) => {
    if (isFinal) {
      setFinal((f) => {
        const { points: _, ...rest } = fn({ ...f, points: 0 });
        return { ...rest, category: f.category };
      });
      return;
    }
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
  const removeCategory = async (ci: number) => {
    if (!(await ask(`Eliminare la categoria "${quiz.categories[ci].name}" con tutte le sue domande?`, 'Elimina'))) return;
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
        <a className="back" href="#/" onClick={async (e) => {
            if (!dirty) return;
            e.preventDefault();
            if (await ask('Ci sono modifiche non salvate. Uscire lo stesso?', 'Esci')) location.hash = '#/';
          }}>
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
          <div className="ed-board-tools">
            {quiz.categories.length < MAX_CATEGORIES && (
              <button className="btn ghost small" onClick={addCategory}>+ Categoria</button>
            )}
            <button className={`btn small ${isFinal ? 'primary' : 'ghost'}`} onClick={() => setSel({ c: -1, q: 0 })}>
              🏆 Domanda finale {quiz.final?.answer ? '✓' : '(facoltativa)'}
            </button>
          </div>
          {isFinal && (
            <label className="ed-final-cat">
              Categoria della domanda finale (si vede prima delle puntate)
              <input value={final.category} onChange={(e) => setFinal((f) => ({ ...f, category: e.target.value }))} placeholder="Es. Storia d'Italia" />
            </label>
          )}
        </div>

        {question && (
          <QuestionForm
            key={`${sel.c}-${sel.q}`}
            isFinal={isFinal}
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
          question={cleanQuestion(question)}
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
