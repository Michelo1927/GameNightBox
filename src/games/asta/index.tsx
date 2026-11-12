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
import { MIN_THEMES, validateAsta, type AstaSet } from './schema';
import { newGame, SECONDS, TO_WIN, useAsta } from './state';
import './asta.css';

const lib = library<AstaSet>('asta', import.meta.glob('/content/asta/*.json', { eager: true, import: 'default' }), validateAsta);

const creation: Creation<AstaSet> = {
  game: 'asta',
  a: "un All'asta!",
  prefix: 'AS1.',
  lib,
  validate: validateAsta,
  summary: (d) => `${d.temi.length} temi`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Esce un tema, per esempio "Animali della savana". Le squadre, a turno, dicono quante risposte sanno dare: "ne diciamo 8", "10", "12"… oppure lasciano.</li>
    <li>Chi apre l'asta deve fare un'offerta; chi lascia è fuori fino al tema dopo. L'asta finisce quando gli altri hanno lasciato tutti, e ad aprirla è ogni volta una squadra diversa.</li>
    <li>Chi vince l'asta ha un tempo fisso (di solito 60 secondi) per dire almeno quante risposte ha promesso. L'host le conta, fidandosi: le ripetute o quelle che non vanno non contano.</li>
    <li>Ce la fa: <b>1 punto</b> a lei. Non ce la fa (o si arrende): 1 punto alla squadra che aveva fatto l'offerta prima della sua; se nessuno aveva rilanciato, nessun punto.</li>
    <li>Vince chi arriva per primo ai punti scelti (di solito 5); se i temi finiscono prima, chi ne ha di più.</li>
    <li>Host: ↑ ↓ per la cifra che dicono, Invio per confermarla, L se lasciano; durante il tempo Invio per ogni risposta giusta e Spazio per la pausa. Un tema che non piace si cambia con "Cambia tema".</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: AstaSet }) {
  const total = data.temi.length;
  const { game, setGame } = useAsta(slug, total);
  return (
    <SetupPage
      back="#/asta"
      backLabel="← Tutti gli All'asta!"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/asta/${slug}/play`)}
      onRestart={() => setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { seconds: g.seconds, toWin: g.toWin }))}
    >
      <Choice label="⏱ Tempo per dire le risposte" value={game.seconds} options={SECONDS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(seconds) => setGame((g) => ({ ...g, seconds }))} />
      <Choice label="🏆 Punti per vincere" value={game.toWin} options={TO_WIN.map((n) => ({ value: n, label: String(n) }))} onChange={(toWin) => setGame((g) => ({ ...g, toWin }))} />
      <p className="muted">
        🔨 {total} temi, in ordine casuale. Ogni tema vale 1 punto
        {total < game.toWin * game.teams.length ? `: con ${total} temi la partita potrebbe finire prima che qualcuno arrivi a ${game.toWin}, vincerebbe chi ne ha di più` : ''}.
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: AstaSet }) {
  const list = Array.isArray(data.temi) ? data.temi : [];
  return (
    <div className="as-preview">
      <b>{data.title}</b> <span className="muted">· {list.length} temi</span>
      <ol>
        {list.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ol>
    </div>
  );
}

const asta: Game = {
  id: 'asta',
  name: "All'asta!",
  icon: '🔨',
  tagline: 'Esce un tema e le squadre rilanciano su quante risposte sanno dire: chi vince l\'asta deve dirle tutte prima che scada il tempo.',
  tags: ['A squadre', 'A tempo', 'Da creare'],
  href: '#/asta',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'asta') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<AstaSet>
          back="#/asta"
          title="All'asta! con Claude"
          intro={
            <>
              Scegli il tema generale e quanti temi vuoi, copia il prompt e incollalo su <b>claude.ai</b>. Poi incolla qui la risposta: l'app
              controlla che ci siano almeno {MIN_THEMES} temi.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema generale (facoltativo)', placeholder: 'Es. cinema, cibo, anni 90…' },
            { key: 'themes', label: 'Quanti temi', type: 'number', options: [20, 30, 40, 60, 80] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. famiglia con bambini' },
          ]}
          initial={{ topic: '', themes: 40, audience: '' }}
          prompt={prompt}
          validate={validateAsta}
          preview={(d) => <Preview data={d} />}
          onPlay={(d) => go(`/asta/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('asta', normalize(d))) && go('/asta/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<AstaSet>
          game="asta"
          name="All'asta!"
          icon="🔨"
          hue={225}
          intro="Le squadre rilanciano su quante risposte sanno dire: chi vince l'asta deve dirle tutte in tempo."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.temi?.length ?? 0} temi`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default asta;
