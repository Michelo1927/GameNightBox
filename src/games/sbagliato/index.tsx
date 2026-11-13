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

const lib = library<SbagliatoSet>('sbagliato', import.meta.glob('/content/sbagliato/*.json', { eager: true, import: 'default' }), validateSbagliato);

const creation: Creation<SbagliatoSet> = {
  game: 'sbagliato',
  a: 'uno Sbagliato!',
  prefix: 'SB1.',
  lib,
  validate: validateSbagliato,
  summary: (d) => `${d.domande.length} domande`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Ogni domanda ha due risposte, una vera e una falsa (es. "È più alto un albero o un fiore?"). La squadra deve dire <b>quella sbagliata</b>.</li>
    <li>Le squadre giocano una alla volta, ognuna con il suo tempo (di solito 150 secondi) e la sua lista di domande (di solito 22), da sbagliare tutte <b>di fila</b>.</li>
    <li>Se dicono la risposta vera, o ci mettono troppo (lo decide l'host), si riparte <b>dalla prima domanda</b>: la lista è sempre la stessa, nello stesso ordine, e il tempo continua a scorrere.</li>
    <li>L'host preme ← o → per la risposta che dicono (l'app sa qual è quella vera), X se sono troppo lenti, Spazio per la pausa.</li>
    <li>Vince chi arriva in fondo, e tra chi ci arriva chi ha più tempo avanzato; se nessuno ci arriva, chi è arrivato più vicino. Punti: 10 per ogni passo della serie migliore, +1 per ogni secondo avanzato.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: SbagliatoSet }) {
  const total = data.domande.length;
  const { game, setGame } = useSbagliato(slug, total);
  return (
    <SetupPage
      back="#/sbagliato"
      backLabel="← Tutti gli Sbagliato!"
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
      <Choice label="🎯 Risposte sbagliate di fila per finire" value={game.steps} options={STEPS.map((n) => ({ value: n, label: String(n) }))} onChange={(steps) => setGame((g) => ({ ...g, steps }))} />
      <Choice label="⏱ Tempo per squadra" value={game.seconds} options={SECONDS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(seconds) => setGame((g) => ({ ...g, seconds }))} />
      <Choice
        label="🐢 Avviso &quot;troppo lento&quot; per l'host dopo"
        value={game.hint}
        options={HINTS.map((n) => ({ value: n, label: n ? `${n}s` : 'Mai' }))}
        onChange={(hint) => setGame((g) => ({ ...g, hint }))}
      />
      <p className="muted">
        ❌ {total} domande. Ogni squadra ha la sua lista di {game.steps} domande
        {total >= game.steps * game.teams.length ? ', diversa da quella delle altre' : ' (non bastano per darle tutte diverse alle squadre)'}.
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: SbagliatoSet }) {
  const list = Array.isArray(data.domande) ? data.domande : [];
  return (
    <div className="sb-preview">
      <b>{data.title}</b> <span className="muted">· {list.length} domande</span>
      <ol>
        {list.map((q, i) => (
          <li key={i}>
            {q.question} <span className="muted">→ dire</span> <b>{q.other}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

const sbagliato: Game = {
  id: 'sbagliato',
  name: 'Sbagliato!',
  icon,
  tagline: 'Domande facilissime a raffica: bisogna dire la risposta sbagliata, tante volte di fila, contro il tempo.',
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
          title="Sbagliato! con l'IA"
          intro={
            <>
              Scegli tema e numero di domande, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta: l'app controlla che
              ogni domanda abbia la risposta vera e quella da dire (ne servono almeno {MIN_QUESTIONS}).
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema (facoltativo)', placeholder: 'Es. animali, cibo, cose di casa…' },
            { key: 'questions', label: 'Quante domande', type: 'number', options: [60, 80, 100, 150, 200] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. famiglia con bambini' },
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
          name="Sbagliato!"
          icon={icon}
          intro="Domande facilissime a raffica: dite la risposta sbagliata."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.domande?.length ?? 0} domande`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default sbagliato;
