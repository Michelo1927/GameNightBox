import { BUZZ_KEYS, BUZZ_MODES } from '../../hub/buzzer';
import icon from './icon';
import { library } from '../../hub/library';
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
import { tr } from '../../hub/i18n';

const lib = library<InFilaSet>('infila', import.meta.glob('/content/infila/*.json', { eager: true, import: 'default' }), validateInFila);

const creation: Creation<InFilaSet> = {
  game: 'infila',
  a: tr('un In fila!', 'an In Order!'),
  prefix: 'IF1.',
  lib,
  validate: validateInFila,
  summary: (d) => tr(`${d.sequenze.length} sequenze`, `${d.sequenze.length} sequences`),
  clean,
  Editor,
};

const NAME = tr('In fila!', 'In Order!');

const RULES_EN = (
  <ul>
    <li>Each sequence is a question (e.g. "When did these things happen?") with {MIN_CARDS}-{MAX_CARDS} shuffled cards, to put in a row from one end to the other (e.g. from the oldest to the most recent).</li>
    <li>Teams play one sequence each, taking turns. The team whose turn it is says the full order and the host taps the cards in that order (if there's a time limit, it starts with T).</li>
    <li>Points: {VALUE} for each card in the right place, +{BONUS} if the whole order is right.</li>
    <li><b>Steal</b>: if the order isn't all right, the screen says how many cards are in the right place, but not which. The other teams buzz in (one key per team, e.g. {BUZZ_KEYS.slice(0, 2).join(' and ')}, or the host decides) and change the order as they like: if it's all right they take all the points, otherwise the next one can try.</li>
    <li>If nobody steals, the team whose turn it was takes the points for its right cards. At the end the right order is shown, with the values. The team with the most points after the last sequence wins.</li>
  </ul>
);

const RULES_IT = (
  <ul>
    <li>Ogni sequenza è una domanda (es. "Quando sono successe queste cose?") con {MIN_CARDS}-{MAX_CARDS} carte mescolate, da mettere in fila da un capo all'altro (es. dal più vecchio al più recente).</li>
    <li>Le squadre giocano una sequenza a testa, a turno. La squadra di turno dice l'ordine completo e l'host tocca le carte in quell'ordine (se c'è il tempo, parte con T).</li>
    <li>Punti: {VALUE} per ogni carta al posto giusto, +{BONUS} se l'ordine è tutto giusto.</li>
    <li><b>Rubata</b>: se l'ordine non è tutto giusto, lo schermo dice quante carte sono al posto giusto, ma non quali. Le altre squadre si prenotano (un tasto per squadra, es. {BUZZ_KEYS.slice(0, 2).join(' e ')}, oppure decide l'host) e cambiano l'ordine come vogliono: se è tutto giusto prendono tutti i punti, altrimenti può provare la prossima.</li>
    <li>Se nessuno ruba, la squadra di turno prende i punti delle sue carte giuste. Alla fine si vede l'ordine giusto, con i valori. Vince chi ha più punti dopo l'ultima sequenza.</li>
  </ul>
);

const RULES = tr(RULES_IT, RULES_EN);

function Setup({ slug, data }: { slug: string; data: InFilaSet }) {
  const { game, setGame } = useInFila(slug, data.sequenze[0]);
  const total = data.sequenze.length;
  const played = playedCount(total, game.teams.length);
  const each = game.teams.length ? Math.floor(played / game.teams.length) : 0;
  return (
    <SetupPage
      back="#/infila"
      backLabel={tr('← Tutti gli In fila!', '← All In Order! games')}
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
      <Choice label={tr('🔔 Prenotazione per la rubata', '🔔 Buzzing in for the steal')} value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      {game.buzz === 'keys' && <p className="muted">{tr('Tasti', 'Keys')}: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}</p>}
      <Choice
        label={tr("⏱ Tempo per dire l'ordine (parte con T)", '⏱ Time to say the order (starts with T)')}
        value={game.seconds}
        options={SECONDS.map((n) => ({ value: n, label: n ? `${n}s` : tr('Senza', 'None') }))}
        onChange={(seconds) => setGame((g) => ({ ...g, seconds }))}
      />
      <p className="muted">
        ↔️{' '}
        {tr(
          `${total} sequenze${each > 0 ? `: ${each} a squadra` : ''}${played < total ? ` (${total - played} restano fuori, per darne tante a ognuna)` : ''}. ${VALUE} punti per carta al posto giusto, +${BONUS} se è tutto giusto.`,
          `${total} sequences${each > 0 ? `: ${each} per team` : ''}${played < total ? ` (${total - played} left out, so each team gets the same number)` : ''}. ${VALUE} points per card in the right place, +${BONUS} if it's all right.`,
        )}
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
  name: NAME,
  icon,
  tagline: tr(
    'Carte mescolate da rimettere in ordine: date, altezze, distanze... Chi sbaglia si fa rubare i punti.',
    'Shuffled cards to put back in order: dates, heights, distances... Get it wrong and the points get stolen.',
  ),
  tags: ['turno', 'rubata'],
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
          title={tr("In fila! con l'IA", 'In Order! with AI')}
          intro={
            tr(
              <>
                Scegli tema e numero di sequenze, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>) (meglio con la ricerca web
                attiva, così controlla i valori). Poi incolla qui la risposta: l'app controlla che ogni sequenza abbia da {MIN_CARDS} a {MAX_CARDS} carte,
                ognuna con il suo valore, e che i valori tornino con l'ordine.
              </>,
              <>
                Choose a theme and the number of sequences, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>) (better with web
                search on, so it checks the values). Then paste the answer here: the app checks that every sequence has {MIN_CARDS} to {MAX_CARDS} cards,
                each with its value, and that the values match the order.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. storia, cinema, geografia, animali…', 'E.g. history, movies, geography, animals…') },
            { key: 'sequences', label: tr('Quante sequenze', 'How many sequences'), type: 'number', options: [4, 6, 8, 10, 12] },
            { key: 'cards', label: tr('Carte per sequenza', 'Cards per sequence'), type: 'number', options: [4, 5, 6, 7, 8] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con ragazzi', 'E.g. family with teenagers') },
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
          name={NAME}
          icon={icon}
          intro={tr("Rimettete le carte in ordine, da un capo all'altro della fila.", 'Put the cards back in order, from one end of the row to the other.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [tr(`${d.sequenze?.length ?? 0} sequenze`, `${d.sequenze?.length ?? 0} sequences`)]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default infila;
