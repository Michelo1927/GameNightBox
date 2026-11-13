import { go } from '../../../hub/nav';
import {
  MAX_PER_KIND,
  pickSpecials,
  resetGame,
  settingsOf,
  SPECIAL_KINDS,
  useGame,
  type Settings,
  type SpecialKind,
  type Team,
} from '../state';
import { SPECIAL_INFO } from '../components/SpecialIntro';
import OrderWheel from '../../../hub/components/OrderWheel';
import TeamList from '../../../hub/components/TeamList';
import { useState } from 'react';

const SPECIAL_HELP: Record<SpecialKind, string> = tr(
  {
    steal: 'con la risposta giusta rubi i punti a una squadra a scelta',
    pass: "puoi passare la domanda: se l'altra squadra sbaglia, i punti sono tuoi",
    gift: 'una carta a sorpresa cambia i punteggi, poi si risponde alla domanda',
  },
  {
    steal: 'with the right answer you steal the points from a team of your choice',
    pass: 'you can pass the question: if the other team gets it wrong, the points are yours',
    gift: 'a surprise card changes the scores, then the question is played',
  },
);
import type { LoadedQuiz } from '../quiz/load';
import type { Quiz } from '../quiz/schema';
import { TIMER_CHOICES } from '../../../hub/components/Timer';
import { ask } from '../../../hub/ask';
import BackButton from '../../../hub/components/BackButton';
import { tr } from '../../../hub/i18n';

export default function Setup({ loaded }: { loaded: LoadedQuiz }) {
  const { slug, quiz } = loaded;
  const { game, setGame } = useGame(slug, quiz);
  const settings = settingsOf(game);
  const inProgress = Object.keys(game.played).length > 0 || Object.keys(game.results).length > 0;

  const restart = async () => {
    if (await ask(tr('Azzerare punteggi e caselle giocate?', 'Reset scores and played squares?'), tr('Azzera', 'Reset'))) setGame((g) => resetGame(g, quiz));
  };
  const [wheel, setWheel] = useState(false);
  const play = () => go(`/jeopardy/${slug}/play`);
  // A new game with several teams starts with the wheel that draws the order.
  const start = () => (!inProgress && game.teams.length > 1 ? setWheel(true) : play());
  const startWith = (order: Team[]) => {
    setGame((g) => ({ ...g, teams: order }));
    play();
  };
  const setSetting = (patch: Partial<Settings>) =>
    setGame((g) => {
      const next = { ...settingsOf(g), ...patch };
      if (!patch.specialCounts) return { ...g, settings: next };
      // New numbers of special cells: place them again among the cells not played yet (played ones stay).
      return { ...g, settings: next, specials: pickSpecials(quiz, next.specialCounts, g.played, g.specials) };
    });

  return (
    <div className="page setup theme-jeopardy">
      <BackButton label={tr('Tutti i quiz', 'All quizzes')} />
      <h1 className="title">{quiz.title}</h1>
      {quiz.description && <p className="muted">{quiz.description}</p>}

      <h2>{tr('Squadre', 'Teams')}</h2>
      <p className="muted">{tr("Si gioca a turno: l'ordine lo decide la ruota quando inizi la partita.", 'Teams take turns: the wheel decides the order when you start the game.')}</p>
      <TeamList teams={game.teams} onChange={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))} />

      <h2>{tr('Opzioni', 'Options')}</h2>
      <div className="options">
        <div className="option">
          <span>⏱ {tr('Durata del timer (lo avvii tu, dal tabellone o dalla domanda)', 'Timer length (you start it, from the board or the question)')}</span>
          <div className="seg">
            {TIMER_CHOICES.map((n) => (
              <button key={n} className={settings.timer === n ? 'on' : ''} onClick={() => setSetting({ timer: n })}>
                {n}s
              </button>
            ))}
          </div>
        </div>
        <p className="muted">✨ {tr('Caselle speciali, nascoste nel tabellone: quante di ognuna?', 'Special squares, hidden in the board: how many of each?')}</p>
        {SPECIAL_KINDS.map((kind) => (
          <div className="option" key={kind}>
            <span>
              {SPECIAL_INFO[kind].icon} <b>{SPECIAL_INFO[kind].name}</b>: {SPECIAL_HELP[kind]}
            </span>
            <select
              className="count-select"
              aria-label={tr(`Quante caselle ${SPECIAL_INFO[kind].name}`, `How many ${SPECIAL_INFO[kind].name} squares`)}
              value={settings.specialCounts[kind]}
              onChange={(e) => setSetting({ specialCounts: { ...settings.specialCounts, [kind]: Number(e.target.value) } })}
            >
              {Array.from({ length: MAX_PER_KIND + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n === 0 ? tr('Nessuna', 'None') : n === 1 ? tr('1 casella', '1 square') : tr(`${n} caselle`, `${n} squares`)}
                </option>
              ))}
            </select>
          </div>
        ))}
        <p className="muted">🏆 {finalInfo(quiz, game.teams.length)}</p>
      </div>

      <div className="setup-actions">
        <button className="btn primary big" onClick={start} disabled={game.teams.length === 0}>
          {inProgress ? tr('Continua la partita', 'Continue the game') : tr('Inizia la partita', 'Start the game')}
        </button>
        {inProgress && (
          <button className="btn ghost" onClick={restart}>
            {tr('Nuova partita (azzera punti)', 'New game (reset points)')}
          </button>
        )}
      </div>

      {wheel && <OrderWheel teams={game.teams} onDone={startWith} onSkip={play} onClose={() => setWheel(false)} />}
    </div>
  );
}

/** How the game ends with this many teams (see currentTurn). */
function finalInfo(quiz: Quiz, teams: number): string {
  const total = quiz.categories.reduce((n, c) => n + c.questions.length, 0);
  if (teams === 0) return '';
  const each = Math.floor(total / teams);
  const left = total - each * teams;
  const turns = tr(`Con ${teams} squadre: ${each} domande a testa`, `With ${teams} teams: ${each} questions each`);
  if (left === 0)
    return quiz.final
      ? tr(`${turns}, poi la domanda finale del quiz con le puntate.`, `${turns}, then the quiz's final question with bets.`)
      : tr(`${turns}. Questo quiz non ha una domanda finale.`, `${turns}. This quiz has no final question.`);
  if (left === 1) return tr(`${turns}; l'ultima casella rimasta è la domanda finale, con le puntate.`, `${turns}; the last square left is the final question, with bets.`);
  return tr(
    `${turns}, poi ${left - 1} per tutti; l'ultima casella rimasta è la domanda finale, con le puntate.`,
    `${turns}, then ${left - 1} open to everyone; the last square left is the final question, with bets.`,
  );
}
