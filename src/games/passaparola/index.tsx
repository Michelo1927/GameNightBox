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
import { LETTERS, validatePassaparola, type Passaparola } from './schema';
import { newGame, SECONDS, usePassaparola } from './state';
import './passaparola.css';

const lib = library<Passaparola>(
  'passaparola',
  import.meta.glob('/content/passaparola/*.json', { eager: true, import: 'default' }),
  validatePassaparola,
);

const creation: Creation<Passaparola> = {
  game: 'passaparola',
  a: 'un Passaparola',
  prefix: 'PP1.',
  lib,
  validate: validatePassaparola,
  summary: (d) => `${d.ruote.length} ruote`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Ogni squadra ha la sua ruota di {LETTERS.length} lettere e un tempo a disposizione. Le squadre giocano una dopo l'altra.</li>
    <li>Per ogni lettera c'è una definizione: la risposta <b>inizia</b> con quella lettera (o la <b>contiene</b>, se è scritto).</li>
    <li>La squadra risponde ad alta voce, l'host preme <b>Svela</b> e poi ✓ o ✗. Se la risposta è ovvia può premere subito ✓.</li>
    <li><b>Passaparola</b>: si salta la lettera e ci si torna al giro dopo. Con l'errore la lettera diventa rossa e non si recupera.</li>
    <li>Il tempo si ferma quando si svela la risposta. Vince chi ha più lettere verdi.</li>
    <li>L'host può correggere una lettera cliccandola sulla ruota (nessuna → giusta → sbagliata) e annullare con Ctrl+Z.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: Passaparola }) {
  const { game, setGame } = usePassaparola(slug);
  const max = data.ruote.length;
  return (
    <SetupPage
      back="#/passaparola"
      backLabel="← Tutti i Passaparola"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      maxTeams={max}
      started={game.started}
      onPlay={() => go(`/passaparola/${slug}/play`)}
      onRestart={() => setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), g.seconds))}
      blocked={game.teams.length > max ? `Questo Passaparola ha ${max} ruote: al massimo ${max} squadre.` : undefined}
    >
      <Choice
        label="⏱ Tempo per ogni squadra"
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
      <p className="muted">🎡 Ruote disponibili: {max}. Ogni squadra gioca la sua, nell'ordine.</p>
    </SetupPage>
  );
}

const passaparola: Game = {
  id: 'passaparola',
  name: 'Passaparola',
  icon,
  tagline: 'Una ruota di 21 lettere per squadra: una definizione per lettera, contro il tempo.',
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
          title="Passaparola con l'IA"
          intro={
            <>
              Scegli tema e numero di squadre, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta: l'app
              controlla che ogni risposta inizi (o contenga) la lettera giusta.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema (facoltativo)', placeholder: 'Es. cultura generale, cinema, anni 90…' },
            { key: 'teams', label: 'Quante squadre (una ruota ciascuna)', type: 'number', options: [1, 2, 3, 4, 5, 6] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. amici tra i 25 e i 35 anni' },
          ]}
          initial={{ topic: '', teams: 2, audience: '' }}
          prompt={prompt}
          validate={validatePassaparola}
          preview={(d) => (
            <p className="muted" style={{ margin: 0 }}>
              <b>{d.title}</b> · {Array.isArray(d.ruote) ? d.ruote.length : 0} ruote
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
          name="Passaparola"
          icon={icon}
          intro="Una ruota per squadra, una definizione per ogni lettera."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.ruote?.length ?? 0} ruote`, `max ${d.ruote?.length ?? 0} squadre`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default passaparola;
