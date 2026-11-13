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
import { MAX_ANSWERS, MIN_ANSWERS, validateTopTen, type TopTenSet } from './schema';
import { newGame, startList, STRIKES, useTopTen, VALUE } from './state';
import './topten.css';
import { tr } from '../../hub/i18n';

const lib = library<TopTenSet>('topten', import.meta.glob('/content/topten/*.json', { eager: true, import: 'default' }), validateTopTen);

const creation: Creation<TopTenSet> = {
  game: 'topten',
  a: tr('una Top Ten', 'a Top Ten'),
  prefix: 'TT1.',
  lib,
  validate: validateTopTen,
  summary: (d) => tr(`${d.liste.length} liste`, `${d.liste.length} lists`),
  clean,
  Editor,
};

const RULES_EN = (
  <ul>
    <li>Each list is a real ranking (e.g. "The 10 longest rivers in Europe") with the answers covered on the board. Each answer found is worth {VALUE} points, which go <b>into the pot</b>.</li>
    <li><b>Face-off</b>: every team buzzes in (one key per team, e.g. {BUZZ_KEYS.slice(0, 2).join(' and ')}, or the host decides). The first team to name an answer on the board plays the list; whoever is wrong is out of the face-off.</li>
    <li><b>Play</b>: the team says one answer at a time. The host types it and presses Enter: the app checks whether it's on the list (it allows one typo and alternative names).</li>
    <li>If the team finds every answer it takes the pot. With 3 mistakes (chosen beforehand: 2-4) the list passes to the other teams.</li>
    <li><b>Steal</b>: the other teams buzz in and have one answer each. Whoever gets one right steals the whole pot; if nobody does, it stays with the team that was playing.</li>
    <li>At the end of the list the host reveals the missing answers. The team with the most points after the last list wins.</li>
  </ul>
);

const RULES_IT = (
  <ul>
    <li>Ogni lista è una classifica vera (es. "I 10 fiumi più lunghi d'Italia") con le risposte coperte sul tabellone. Ogni risposta trovata vale {VALUE} punti, che vanno <b>in palio</b>.</li>
    <li><b>Sfida</b>: tutte le squadre si prenotano (un tasto per squadra, es. {BUZZ_KEYS.slice(0, 2).join(' e ')}, oppure decide l'host). La prima che dice una risposta del tabellone gioca la lista; chi sbaglia è fuori dalla sfida.</li>
    <li><b>Gioco</b>: la squadra dice una risposta alla volta. L'host la scrive e preme Invio: l'app controlla se è nella lista (accetta un errore di battitura e i nomi alternativi).</li>
    <li>Se trova tutte le risposte prende i punti in palio. Con 3 errori (si sceglie prima: 2-4) la lista passa alle altre squadre.</li>
    <li><b>Rubata</b>: le altre squadre si prenotano e hanno una sola risposta a testa. Chi indovina ruba tutti i punti in palio; se nessuno ci riesce, restano alla squadra che giocava.</li>
    <li>A fine lista l'host svela le risposte mancanti. Vince chi ha più punti dopo l'ultima lista.</li>
  </ul>
);

const RULES = tr(RULES_IT, RULES_EN);

function Setup({ slug, data }: { slug: string; data: TopTenSet }) {
  const { game, setGame } = useTopTen(slug, data.liste[0]);
  return (
    <SetupPage
      back="#/topten"
      backLabel={tr('← Tutte le Top Ten', '← All Top Tens')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/topten/${slug}/play`)}
      onRestart={() =>
        setGame((g) => startList(newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { buzz: g.buzz, maxStrikes: g.maxStrikes }), data.liste[0], 0))
      }
    >
      <Choice label={tr('🔔 Prenotazione', '🔔 Buzzing in')} value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      {game.buzz === 'keys' && <p className="muted">{tr('Tasti', 'Keys')}: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}</p>}
      <Choice
        label={tr('✕ Errori prima della rubata', '✕ Mistakes before the steal')}
        value={game.maxStrikes}
        options={STRIKES.map((n) => ({ value: n, label: String(n) }))}
        onChange={(maxStrikes) => setGame((g) => ({ ...g, maxStrikes }))}
      />
      <p className="muted">
        🔟 {tr(`${data.liste.length} liste, ${VALUE} punti per ogni risposta trovata.`, `${data.liste.length} lists, ${VALUE} points for each answer found.`)}
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: TopTenSet }) {
  return (
    <div className="tt-preview">
      <b>{data.title}</b>
      {(Array.isArray(data.liste) ? data.liste : []).map((l, i) => (
        <div key={i}>
          <p>
            <b>{l.question}</b>
            {l.source && <span className="muted"> · {l.source}</span>}
          </p>
          <ol>
            {(Array.isArray(l.answers) ? l.answers : []).map((a, j) => (
              <li key={j}>
                {a.text}
                {a.note && <span className="muted"> · {a.note}</span>}
                {!!a.also?.length && <span className="muted"> ({tr('anche', 'also')}: {a.also.join(', ')})</span>}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

const topten: Game = {
  id: 'topten',
  name: 'Top Ten',
  icon,
  tagline: tr(
    'Classifiche vere da indovinare: chi vince la sfida gioca la lista, ma con troppi errori si fa rubare i punti.',
    'Real rankings to guess: whoever wins the face-off plays the list, but with too many mistakes the points get stolen.',
  ),
  tags: ['prenotazione', 'rubata'],
  href: '#/topten',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'topten') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<TopTenSet>
          back="#/topten"
          title={tr("Top Ten con l'IA", 'Top Ten with AI')}
          intro={
            tr(
              <>
                Scegli tema e numero di liste, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>) (meglio con la ricerca web attiva,
                così controlla le classifiche). Poi incolla qui la risposta: l'app controlla che ogni lista abbia da {MIN_ANSWERS} a {MAX_ANSWERS} risposte.
              </>,
              <>
                Choose a theme and the number of lists, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>) (better with web
                search on, so it checks the rankings). Then paste the answer here: the app checks that every list has {MIN_ANSWERS} to {MAX_ANSWERS} answers.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. geografia, calcio, cinema, cibo…', 'E.g. geography, football, movies, food…') },
            { key: 'lists', label: tr('Quante liste', 'How many lists'), type: 'number', options: [3, 4, 5, 6, 8, 10] },
            { key: 'answers', label: tr('Risposte per lista', 'Answers per list'), type: 'number', options: [5, 6, 7, 8, 9, 10] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con ragazzi', 'E.g. family with teenagers') },
          ]}
          initial={{ topic: '', lists: 6, answers: 10, audience: '' }}
          prompt={prompt}
          validate={validateTopTen}
          preview={(d) => <Preview data={d} />}
          onPlay={(d) => go(`/topten/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('topten', normalize(d))) && go('/topten/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<TopTenSet>
          game="topten"
          name="Top Ten"
          icon={icon}
          intro={tr('Classifiche vere: trovate tutte le risposte prima di finire gli errori.', 'Real rankings: find every answer before you run out of mistakes.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [tr(`${d.liste?.length ?? 0} liste`, `${d.liste?.length ?? 0} lists`)]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default topten;
