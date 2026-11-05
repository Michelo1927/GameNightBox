import { useState } from 'react';
import { hasSavedGame } from '../game/state';
import { importedQuizzes, removeImported } from '../quiz/imported';
import { quizzes, type LoadedQuiz } from '../quiz/load';

export default function Home() {
  const [imported, setImported] = useState(importedQuizzes);
  const remove = (slug: string, title: string) => {
    if (!confirm(`Togliere "${title}" da questo dispositivo?`)) return;
    removeImported(slug);
    setImported(importedQuizzes());
  };

  return (
    <div className="page home">
      <header className="home-header">
        <h1 className="logo">JEOPARDY<span>QUIZ</span></h1>
        <p className="muted">Scegli un quiz per iniziare</p>
        <div className="home-actions">
          <a className="btn primary" href="#/crea">✏️ Crea un quiz</a>
          <a className="btn ghost" href="#/carica">📥 Carica un quiz</a>
          {import.meta.env.DEV && <a className="btn ghost" href="/editor.html">🛠 Editor (locale)</a>}
        </div>
      </header>

      {imported.length > 0 && (
        <>
          <h3>Caricati su questo dispositivo</h3>
          <div className="quiz-grid">
            {imported.map((q) => (
              <QuizCard key={q.slug} loaded={q} onRemove={() => remove(q.slug, q.quiz.title)} />
            ))}
          </div>
          <h3>Quiz del sito</h3>
        </>
      )}
      <div className="quiz-grid">
        {quizzes.map((q) => (
          <QuizCard key={q.slug} loaded={q} />
        ))}
        {quizzes.length === 0 && <p className="muted">Nessun quiz trovato in quizzes/.</p>}
      </div>
    </div>
  );
}

function QuizCard({ loaded: { slug, quiz, errors }, onRemove }: { loaded: LoadedQuiz; onRemove?: () => void }) {
  return (
    <a className={`quiz-card ${errors.length ? 'broken' : ''}`} href={errors.length ? undefined : `#/q/${slug}/setup`}>
      <h2>{quiz.title ?? slug}</h2>
      {(quiz.description || quiz.author) && <p className="muted">{quiz.description || `di ${quiz.author}`}</p>}
      {errors.length > 0 ? (
        <ul className="errors">
          {errors.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : (
        <div className="tags">
          {quiz.categories.map((c) => (
            <span key={c.name}>{c.name}</span>
          ))}
        </div>
      )}
      {!errors.length && hasSavedGame(slug) && <span className="badge">Partita in corso</span>}
      {onRemove && (
        <button
          className="remove"
          title="Togli da questo dispositivo"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
        >
          🗑
        </button>
      )}
    </a>
  );
}
