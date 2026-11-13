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
import { MIN_QUESTIONS, validateSbagliato, type SbagliatoSet } from './schema';
import { HINTS, newGame, SECONDS, STEPS, useSbagliato } from './state';
import './sbagliato.css';
import { tr } from '../../hub/i18n';

const lib = library<SbagliatoSet>('sbagliato', import.meta.glob('/content/sbagliato/*.json', { eager: true, import: 'default' }), validateSbagliato);

const creation: Creation<SbagliatoSet> = {
  game: 'sbagliato',
  a: tr('uno Sbagliato!', 'a Wrong Answer!'),
  prefix: 'SB1.',
  lib,
  validate: validateSbagliato,
  summary: (d) => tr(`${d.domande.length} domande`, `${d.domande.length} questions`),
  clean,
  Editor,
};

const NAME = tr('Sbagliato!', 'Wrong Answer!');

const RULES_EN = (
  <ul>
    <li>Each question has two answers, one true and one false (e.g. "Which is taller, a tree or a flower?"). The team must say <b>the wrong one</b>.</li>
    <li>Teams play one at a time, each with its own time (usually 150 seconds) and its own list of questions (usually 22), to get all wrong <b>in a row</b>.</li>
    <li>If they say the true answer, or take too long (the host decides), they start again <b>from the first question</b>: the list is always the same, in the same order, and the clock keeps running.</li>
    <li>The host presses ← or → for the answer they say (the app knows which one is true), X if they're too slow, Space to pause.</li>
    <li>Whoever reaches the end wins, and among those who do, whoever has the most time left; if nobody does, whoever got closest. Points: 10 for each step of the best run, +1 for each second left.</li>
  </ul>
);

const RULES_IT = (
  <ul>
    <li>Ogni domanda ha due risposte, una vera e una falsa (es. "È più alto un albero o un fiore?"). La squadra deve dire <b>quella sbagliata</b>.</li>
    <li>Le squadre giocano una alla volta, ognuna con il suo tempo (di solito 150 secondi) e la sua lista di domande (di solito 22), da sbagliare tutte <b>di fila</b>.</li>
    <li>Se dicono la risposta vera, o ci mettono troppo (lo decide l'host), si riparte <b>dalla prima domanda</b>: la lista è sempre la stessa, nello stesso ordine, e il tempo continua a scorrere.</li>
    <li>L'host preme ← o → per la risposta che dicono (l'app sa qual è quella vera), X se sono troppo lenti, Spazio per la pausa.</li>
    <li>Vince chi arriva in fondo, e tra chi ci arriva chi ha più tempo avanzato; se nessuno ci arriva, chi è arrivato più vicino. Punti: 10 per ogni passo della serie migliore, +1 per ogni secondo avanzato.</li>
  </ul>
);

const RULES = tr(RULES_IT, RULES_EN);

function Setup({ slug, data }: { slug: string; data: SbagliatoSet }) {
  const total = data.domande.length;
  const { game, setGame } = useSbagliato(slug, total);
  return (
    <SetupPage
      back="#/sbagliato"
      backLabel={tr('← Tutti gli Sbagliato!', '← All Wrong Answer! games')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/sbagliato/${slug}/play`)}
      onRestart={() =>
        setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { seconds: g.seconds, steps: g.steps, hint: g.hint }))
      }
    >
      <Choice label={tr('🎯 Risposte sbagliate di fila per finire', '🎯 Wrong answers in a row to finish')} value={game.steps} options={STEPS.map((n) => ({ value: n, label: String(n) }))} onChange={(steps) => setGame((g) => ({ ...g, steps }))} />
      <Choice label={tr('⏱ Tempo per squadra', '⏱ Time per team')} value={game.seconds} options={SECONDS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(seconds) => setGame((g) => ({ ...g, seconds }))} />
      <Choice
        label={tr('🐢 Avviso "troppo lento" per l\'host dopo', '🐢 "Too slow" warning for the host after')}
        value={game.hint}
        options={HINTS.map((n) => ({ value: n, label: n ? `${n}s` : tr('Mai', 'Never') }))}
        onChange={(hint) => setGame((g) => ({ ...g, hint }))}
      />
      <p className="muted">
        ❌{' '}
        {tr(
          `${total} domande. Ogni squadra ha la sua lista di ${game.steps} domande${total >= game.steps * game.teams.length ? ', diversa da quella delle altre' : ' (non bastano per darle tutte diverse alle squadre)'}.`,
          `${total} questions. Each team has its own list of ${game.steps} questions${total >= game.steps * game.teams.length ? ', different from the others' : " (not enough to give every team different ones)"}.`,
        )}
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: SbagliatoSet }) {
  const list = Array.isArray(data.domande) ? data.domande : [];
  return (
    <div className="sb-preview">
      <b>{data.title}</b> <span className="muted">· {list.length} {tr('domande', 'questions')}</span>
      <ol>
        {list.map((q, i) => (
          <li key={i}>
            {q.question} <span className="muted">→ {tr('dire', 'say')}</span> <b>{q.other}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

const sbagliato: Game = {
  id: 'sbagliato',
  name: NAME,
  icon,
  tagline: tr(
    'Domande facilissime a raffica: bisogna dire la risposta sbagliata, tante volte di fila, contro il tempo.',
    'Rapid-fire super easy questions: you must say the wrong answer, many times in a row, against the clock.',
  ),
  tags: ['turno', 'tempo'],
  href: '#/sbagliato',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'sbagliato') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<SbagliatoSet>
          back="#/sbagliato"
          title={tr("Sbagliato! con l'IA", 'Wrong Answer! with AI')}
          intro={
            tr(
              <>
                Scegli tema e numero di domande, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta:
                l'app controlla che ogni domanda abbia la risposta vera e quella da dire (ne servono almeno {MIN_QUESTIONS}).
              </>,
              <>
                Choose a theme and the number of questions, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then paste the
                answer here: the app checks that every question has the true answer and the one to say (at least {MIN_QUESTIONS} are needed).
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. animali, cibo, cose di casa…', 'E.g. animals, food, household things…') },
            { key: 'questions', label: tr('Quante domande', 'How many questions'), type: 'number', options: [60, 80, 100, 150, 200] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con bambini', 'E.g. family with children') },
          ]}
          initial={{ topic: '', questions: 100, audience: '' }}
          prompt={prompt}
          validate={validateSbagliato}
          preview={(d) => <Preview data={d} />}
          onPlay={(d) => go(`/sbagliato/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('sbagliato', normalize(d))) && go('/sbagliato/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<SbagliatoSet>
          game="sbagliato"
          name={NAME}
          icon={icon}
          intro={tr('Domande facilissime a raffica: dite la risposta sbagliata.', 'Rapid-fire super easy questions: say the wrong answer.')}
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

export default sbagliato;
