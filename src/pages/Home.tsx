import { quizzes } from '../quiz/load';
import { hasSavedGame } from '../game/state';

export default function Home() {
  return (
    <div className="page home">
      <header className="home-header">
        <h1 className="logo">JEOPARDY<span>QUIZ</span></h1>
        <p className="muted">Scegli un quiz per iniziare</p>
      </header>
      <div className="quiz-grid">
        {quizzes.map(({ slug, quiz, errors }) => (
          <a key={slug} className={`quiz-card ${errors.length ? 'broken' : ''}`} href={errors.length ? undefined : `#/q/${slug}/setup`}>
            <h2>{quiz.title ?? slug}</h2>
            {quiz.description && <p className="muted">{quiz.description}</p>}
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
          </a>
        ))}
        {quizzes.length === 0 && <p className="muted">Nessun quiz trovato in quizzes/.</p>}
      </div>
    </div>
  );
}
