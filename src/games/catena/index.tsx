import { BUZZ_MODES } from '../../hub/buzzer';
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
import { CHAIN_LENGTH, validateCatena, type CatenaSet } from './schema';
import { newGame, startChain, useCatena } from './state';
import './catena.css';

const lib = library<CatenaSet>('catena', import.meta.glob('/content/catena/*.json', { eager: true, import: 'default' }), validateCatena);

const creation: Creation<CatenaSet> = {
  game: 'catena',
  a: 'le catene',
  prefix: 'CT1.',
  lib,
  validate: validateCatena,
  summary: (d) => `${d.catene.length} catene${d.finali?.length ? ` + ${d.finali.length} parole finali` : ''}`,
  clean,
  Editor,
};

const RULES = (
  <ul>
    <li>Ogni catena ha {CHAIN_LENGTH} parole legate a due a due (pane → burro → arachidi…). Si vedono la prima e l'ultima.</li>
    <li>La squadra di turno sceglie una parola accanto a una già scoperta e prova a indovinarla.</li>
    <li>L'host scrive la risposta e preme Invio: l'app controlla se è giusta (accetta un errore di battitura). Può anche premere ✓ o ✗.</li>
    <li>Giusta: la squadra prende 10 punti per ogni lettera ancora nascosta e continua. Sbagliata: si scopre una lettera e tocca alla squadra dopo.</li>
    <li>Finale (se c'è): una parola misteriosa e cinque indizi, uno alla volta. Ci si prenota con il proprio tasto, oppure decide l'host. Meno indizi, più punti; chi sbaglia è fuori per quella parola.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: CatenaSet }) {
  const { game, setGame } = useCatena(slug, data);
  return (
    <SetupPage
      back="#/catena"
      backLabel="← Tutte le catene"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/catena/${slug}/play`)}
      onRestart={() => setGame((g) => startChain(newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), g.buzz), data, 0))}
    >
      {!!data.finali?.length && (
        <Choice label="🔔 Prenotazione nel finale" value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
      )}
      <p className="muted">
        🔗 {data.catene.length} catene{data.finali?.length ? ` + finale con ${data.finali.length} parole` : ', senza finale'}.
      </p>
    </SetupPage>
  );
}

const catena: Game = {
  id: 'catena',
  name: 'Catena',
  icon,
  tagline: 'Parole legate a due a due: si scoprono una alla volta, lettera dopo lettera. Con finale a prenotazione.',
  tags: ['A squadre', 'Serve un host', 'Da creare'],
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
          title="Catena con l'IA"
          intro={
            <>
              Scegli quante catene vuoi, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta: l'app controlla
              che ogni catena abbia {CHAIN_LENGTH} parole singole.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema (facoltativo)', placeholder: 'Es. cibo, sport, modi di dire…' },
            { key: 'chains', label: 'Quante catene', type: 'number', options: [2, 3, 4, 5, 6, 8] },
            { key: 'finals', label: 'Parole del finale (0 = senza finale)', type: 'number', options: [0, 1, 2, 3, 4, 5] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. famiglia con ragazzi' },
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
          name="Catena"
          icon={icon}
          hue={290}
          intro="Parole legate a due a due: trovate quelle in mezzo."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.catene?.length ?? 0} catene`, d.finali?.length ? `finale da ${d.finali.length}` : 'senza finale']}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default catena;
