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
import { MAX_ANSWERS, MIN_ANSWERS, validateTopTen, type TopTenSet } from './schema';
import { newGame, startList, STRIKES, useTopTen, VALUE } from './state';
import './topten.css';

const lib = library<TopTenSet>('topten', import.meta.glob('/content/topten/*.json', { eager: true, import: 'default' }), validateTopTen);

const creation: Creation<TopTenSet> = {
  game: 'topten',
  a: 'una Top Ten',
  prefix: 'TT1.',
  lib,
  validate: validateTopTen,
  summary: (d) => `${d.liste.length} liste`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Ogni lista è una classifica vera (es. "I 10 fiumi più lunghi d'Italia") con le risposte coperte sul tabellone. Ogni risposta trovata vale {VALUE} punti, che vanno <b>in palio</b>.</li>
    <li><b>Sfida</b>: tutte le squadre si prenotano (un tasto per squadra, es. {BUZZ_KEYS.slice(0, 2).join(' e ')}, oppure decide l'host). La prima che dice una risposta del tabellone gioca la lista; chi sbaglia è fuori dalla sfida.</li>
    <li><b>Gioco</b>: la squadra dice una risposta alla volta. L'host la scrive e preme Invio: l'app controlla se è nella lista (accetta un errore di battitura e i nomi alternativi).</li>
    <li>Se trova tutte le risposte prende i punti in palio. Con 3 errori (si sceglie prima: 2-4) la lista passa alle altre squadre.</li>
    <li><b>Rubata</b>: le altre squadre si prenotano e hanno una sola risposta a testa. Chi indovina ruba tutti i punti in palio; se nessuno ci riesce, restano alla squadra che giocava.</li>
    <li>A fine lista l'host svela le risposte mancanti. Vince chi ha più punti dopo l'ultima lista.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: TopTenSet }) {
  const { game, setGame } = useTopTen(slug, data.liste[0]);
  return (
    <SetupPage
      back="#/topten"
      backLabel="← Tutte le Top Ten"
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
      <Choice label="🔔 Prenotazione" value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      {game.buzz === 'keys' && <p className="muted">Tasti: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}</p>}
      <Choice
        label="✕ Errori prima della rubata"
        value={game.maxStrikes}
        options={STRIKES.map((n) => ({ value: n, label: String(n) }))}
        onChange={(maxStrikes) => setGame((g) => ({ ...g, maxStrikes }))}
      />
      <p className="muted">🔟 {data.liste.length} liste, {VALUE} punti per ogni risposta trovata.</p>
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
                {!!a.also?.length && <span className="muted"> (anche: {a.also.join(', ')})</span>}
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
  tagline: 'Classifiche vere da indovinare: chi vince la sfida gioca la lista, ma con troppi errori si fa rubare i punti.',
  tags: ['prenotazione'],
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
          title="Top Ten con l'IA"
          intro={
            <>
              Scegli tema e numero di liste, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>) (meglio con la ricerca web attiva, così controlla
              le classifiche). Poi incolla qui la risposta: l'app controlla che ogni lista abbia da {MIN_ANSWERS} a {MAX_ANSWERS} risposte.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema (facoltativo)', placeholder: 'Es. geografia, calcio, cinema, cibo…' },
            { key: 'lists', label: 'Quante liste', type: 'number', options: [3, 4, 5, 6, 8, 10] },
            { key: 'answers', label: 'Risposte per lista', type: 'number', options: [5, 6, 7, 8, 9, 10] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. famiglia con ragazzi' },
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
          hue={90}
          intro="Classifiche vere: trovate tutte le risposte prima di finire gli errori."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.liste?.length ?? 0} liste`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default topten;
