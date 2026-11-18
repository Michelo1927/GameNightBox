import { library } from '../../hub/library';
import icon from './icon';
import { creationRoute, type Creation } from '../../hub/creation';
import { startDraft } from '../../hub/draft';
import type { Game } from '../../hub/games';
import { go } from '../../hub/nav';
import ClaudeCreate from '../../hub/components/ClaudeCreate';
import ContentHome from '../../hub/components/ContentHome';
import SetupPage, { Choice } from '../../hub/components/SetupPage';
import Editor, { clean, normalize } from './Editor';
import Play from './Play';
import { prompt } from './prompt';
import { MIN_QUESTIONS, validateRitardo, type RitardoSet } from './schema';
import { newGame, PER_QUESTION, SECONDS, STEPS, useRitardo } from './state';
import './ritardo.css';
import { tr } from '../../hub/i18n';

const lib = library<RitardoSet>('ritardo', import.meta.glob('/content/ritardo/*.json', { eager: true, import: 'default' }), validateRitardo);

const creation: Creation<RitardoSet> = {
  game: 'ritardo',
  a: tr('un In ritardo!', 'a One Behind!'),
  prefix: 'RI1.',
  lib,
  validate: validateRitardo,
  summary: (d) => tr(`${d.domande.length} domande`, `${d.domande.length} questions`),
  clean,
  Editor,
};

/** The name is provisional: change it here (and in the texts that say it) when it's decided. */
const NAME = tr('In ritardo!', 'One Behind!');

const RULES = tr(
  <ul>
    <li>
      Arriva una domanda alla volta, ma si risponde <b>in ritardo di una</b>: per passare alla domanda dopo bisogna dire la risposta di quella{' '}
      <b>prima</b>. Es. "Quanti sono i colli di Roma?" → si dice la parola d'ordine; "Chi fu il primo re di Roma?" → si dice "7"; "Quante zampe ha
      un cane?" → si dice "Romolo"…
    </li>
    <li>Sulla prima domanda si dice la <b>parola d'ordine</b> (es. "Gamberone"); dopo l'ultima domanda resta da dire la sua risposta.</li>
    <li>
      Le squadre giocano una alla volta, ognuna con il suo tempo e la sua lista di domande. Se sbagliano si riparte <b>dalla prima domanda</b>: la
      lista è sempre la stessa, nello stesso ordine, e il tempo continua a scorrere. Si può aggiungere un tempo massimo per ogni risposta.
    </li>
    <li>L'host preme → se la risposta è giusta, ← se è sbagliata; con R vede la risposta attesa.</li>
    <li>Vince chi arriva in fondo, e tra chi ci arriva chi ha più tempo avanzato; se nessuno ci arriva, chi è arrivato più avanti. Punti: 10 per ogni risposta della serie migliore, +1 per ogni secondo avanzato.</li>
  </ul>,
  <ul>
    <li>
      One question at a time, but you answer <b>one behind</b>: to move on you must say the answer to the <b>previous</b> question. E.g. "How many
      hills is Rome built on?" → say the password; "Who was the first king of Rome?" → say "7"; "How many legs does a dog have?" → say "Romulus"…
    </li>
    <li>On the first question you say the <b>password</b> (e.g. "Big prawn"); after the last question, its answer is still to be said.</li>
    <li>
      Teams play one at a time, each with its own time and its own list of questions. A mistake sends them back <b>to the first question</b>: the
      list is always the same, in the same order, and the clock keeps running. You can add a time limit for each answer.
    </li>
    <li>The host presses → if the answer is right, ← if it is wrong; R shows the expected answer.</li>
    <li>Whoever reaches the end wins, and among those who do, whoever has the most time left; if nobody does, whoever got furthest. Points: 10 for each answer of the best run, +1 for each second left.</li>
  </ul>,
);

function Setup({ slug, data }: { slug: string; data: RitardoSet }) {
  const total = data.domande.length;
  const { game, setGame } = useRitardo(slug, total);
  return (
    <SetupPage
      back="#/ritardo"
      backLabel={tr('← Tutti gli In ritardo!', '← All One Behind! games')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/ritardo/${slug}/play`)}
      onRestart={() =>
        setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { seconds: g.seconds, steps: g.steps, perQuestion: g.perQuestion }))
      }
    >
      <Choice label={tr('❓ Domande per squadra', '❓ Questions per team')} value={game.steps} options={STEPS.map((n) => ({ value: n, label: String(n) }))} onChange={(steps) => setGame((g) => ({ ...g, steps }))} />
      <Choice label={tr('⏱ Tempo per squadra', '⏱ Time per team')} value={game.seconds} options={SECONDS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(seconds) => setGame((g) => ({ ...g, seconds }))} />
      <Choice
        label={tr('🐢 Tempo massimo per ogni risposta', '🐢 Time limit for each answer')}
        value={game.perQuestion}
        options={PER_QUESTION.map((n) => ({ value: n, label: n ? `${n}s` : tr('Nessuno', 'None') }))}
        onChange={(perQuestion) => setGame((g) => ({ ...g, perQuestion }))}
      />
      <p className="muted">
        ⏪{' '}
        {tr(
          `${total} domande. Ogni squadra ha la sua lista di ${game.steps} domande${total >= game.steps * game.teams.length ? ', diversa da quella delle altre' : ' (non bastano per darle tutte diverse alle squadre)'}, e la sua parola d'ordine.`,
          `${total} questions. Each team has its own list of ${game.steps} questions${total >= game.steps * game.teams.length ? ', different from the others' : " (not enough to give every team different ones)"}, and its own password.`,
        )}
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: RitardoSet }) {
  const list = Array.isArray(data.domande) ? data.domande : [];
  return (
    <div className="ri-preview">
      <b>{data.title}</b> <span className="muted">· {list.length} {tr('domande', 'questions')}</span>
      <ol>
        {list.map((q, i) => (
          <li key={i}>
            {q.question} <span className="muted">→</span> <b>{q.answer}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ritardo: Game = {
  id: 'ritardo',
  name: NAME,
  icon,
  tagline: tr(
    'Domande facili contro il tempo, ma si risponde sempre a quella prima: leggi la nuova e ricorda la vecchia.',
    'Easy questions against the clock, but you always answer the previous one: read the new one, remember the old one.',
  ),
  tags: ['turno', 'tempo'],
  href: '#/ritardo',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'ritardo') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<RitardoSet>
          back="#/ritardo"
          title={tr("In ritardo! con l'IA", 'One Behind! with AI')}
          intro={tr(
            <>
              Scegli tema e numero di domande, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta:
              l'app controlla che ogni domanda abbia la sua risposta, corta (ne servono almeno {MIN_QUESTIONS}).
            </>,
            <>
              Choose a theme and the number of questions, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then paste the
              answer here: the app checks that every question has its own short answer (at least {MIN_QUESTIONS} are needed).
            </>,
          )}
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. geografia, sport, film…', 'E.g. geography, sport, films…') },
            { key: 'questions', label: tr('Quante domande', 'How many questions'), type: 'number', options: [40, 60, 80, 100, 150] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con bambini', 'E.g. family with children') },
          ]}
          initial={{ topic: '', questions: 80, audience: '' }}
          prompt={prompt}
          validate={validateRitardo}
          preview={(d) => <Preview data={d} />}
          onPlay={(d) => go(`/ritardo/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('ritardo', normalize(d))) && go('/ritardo/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<RitardoSet>
          game="ritardo"
          name={NAME}
          icon={icon}
          intro={tr('Domande facili, ma si risponde sempre a quella prima.', 'Easy questions, but you always answer the previous one.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [tr(`${d.domande?.length ?? 0} domande`, `${d.domande?.length ?? 0} questions`)]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default ritardo;
