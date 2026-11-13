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
import { MIN_THEMES, validateAsta, type AstaSet } from './schema';
import { newGame, SECONDS, TO_WIN, useAsta } from './state';
import './asta.css';
import { tr } from '../../hub/i18n';

const lib = library<AstaSet>('asta', import.meta.glob('/content/asta/*.json', { eager: true, import: 'default' }), validateAsta);

const creation: Creation<AstaSet> = {
  game: 'asta',
  a: tr("un All'asta!", 'a Going Once!'),
  prefix: 'AS1.',
  lib,
  validate: validateAsta,
  summary: (d) => tr(`${d.temi.length} temi`, `${d.temi.length} themes`),
  clean,
  Editor,
};

const NAME = tr("All'asta!", 'Going Once!');

const RULES_EN = (
  <ul>
    <li>A theme comes up, for example "Animals of the savannah". The teams, taking turns, say how many answers they can give: "we'll say 8", "10", "12"… or they pass.</li>
    <li>Whoever opens the auction must make a bid; whoever passes is out until the next theme. The auction ends when all the others have passed, and a different team opens it each time.</li>
    <li>The team that wins the auction has a fixed time (usually 60 seconds) to say at least as many answers as it promised. The host counts them, on trust: repeated ones or ones that don't fit don't count.</li>
    <li>They make it: <b>1 point</b> to them. They don't (or give up): 1 point to the team that bid just before them; if nobody had raised, no point.</li>
    <li>The first team to reach the chosen points (usually 5) wins; if the themes run out first, whoever has the most.</li>
    <li>Host: ↑ ↓ for the number they say, Enter to confirm it, L if they pass; during the time Enter for each right answer and Space to pause. A theme you don't like can be changed with "Change theme".</li>
  </ul>
);

const RULES_IT = (
  <ul>
    <li>Esce un tema, per esempio "Animali della savana". Le squadre, a turno, dicono quante risposte sanno dare: "ne diciamo 8", "10", "12"… oppure lasciano.</li>
    <li>Chi apre l'asta deve fare un'offerta; chi lascia è fuori fino al tema dopo. L'asta finisce quando gli altri hanno lasciato tutti, e ad aprirla è ogni volta una squadra diversa.</li>
    <li>Chi vince l'asta ha un tempo fisso (di solito 60 secondi) per dire almeno quante risposte ha promesso. L'host le conta, fidandosi: le ripetute o quelle che non vanno non contano.</li>
    <li>Ce la fa: <b>1 punto</b> a lei. Non ce la fa (o si arrende): 1 punto alla squadra che aveva fatto l'offerta prima della sua; se nessuno aveva rilanciato, nessun punto.</li>
    <li>Vince chi arriva per primo ai punti scelti (di solito 5); se i temi finiscono prima, chi ne ha di più.</li>
    <li>Host: ↑ ↓ per la cifra che dicono, Invio per confermarla, L se lasciano; durante il tempo Invio per ogni risposta giusta e Spazio per la pausa. Un tema che non piace si cambia con "Cambia tema".</li>
  </ul>
);

const RULES = tr(RULES_IT, RULES_EN);

function Setup({ slug, data }: { slug: string; data: AstaSet }) {
  const total = data.temi.length;
  const { game, setGame } = useAsta(slug, total);
  return (
    <SetupPage
      back="#/asta"
      backLabel={tr("← Tutti gli All'asta!", '← All Going Once! games')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/asta/${slug}/play`)}
      onRestart={() => setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { seconds: g.seconds, toWin: g.toWin }))}
    >
      <Choice label={tr('⏱ Tempo per dire le risposte', '⏱ Time to say the answers')} value={game.seconds} options={SECONDS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(seconds) => setGame((g) => ({ ...g, seconds }))} />
      <Choice label={tr('🏆 Punti per vincere', '🏆 Points to win')} value={game.toWin} options={TO_WIN.map((n) => ({ value: n, label: String(n) }))} onChange={(toWin) => setGame((g) => ({ ...g, toWin }))} />
      <p className="muted">
        🔨{' '}
        {tr(
          `${total} temi, in ordine casuale. Ogni tema vale 1 punto${total < game.toWin * game.teams.length ? `: con ${total} temi la partita potrebbe finire prima che qualcuno arrivi a ${game.toWin}, vincerebbe chi ne ha di più` : ''}.`,
          `${total} themes, in random order. Each theme is worth 1 point${total < game.toWin * game.teams.length ? `: with ${total} themes the game might end before anyone reaches ${game.toWin}, the team with the most would win` : ''}.`,
        )}
      </p>
    </SetupPage>
  );
}

function Preview({ data }: { data: AstaSet }) {
  const list = Array.isArray(data.temi) ? data.temi : [];
  return (
    <div className="as-preview">
      <b>{data.title}</b> <span className="muted">· {list.length} {tr('temi', 'themes')}</span>
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
  name: NAME,
  icon,
  tagline: tr(
    "Esce un tema e le squadre rilanciano su quante risposte sanno dire: chi vince l'asta deve dirle tutte prima che scada il tempo.",
    'A theme comes up and the teams bid on how many answers they can say: whoever wins the auction must say them all before time runs out.',
  ),
  tags: ['turno', 'tempo'],
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
          title={tr("All'asta! con l'IA", 'Going Once! with AI')}
          intro={
            tr(
              <>
                Scegli il tema generale e quanti temi vuoi, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la
                risposta: l'app controlla che ci siano almeno {MIN_THEMES} temi.
              </>,
              <>
                Choose the overall theme and how many themes you want, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then
                paste the answer here: the app checks there are at least {MIN_THEMES} themes.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema generale (facoltativo)', 'Overall theme (optional)'), placeholder: tr('Es. cinema, cibo, anni 90…', 'E.g. movies, food, the 90s…') },
            { key: 'themes', label: tr('Quanti temi', 'How many themes'), type: 'number', options: [20, 30, 40, 60, 80] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con bambini', 'E.g. family with children') },
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
          name={NAME}
          icon={icon}
          intro={tr("Le squadre rilanciano su quante risposte sanno dire: chi vince l'asta deve dirle tutte in tempo.", 'Teams bid on how many answers they can say: whoever wins the auction must say them all in time.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [tr(`${d.temi?.length ?? 0} temi`, `${d.temi?.length ?? 0} themes`)]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default asta;
