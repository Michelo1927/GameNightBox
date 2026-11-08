import { useEffect, useState } from 'react';

import { POINTS, type Quiz } from '../quiz/schema';
import { createQuiz, listQuizzes, slugify } from './api';


const blankQuiz = (title: string): Quiz => ({
  title,
  description: '',
  categories: Array.from({ length: 5 }, (_, i) => ({
    name: `Categoria ${i + 1}`,
    questions: POINTS.map((points) => ({ points, question: '', answer: '' })),
  })),
});

export default function EditorHome() {
  const [list, setList] = useState<{ slug: string; title: string }[] | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listQuizzes().then(setList, (e) => setError(e.message));
  }, []);

  const slug = slugify(title);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    try {
      await createQuiz(slug, blankQuiz(title.trim()));
      location.hash = `/${slug}`;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="page editor-home">
      <a className="back" href="/">← Gioca</a>
      <h1 className="title">Editor quiz</h1>
      <p className="muted">Le modifiche vengono salvate nella cartella <code>quizzes/</code>. Per pubblicarle fai commit e push.</p>

      <form className="new-quiz" onSubmit={create}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo del nuovo quiz…" aria-label="Titolo del nuovo quiz" />
        <button className="btn primary" disabled={!slug}>Crea quiz</button>
        {slug && <span className="muted">cartella: quizzes/{slug}</span>}
      </form>
      {error && <p className="error-text">{error}</p>}

      <h2>Quiz esistenti</h2>
      <div className="editor-list">
        {list?.map((q) => (
          <a key={q.slug} className="editor-list-item" href={`#/${q.slug}`}>
            <b>{q.title}</b>
            <span className="muted">quizzes/{q.slug}</span>
          </a>
        ))}
        {list?.length === 0 && <p className="muted">Ancora nessun quiz.</p>}
      </div>
    </div>
  );
}
