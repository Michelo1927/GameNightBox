import { BUZZ_KEYS, BUZZ_MODES } from '../../hub/buzzer';
import icon from './icon';
import { library } from '../../hub/content';
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
import { MAX_CARDS, MIN_CARDS, validateInFila, type InFilaSet } from './schema';
import { BONUS, newGame, playedCount, SECONDS, startSequence, useInFila, VALUE } from './state';
import './infila.css';

const lib = library<InFilaSet>('infila', import.meta.glob('/content/infila/*.json', { eager: true, import: 'default' }), validateInFila);

const creation: Creation<InFilaSet> = {
  game: 'infila',
  a: 'un In fila!',
  prefix: 'IF1.',
  lib,
  validate: validateInFila,
  summary: (d) => `${d.sequenze.length} sequenze`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Ogni sequenza è una domanda (es. "Quando sono successe queste cose?") con {MIN_CARDS}-{MAX_CARDS} carte mescolate, da mettere in fila da un capo all'altro (es. dal più vecchio al più recente).</li>
    <li>Le squadre giocano una sequenza a testa, a turno. La squadra di turno dice l'ordine completo e l'host tocca le carte in quell'ordine (se c'è il tempo, parte con T).</li>
    <li>Punti: {VALUE} per ogni carta al posto giusto, +{BONUS} se l'ordine è tutto giusto.</li>
    <li><b>Rubata</b>: se l'ordine non è tutto giusto, lo schermo dice quante carte sono al posto giusto, ma non quali. Le altre squadre si prenotano (un tasto per squadra, es. {BUZZ_KEYS.slice(0, 2).join(' e ')}, oppure decide l'host) e cambiano l'ordine come vogliono: se è tutto giusto prendono tutti i punti, altrimenti può provare la prossima.</li>
    <li>Se nessuno ruba, la squadra di turno prende i punti delle sue carte giuste. Alla fine si vede l'ordine giusto, con i valori. Vince chi ha più punti dopo l'ultima sequenza.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: InFilaSet }) {
  const { game, setGame } = useInFila(slug, data.sequenze[0]);
  const total = data.sequenze.length;
  const played = playedCount(total, game.teams.length);
  const each = game.teams.length ? Math.floor(played / game.teams.length) : 0;
  return (
    <SetupPage
      back="#/infila"
      backLabel="← Tutti gli In fila!"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/infila/${slug}/play`)}
      onRestart={() =>
        setGame((g) => startSequence(newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { buzz: g.buzz, seconds: g.seconds }), data.sequenze[0], 0))
      }
    >
      <Choice label="🔔 Prenotazione per la rubata" value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      {game.buzz === 'keys' && <p className="muted">Tasti: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}</p>}
      <Choice
        label="⏱ Tempo per dire l'ordine (parte con T)"
        value={game.seconds}
        options={SECONDS.map((n) => ({ value: n, label: n ? `${n}s` : 'Senza' }))}
        onChange={(seconds) => setGame((g) => ({ ...g, seconds }))}
      />
      <p className="muted">
        ↔️ {total} sequenze
        {each > 0 ? `: ${each} a squadra` : ''}
        {played < total ? ` (${total - played} restano fuori, per darne tante a ognuna)` : ''}. {VALUE} punti per carta al posto giusto, +{BONUS} se è tutto giusto.
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: InFilaSet }) {
  return (
    <div className="if-preview">
      <b>{data.title}</b>
      {(Array.isArray(data.sequenze) ? data.sequenze : []).map((s, i) => (
        <div key={i}>
          <p>
            <b>{s.question}</b> <span className="muted">· {s.first} → {s.last}</span>
            {s.source && <span className="muted"> · {s.source}</span>}
          </p>
          <ol>
            {(Array.isArray(s.cards) ? s.cards : []).map((c, j) => (
              <li key={j}>
                {c.text} <span className="muted">· {c.value}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

const infila: Game = {
  id: 'infila',
  name: 'In fila!',
  icon,
  tagline: "Carte mescolate da rimettere in ordine: date, altezze, distanze... Chi sbaglia si fa rubare i punti.",
  tags: ['A squadre', 'Rubata', 'Da creare'],
  href: '#/infila',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'infila') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<InFilaSet>
          back="#/infila"
          title="In fila! con l'IA"
          intro={
            <>
              Scegli tema e numero di sequenze, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>) (meglio con la ricerca web attiva, così controlla i
              valori). Poi incolla qui la risposta: l'app controlla che ogni sequenza abbia da {MIN_CARDS} a {MAX_CARDS} carte, ognuna con il suo
              valore, e che i valori tornino con l'ordine.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema (facoltativo)', placeholder: 'Es. storia, cinema, geografia, animali…' },
            { key: 'sequences', label: 'Quante sequenze', type: 'number', options: [4, 6, 8, 10, 12] },
            { key: 'cards', label: 'Carte per sequenza', type: 'number', options: [4, 5, 6, 7, 8] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. famiglia con ragazzi' },
          ]}
          initial={{ topic: '', sequences: 8, cards: 5, audience: '' }}
          prompt={prompt}
          validate={validateInFila}
          preview={(d) => <Preview data={d} />}
          onPlay={(d) => go(`/infila/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('infila', normalize(d))) && go('/infila/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<InFilaSet>
          game="infila"
          name="In fila!"
          icon={icon}
          hue={165}
          intro="Rimettete le carte in ordine, da un capo all'altro della fila."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.sequenze?.length ?? 0} sequenze`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default infila;
