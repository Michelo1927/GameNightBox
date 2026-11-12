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
import Preview from './Preview';
import { prompt } from './prompt';
import { validatePlaylist, type Playlist } from './schema';
import { CLIPS, MODES, newGame, perTeam, SLOTS, TURN_SECONDS, useMusichiere, type MGame, type Mode, type TurnRun } from './state';
import { ask } from '../../hub/ask';
import './musichiere.css';

const lib = library<Playlist>('musichiere', import.meta.glob('/content/musichiere/*.json', { eager: true, import: 'default' }), validatePlaylist);

const creation: Creation<Playlist> = {
  game: 'musichiere',
  a: 'una playlist',
  prefix: 'MU1.',
  lib,
  validate: validatePlaylist,
  summary: (d) => `${d.songs.length} canzoni`,
  clean,
  Editor,
};

const RULES = (
  <>
    <p><b>A prenotazione</b>: tutte le squadre sulla stessa canzone.</p>
    <ul>
      <li>Parte una canzone (solo audio). La prima squadra che si prenota ferma la musica e dice titolo e artista.</li>
      <li>Prenotazione: ogni squadra ha un tasto sul portatile (es. {BUZZ_KEYS.slice(0, 2).join(' e ')}), oppure decide l'host chi è stato più veloce e preme il numero della squadra (o clicca la sua colonna).</li>
      <li>Dopo la prenotazione l'host può premere <b>Svela</b> (S) per vedere titolo e artista prima di giudicare: se poi è sbagliata, la canzone finisce per tutti. Senza svelare, chi sbaglia è fuori e la musica riparte per le altre.</li>
      <li>Giusta (Invio): la squadra riempie una casella della sua colonna. Sbagliata (X): nessuna casella, ma la squadra salta il turno e la musica riparte per le altre.</li>
      <li><b>Vince la prima squadra che riempie tutta la colonna.</b> Se finiscono le canzoni prima, vince chi ha più caselle piene.</li>
      <li>L'host ha anche: Spazio (play/pausa), R (da capo) e <b>Salta</b>, che svela la canzone quando nessuno la sa.</li>
    </ul>
    <p><b>A turno</b>: ogni squadra ha la sua lista di canzoni, nessuno ruba.</p>
    <ul>
      <li>La playlist si divide fra le squadre (1ª canzone alla prima squadra, 2ª alla seconda…). Chi parte lo decide la ruota.</li>
      <li>Ogni squadra ha un cronometro suo, che scorre solo mentre gioca. La canzone va avanti finché la squadra non risponde.</li>
      <li>Giusta (Invio) = 1 punto. Sbagliata (X) = la canzone è persa. <b>Passa</b> (P) = la canzone torna dopo. In tutti e tre i casi tocca all'altra squadra.</li>
      <li>Finita la lista, ognuno riprende le canzoni passate, in ordine, finché non restano solo giuste e sbagliate.</li>
      <li>A tempo scaduto le canzoni ancora da indovinare valgono come sbagliate. <b>Vince chi ne indovina di più.</b></li>
    </ul>
  </>
);

function Setup({ slug, data }: { slug: string; data: Playlist }) {
  const { game, setGame } = useMusichiere(slug);
  const turni = game.mode === 'turni';
  const each = perTeam(data.songs.length, game.teams.length);
  const left = data.songs.length - each * game.teams.length;
  const restart = (g: MGame, opts: Partial<MGame> = {}) =>
    newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { mode: g.mode, buzz: g.buzz, slots: g.slots, clip: g.clip, seconds: g.seconds, ...opts });
  /** The two modes keep different scores: switching in the middle of a game starts it again. */
  const changeMode = async (mode: Mode) => {
    if (mode === game.mode) return;
    if (!game.started) return setGame((g) => ({ ...g, mode }));
    if (await ask('Cambiare modalità fa ricominciare la partita da capo: i punti si azzerano.', 'Cambia e ricomincia')) setGame((g) => restart(g, { mode }));
  };
  return (
    <SetupPage
      back="#/musichiere"
      backLabel="← Tutte le playlist"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      // Booking: every team plays the same song, so who starts doesn't matter.
      wheel={turni}
      blocked={turni && each < 1 ? `Servono almeno ${game.teams.length} canzoni, una per squadra.` : undefined}
      onPlay={() => go(`/musichiere/${slug}/play`)}
      onRestart={() => setGame((g) => restart(g))}
    >
      <Choice label="🎲 Modalità" value={game.mode} options={MODES} onChange={changeMode} />
      <p className="muted">
        {turni
          ? "Ogni squadra ha la sua lista di canzoni e un cronometro: giusta, sbagliata o passa, poi tocca all'altra. Niente rubate."
          : 'Tutte le squadre sulla stessa canzone: risponde chi si prenota per primo.'}
      </p>
      {turni ? (
        <>
          <Choice
            label="⏱ Tempo per squadra"
            value={game.seconds}
            options={TURN_SECONDS.map((n) => ({ value: n, label: `${n / 60} min` }))}
            onChange={(seconds) =>
              setGame((g) => {
                // Lists not started yet get the new time.
                const fresh = (r: TurnRun) => Object.keys(r.marks).length === 0 && r.timeLeft === g.seconds * 1000;
                const runs = Object.fromEntries(Object.entries(g.runs).map(([id, r]) => [id, fresh(r) ? { ...r, timeLeft: seconds * 1000 } : r]));
                return { ...g, seconds, runs };
              })
            }
          />
          <p className="muted">
            🎵 {data.songs.length} canzoni: {each} a testa{left ? ` (${left === 1 ? "l'ultima resta fuori" : `le ultime ${left} restano fuori`})` : ''}. Serve
            internet (le canzoni arrivano da YouTube).
          </p>
        </>
      ) : (
        <>
          <Choice label="🔔 Prenotazione" value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
          {game.buzz === 'keys' && (
            <p className="muted">
              Tasti: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}
            </p>
          )}
          <Choice label="🟥 Canzoni da indovinare per vincere" value={game.slots} options={SLOTS.map((n) => ({ value: n, label: String(n) }))} onChange={(slots) => setGame((g) => ({ ...g, slots }))} />
          <Choice label="⏱ Secondi di ascolto" value={game.clip} options={CLIPS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(clip) => setGame((g) => ({ ...g, clip }))} />
          {data.songs.length < game.slots * game.teams.length && (
            <p className="muted">⚠️ Con {data.songs.length} canzoni la partita potrebbe finire prima che una squadra riempia la colonna: vincerebbe chi ne ha di più.</p>
          )}
          <p className="muted">🎵 {data.songs.length} canzoni. Serve internet (le canzoni arrivano da YouTube).</p>
        </>
      )}
    </SetupPage>
  );
}

const musichiere: Game = {
  id: 'musichiere',
  name: 'Musichiere',
  icon,
  tagline: 'Canzoni da YouTube da indovinare: a prenotazione, o a turno con una lista e un cronometro per squadra.',
  tags: ['A squadre', 'Prenotazione o a turno', 'Serve internet'],
  href: '#/musichiere',
  route(parts) {
    const [section, slug, view] = parts;
    if (section !== 'musichiere') return null;
    const made = creationRoute(creation, parts);
    if (made) return made;
    if (slug === 'claude')
      return (
        <ClaudeCreate<Playlist>
          back="#/musichiere"
          title="Playlist con l'IA"
          intro={
            <>
              Scegli tema e numero di canzoni, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta: l'app
              controlla ogni link YouTube e ti mostra il titolo vero del video, così sistemi quelli sbagliati prima di giocare.
            </>
          }
          fields={[
            { key: 'topic', label: 'Tema', placeholder: 'Es. Sanremo, anni 2000, cartoni animati, rock…' },
            { key: 'songs', label: 'Quante canzoni', type: 'number', options: [10, 15, 20, 30, 40] },
            { key: 'audience', label: 'Chi gioca (facoltativo)', placeholder: 'Es. amici sui 30 anni' },
          ]}
          initial={{ topic: '', songs: 20, audience: '' }}
          prompt={prompt}
          validate={validatePlaylist}
          preview={(d, update) => <Preview data={d} update={update} />}
          onPlay={(d) => go(`/musichiere/${lib.saveLocal(d)}/setup`)}
          onEdit={async (d) => (await startDraft('musichiere', normalize(d))) && go('/musichiere/crea')}
        />
      );
    const loaded = slug ? lib.find(decodeURIComponent(slug)) : undefined;
    if (!loaded || loaded.errors.length)
      return (
        <ContentHome<Playlist>
          game="musichiere"
          name="Musichiere"
          icon={icon}
          hue={330}
          intro="Indovinate titolo e artista: prenotandovi sulla stessa canzone, o a turno ognuno con la sua lista."
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [`${d.songs?.length ?? 0} canzoni`]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default musichiere;
