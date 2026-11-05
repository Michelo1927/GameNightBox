import { go } from '../nav';
import { emptyGame, newTeam, TEAM_COLORS, useGame, type Team } from '../game/state';
import type { LoadedQuiz } from '../quiz/load';

export default function Setup({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const [game, setGame] = useGame(slug);
  const inProgress = Object.keys(game.played).length > 0 || Object.keys(game.results).length > 0;

  const update = (id: string, patch: Partial<Team>) =>
    setGame((g) => ({ ...g, teams: g.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const remove = (id: string) => setGame((g) => ({ ...g, teams: g.teams.filter((t) => t.id !== id) }));
  const add = () => setGame((g) => ({ ...g, teams: [...g.teams, newTeam(g.teams.length)] }));
  const restart = () => {
    if (confirm('Azzerare punteggi e caselle giocate?')) setGame((g) => ({ ...emptyGame(), teams: g.teams.map((t) => ({ ...t, adjust: 0 })) }));
  };

  return (
    <div className="page setup">
      <a className="back" href="#/">← Tutti i quiz</a>
      <h1 className="title">{quiz.title}</h1>
      {quiz.description && <p className="muted">{quiz.description}</p>}

      <h2>Squadre</h2>
      <div className="team-list">
        {game.teams.map((t) => (
          <div className="team-row" key={t.id} style={{ borderColor: t.color }}>
            <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} aria-label="Nome squadra" />
            <div className="swatches">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${c === t.color ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => update(t.id, { color: c })}
                  aria-label={`Colore ${c}`}
                />
              ))}
            </div>
            <button className="btn ghost" onClick={() => remove(t.id)} disabled={game.teams.length <= 1}>
              Rimuovi
            </button>
          </div>
        ))}
      </div>
      {game.teams.length < 10 && (
        <button className="btn ghost" onClick={add}>
          + Aggiungi squadra
        </button>
      )}

      <div className="setup-actions">
        <button className="btn primary big" onClick={() => go(`/q/${slug}/play`)} disabled={game.teams.length === 0}>
          {inProgress ? 'Continua la partita' : 'Inizia la partita'}
        </button>
        {inProgress && (
          <button className="btn ghost" onClick={restart}>
            Nuova partita (azzera punti)
          </button>
        )}
      </div>
    </div>
  );
}
