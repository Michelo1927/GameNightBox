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
import { LETTERS_EN, LETTERS_IT, validatePassaparola, type Passaparola } from './schema';
import { newGame, SECONDS, usePassaparola } from './state';
import './passaparola.css';
import { tr } from '../../hub/i18n';

const lib = library<Passaparola>(
  'passaparola',
  import.meta.glob('/content/passaparola/*.json', { eager: true, import: 'default' }),
  validatePassaparola,
);

const creation: Creation<Passaparola> = {
  game: 'passaparola',
  a: tr('un Passaparola', 'an Alphabet Wheel'),
  prefix: 'PP1.',
  lib,
  validate: validatePassaparola,
  summary: (d) => tr(`${d.ruote.length} ruote`, `${d.ruote.length} wheels`),
  clean,
  Editor,
};

const NAME = tr('Passaparola', 'Alphabet Wheel');

const RULES_EN = (
  <ul>
    <li>
      Each team has its own wheel with every letter of the alphabet ({LETTERS_EN.length}; {LETTERS_IT.length} in Italian games) and a time
      limit. The teams play one after the other.
    </li>
    <li>For each letter there is a clue: the answer <b>starts</b> with that letter (or <b>contains</b> it, when it says so).</li>
    <li>The team answers out loud, the host presses <b>Reveal</b> and then ✓ or ✗. If the answer is obvious they can press ✓ straight away.</li>
    <li><b>Pass</b>: the letter is skipped and you come back to it on the next round. With a mistake the letter turns red and can't be won back.</li>
    <li>The clock stops when the answer is revealed. The team with the most green letters wins.</li>
    <li>The host can correct a letter by clicking it on the wheel (none → right → wrong) and undo with Ctrl+Z.</li>
  </ul>
);

const RULES_IT = (
  <ul>
    <li>Ogni squadra ha la sua ruota di {LETTERS_IT.length} lettere e un tempo a disposizione. Le squadre giocano una dopo l'altra.</li>
    <li>Per ogni lettera c'è una definizione: la risposta <b>inizia</b> con quella lettera (o la <b>contiene</b>, se è scritto).</li>
    <li>La squadra risponde ad alta voce, l'host preme <b>Svela</b> e poi ✓ o ✗. Se la risposta è ovvia può premere subito ✓.</li>
    <li><b>Passaparola</b>: si salta la lettera e ci si torna al giro dopo. Con l'errore la lettera diventa rossa e non si recupera.</li>
    <li>Il tempo si ferma quando si svela la risposta. Vince chi ha più lettere verdi.</li>
    <li>L'host può correggere una lettera cliccandola sulla ruota (nessuna → giusta → sbagliata) e annullare con Ctrl+Z.</li>
  </ul>
);

const RULES = tr(RULES_IT, RULES_EN);

function Setup({ slug, data }: { slug: string; data: Passaparola }) {
  const { game, setGame } = usePassaparola(slug);
  const max = data.ruote.length;
  return (
    <SetupPage
      back="#/passaparola"
      backLabel={tr('← Tutti i Passaparola', '← All Alphabet Wheels')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      maxTeams={max}
      started={game.started}
      onPlay={() => go(`/passaparola/${slug}/play`)}
      onRestart={() => setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), g.seconds))}
      blocked={
        game.teams.length > max
          ? tr(`Questo Passaparola ha ${max} ruote: al massimo ${max} squadre.`, `This Alphabet Wheel has ${max} wheels: at most ${max} teams.`)
          : undefined
      }
    >
      <Choice
        label={tr('⏱ Tempo per ogni squadra', '⏱ Time for each team')}
        value={game.seconds}
        options={SECONDS.map((s) => ({ value: s, label: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }))}
        onChange={(seconds) =>
          setGame((g) => ({
            ...g,
            seconds,
            // Wheels not started yet get the new time.
            runs: Object.fromEntries(Object.entries(g.runs).map(([id, r]) => [id, Object.keys(r.marks).length ? r : { ...r, timeLeft: seconds * 1000 }])),
          }))
        }
      />
      <p className="muted">🎡 {tr(`Ruote disponibili: ${max}. Ogni squadra gioca la sua, nell'ordine.`, `Wheels available: ${max}. Each team plays its own, in order.`)}</p>
    </SetupPage>
  );
}

const passaparola: Game = {
  id: 'passaparola',
  name: NAME,
  icon,
  tagline: tr(
    'Una ruota di 21 lettere per squadra: una definizione per lettera, contro il tempo.',
    'A 26-letter wheel per team: one clue per letter, against the clock.',
  ),
  tags: ['turno', 'tempo'],
  href: '#/passaparola',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'passaparola') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<Passaparola>
          back="#/passaparola"
          title={tr("Passaparola con l'IA", 'Alphabet Wheel with AI')}
          intro={
            tr(
              <>
                Scegli tema e numero di squadre, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta:
                l'app controlla che ogni risposta inizi (o contenga) la lettera giusta.
              </>,
              <>
                Choose a theme and the number of teams, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then paste the
                answer here: the app checks that every answer starts with (or contains) the right letter.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. cultura generale, cinema, anni 90…', 'E.g. general knowledge, movies, the 90s…') },
            { key: 'teams', label: tr('Quante squadre (una ruota ciascuna)', 'How many teams (one wheel each)'), type: 'number', options: [1, 2, 3, 4, 5, 6] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. amici tra i 25 e i 35 anni', 'E.g. friends between 25 and 35') },
          ]}
          initial={{ topic: '', teams: 2, audience: '' }}
          prompt={prompt}
          validate={validatePassaparola}
          preview={(d) => (
            <p className="muted" style={{ margin: 0 }}>
              <b>{d.title}</b> · {Array.isArray(d.ruote) ? d.ruote.length : 0} {tr('ruote', 'wheels')}
            </p>
          )}
          onPlay={(d) => go(`/passaparola/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('passaparola', normalize(d))) && go('/passaparola/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<Passaparola>
          game="passaparola"
          name={NAME}
          icon={icon}
          intro={tr('Una ruota per squadra, una definizione per ogni lettera.', 'One wheel per team, one clue for each letter.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => tr([`${d.ruote?.length ?? 0} ruote`, `max ${d.ruote?.length ?? 0} squadre`], [`${d.ruote?.length ?? 0} wheels`, `max ${d.ruote?.length ?? 0} teams`])}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default passaparola;
