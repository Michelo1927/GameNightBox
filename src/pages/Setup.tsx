import { go } from '../nav';
import {
  MAX_PER_KIND,
  newTeam,
  pickSpecials,
  resetGame,
  settingsOf,
  SPECIAL_KINDS,
  TEAM_COLORS,
  useGame,
  type Settings,
  type SpecialKind,
  type Team,
} from '../game/state';
import { SPECIAL_INFO } from '../components/SpecialIntro';

const SPECIAL_HELP: Record<SpecialKind, string> = {
  steal: 'con la risposta giusta rubi i punti a una squadra a scelta',
  pass: "puoi passare la domanda: se l'altra squadra sbaglia, i punti sono tuoi",
  gift: 'niente domanda, una carta a sorpresa cambia i punteggi',
};
import type { LoadedQuiz } from '../quiz/load';
import type { Quiz } from '../quiz/schema';
import { TIMER_CHOICES } from '../components/Timer';

export default function Setup({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const { game, setGame } = useGame(slug, quiz);
  const settings = settingsOf(game);
  const inProgress = Object.keys(game.played).length > 0 || Object.keys(game.results).length > 0;

  const update = (id: string, patch: Partial<Team>) =>
    setGame((g) => ({ ...g, teams: g.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const remove = (id: string) => setGame((g) => ({ ...g, teams: g.teams.filter((t) => t.id !== id) }));
  const add = () => setGame((g) => ({ ...g, teams: [...g.teams, newTeam(g.teams.length)] }));
  const restart = () => {
    if (confirm('Azzerare punteggi e caselle giocate?')) setGame((g) => resetGame(g, quiz));
  };
  const move = (i: number, d: number) =>
    setGame((g) => {
      const teams = [...g.teams];
      [teams[i], teams[i + d]] = [teams[i + d], teams[i]];
      return { ...g, teams };
    });
  const shuffle = () =>
    setGame((g) => {
      const teams = [...g.teams];
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }
      return { ...g, teams };
    });
  const setSetting = (patch: Partial<Settings>) =>
    setGame((g) => {
      const next = { ...settingsOf(g), ...patch };
      if (!patch.specialCounts) return { ...g, settings: next };
      // New numbers of special cells: place them again among the cells not played yet (played ones stay).
      return { ...g, settings: next, specials: pickSpecials(quiz, next.specialCounts, g.played, g.specials) };
    });

  return (
    <div className="page setup">
      <a className="back" href="#/">← Tutti i quiz</a>
      <h1 className="title">{quiz.title}</h1>
      {quiz.description && <p className="muted">{quiz.description}</p>}

      <h2>Squadre</h2>
      <p className="muted">Si gioca a turno in quest'ordine: la prima squadra inizia.</p>
      <div className="team-list">
        {game.teams.map((t, i) => (
          <div className="team-row" key={t.id} style={{ borderColor: t.color }}>
            <span className="team-order">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta su">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === game.teams.length - 1} aria-label="Sposta giù">▼</button>
            </span>
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
      <div className="setup-row">
        {game.teams.length < 10 && (
          <button className="btn ghost" onClick={add}>
            + Aggiungi squadra
          </button>
        )}
        {game.teams.length > 1 && (
          <button className="btn ghost" onClick={shuffle}>
            🎲 Sorteggia l'ordine
          </button>
        )}
      </div>

      <h2>Opzioni</h2>
      <div className="options">
        <div className="option">
          <span>⏱ Durata del timer (lo avvii tu, dal tabellone o dalla domanda)</span>
          <div className="seg">
            {TIMER_CHOICES.map((n) => (
              <button key={n} className={settings.timer === n ? 'on' : ''} onClick={() => setSetting({ timer: n })}>
                {n}s
              </button>
            ))}
          </div>
        </div>
        <p className="muted">✨ Caselle speciali, nascoste nel tabellone: quante di ognuna?</p>
        {SPECIAL_KINDS.map((kind) => (
          <div className="option" key={kind}>
            <span>
              {SPECIAL_INFO[kind].icon} <b>{SPECIAL_INFO[kind].name}</b>: {SPECIAL_HELP[kind]}
            </span>
            <div className="seg">
              {Array.from({ length: MAX_PER_KIND + 1 }, (_, n) => (
                <button
                  key={n}
                  className={settings.specialCounts[kind] === n ? 'on' : ''}
                  onClick={() => setSetting({ specialCounts: { ...settings.specialCounts, [kind]: n } })}
                >
                  {n || 'No'}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="muted">🏆 {finalInfo(quiz, game.teams.length)}</p>
      </div>

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

/** How the game ends with this many teams (see currentTurn). */
function finalInfo(quiz: Quiz, teams: number): string {
  const total = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  if (teams === 0) return '';
  const each = Math.floor(total / teams);
  const left = total - each * teams;
  const turns = `Con ${teams} squadre: ${each} domande a testa`;
  if (left === 0) return quiz.final ? `${turns}, poi la domanda finale del quiz con le puntate.` : `${turns}. Questo quiz non ha una domanda finale.`;
  if (left === 1) return `${turns}; l'ultima casella rimasta è la domanda finale, con le puntate.`;
  return `${turns}, poi ${left - 1} per tutti; l'ultima casella rimasta è la domanda finale, con le puntate.`;
}
