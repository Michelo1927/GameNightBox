import { BUZZ_MODES } from '../../hub/buzzer';
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
import { CHAIN_LENGTH, validateCatena, type CatenaSet } from './schema';
import { newGame, startChain, useCatena } from './state';
import './catena.css';
import { tr } from '../../hub/i18n';

const lib = library<CatenaSet>('catena', import.meta.glob('/content/catena/*.json', { eager: true, import: 'default' }), validateCatena);

const creation: Creation<CatenaSet> = {
  game: 'catena',
  a: tr('le catene', 'the chains'),
  prefix: 'CT1.',
  lib,
  validate: validateCatena,
  summary: (d) =>
    tr(
      `${d.catene.length} catene${d.finali?.length ? ` + ${d.finali.length} parole finali` : ''}`,
      `${d.catene.length} chains${d.finali?.length ? ` + ${d.finali.length} final words` : ''}`,
    ),
  clean,
  Editor,
};

const NAME = tr('Catena', 'Word Chain');

const RULES_EN = (
  <ul>
    <li>Each chain has {CHAIN_LENGTH} words linked two by two (bread → butter → peanut…). The first and the last are shown.</li>
    <li>The team whose turn it is chooses a word next to one already found and tries to guess it.</li>
    <li>The host types the answer and presses Enter: the app checks whether it's right (it allows one typo). They can also press ✓ or ✗.</li>
    <li>Right: the team takes 10 points for every letter still hidden and goes on. Wrong: a letter is revealed and the next team plays.</li>
    <li>Final (if there is one): a mystery word and five clues, one at a time. Teams buzz in with their own key, or the host decides. Fewer clues, more points; whoever gets it wrong is out for that word.</li>
  </ul>
);

const RULES = tr(
  <ul>
    <li>Ogni catena ha {CHAIN_LENGTH} parole legate a due a due (pane → burro → arachidi…). Si vedono la prima e l'ultima.</li>
    <li>La squadra di turno sceglie una parola accanto a una già scoperta e prova a indovinarla.</li>
    <li>L'host scrive la risposta e preme Invio: l'app controlla se è giusta (accetta un errore di battitura). Può anche premere ✓ o ✗.</li>
    <li>Giusta: la squadra prende 10 punti per ogni lettera ancora nascosta e continua. Sbagliata: si scopre una lettera e tocca alla squadra dopo.</li>
    <li>Finale (se c'è): una parola misteriosa e cinque indizi, uno alla volta. Ci si prenota con il proprio tasto, oppure decide l'host. Meno indizi, più punti; chi sbaglia è fuori per quella parola.</li>
  </ul>,
  RULES_EN,
);

function Setup({ slug, data }: { slug: string; data: CatenaSet }) {
  const { game, setGame } = useCatena(slug, data);
  return (
    <SetupPage
      back="#/catena"
      backLabel={tr('← Tutte le catene', '← All chains')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/catena/${slug}/play`)}
      onRestart={() => setGame((g) => startChain(newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), g.buzz), data, 0))}
    >
      {!!data.finali?.length && (
        <Choice label={tr('🔔 Prenotazione nel finale', '🔔 Buzzing in the final')} value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      )}
      <p className="muted">
        🔗{' '}
        {tr(
          `${data.catene.length} catene${data.finali?.length ? ` + finale con ${data.finali.length} parole` : ', senza finale'}.`,
          `${data.catene.length} chains${data.finali?.length ? ` + final with ${data.finali.length} words` : ', no final'}.`,
        )}
      </p>
    </SetupPage>
  );
}

const catena: Game = {
  id: 'catena',
  name: NAME,
  icon,
  tagline: tr(
    'Parole legate a due a due: si scoprono una alla volta, lettera dopo lettera. Con finale a prenotazione.',
    'Words linked two by two: found one at a time, letter by letter. With a buzz-in final.',
  ),
  tags: ['turno'],
  href: '#/catena',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'catena') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<CatenaSet>
          back="#/catena"
          title={tr("Catena con l'IA", 'Word Chain with AI')}
          intro={
            tr(
              <>
                Scegli quante catene vuoi, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta:
                l'app controlla che ogni catena abbia {CHAIN_LENGTH} parole singole.
              </>,
              <>
                Choose how many chains you want, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then paste the answer
                here: the app checks that every chain has {CHAIN_LENGTH} single words.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema (facoltativo)', 'Theme (optional)'), placeholder: tr('Es. cibo, sport, modi di dire…', 'E.g. food, sport, idioms…') },
            { key: 'chains', label: tr('Quante catene', 'How many chains'), type: 'number', options: [2, 3, 4, 5, 6, 8] },
            { key: 'finals', label: tr('Parole del finale (0 = senza finale)', 'Final words (0 = no final)'), type: 'number', options: [0, 1, 2, 3, 4, 5] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. famiglia con ragazzi', 'E.g. family with teenagers') },
          ]}
          initial={{ topic: '', chains: 4, finals: 3, audience: '' }}
          prompt={prompt}
          validate={validateCatena}
          preview={(d) => (
            <div className="ct-preview">
              <b>{d.title}</b>
              {(Array.isArray(d.catene) ? d.catene : []).map((c, i) => (
                <p key={i} className="muted">{Array.isArray(c.words) ? c.words.join(' → ') : ''}</p>
              ))}
            </div>
          )}
          onPlay={(d) => go(`/catena/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('catena', normalize(d))) && go('/catena/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<CatenaSet>
          game="catena"
          name={NAME}
          icon={icon}
          intro={tr('Parole legate a due a due: trovate quelle in mezzo.', 'Words linked two by two: find the ones in the middle.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) =>
            tr(
              [`${d.catene?.length ?? 0} catene`, d.finali?.length ? `finale da ${d.finali.length}` : 'senza finale'],
              [`${d.catene?.length ?? 0} chains`, d.finali?.length ? `final of ${d.finali.length}` : 'no final'],
            )
          }
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default catena;
