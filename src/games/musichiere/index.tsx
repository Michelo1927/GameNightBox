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
import Preview from './Preview';
import { prompt } from './prompt';
import { validatePlaylist, type Playlist } from './schema';
import { CLIPS, MODES, newGame, perTeam, SLOTS, TURN_SECONDS, useMusichiere, type MGame, type Mode, type TurnRun } from './state';
import { ask } from '../../hub/ask';
import './musichiere.css';
import { tr } from '../../hub/i18n';

const lib = library<Playlist>('musichiere', import.meta.glob('/content/musichiere/*.json', { eager: true, import: 'default' }), validatePlaylist);

const creation: Creation<Playlist> = {
  game: 'musichiere',
  a: tr('una playlist', 'a playlist'),
  prefix: 'MU1.',
  lib,
  validate: validatePlaylist,
  summary: (d) => tr(`${d.songs.length} canzoni`, `${d.songs.length} songs`),
  clean,
  Editor,
};

const RULES_EN = (
  <>
    <p><b>Buzz in</b>: every team on the same song.</p>
    <ul>
      <li>A song starts (audio only). The first team to buzz in stops the music and says title and artist.</li>
      <li>Buzzing: each team has a key on the laptop (e.g. {BUZZ_KEYS.slice(0, 2).join(' and ')}), or the host decides who was fastest and presses the team's number (or clicks its column).</li>
      <li>After a team buzzes the host can press <b>Reveal</b> (S) to see title and artist before judging: if it's then wrong, the song is over for everyone. Without revealing, whoever is wrong is out and the music starts again for the others.</li>
      <li>Right (Enter): the team fills a box of its column. Wrong (X): no box, the team sits out this song and the music starts again for the others.</li>
      <li><b>The first team to fill its whole column wins.</b> If the songs run out first, the team with the most boxes filled wins.</li>
      <li>The host also has: Space (play/pause), R (from the start) and <b>Skip</b>, which reveals the song when nobody knows it.</li>
    </ul>
    <p><b>Take turns</b>: each team has its own list of songs, nobody steals.</p>
    <ul>
      <li>The playlist is split between the teams (1st song to the first team, 2nd to the second…). The wheel decides who starts.</li>
      <li>Each team has its own clock, which runs only while it plays. The song keeps going until the team answers.</li>
      <li>Right (Enter) = 1 point. Wrong (X) = the song is lost. <b>Pass</b> (P) = the song comes back later. In all three cases it's the other team's turn.</li>
      <li>At the end of the list, each team goes back to its passed songs, in order, until only right and wrong ones are left.</li>
      <li>When time is up, the songs still to guess count as wrong. <b>The team that guesses the most wins.</b></li>
    </ul>
  </>
);

const NAME = tr('Musichiere', 'Name the Song');

const RULES_IT = (
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

const RULES = tr(RULES_IT, RULES_EN);

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
    if (await ask(tr('Cambiare modalità fa ricominciare la partita da capo: i punti si azzerano.', 'Changing mode starts the game over: the points go back to zero.'), tr('Cambia e ricomincia', 'Change and start over'))) setGame((g) => restart(g, { mode }));
  };
  return (
    <SetupPage
      back="#/musichiere"
      backLabel={tr('← Tutte le playlist', '← All playlists')}
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      // Booking: every team plays the same song, so who starts doesn't matter.
      wheel={turni}
      blocked={turni && each < 1 ? tr(`Servono almeno ${game.teams.length} canzoni, una per squadra.`, `At least ${game.teams.length} songs are needed, one per team.`) : undefined}
      onPlay={() => go(`/musichiere/${slug}/play`)}
      onRestart={() => setGame((g) => restart(g))}
    >
      <Choice label={tr('🎲 Modalità', '🎲 Mode')} value={game.mode} options={MODES} onChange={changeMode} />
      <p className="muted">
        {turni
          ? tr(
              "Ogni squadra ha la sua lista di canzoni e un cronometro: giusta, sbagliata o passa, poi tocca all'altra. Niente rubate.",
              "Each team has its own list of songs and a clock: right, wrong or pass, then it's the other team's turn. No steals.",
            )
          : tr('Tutte le squadre sulla stessa canzone: risponde chi si prenota per primo.', 'Every team on the same song: whoever buzzes in first answers.')}
      </p>
      {turni ? (
        <>
          <Choice
            label={tr('⏱ Tempo per squadra', '⏱ Time per team')}
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
            🎵{' '}
            {tr(
              `${data.songs.length} canzoni: ${each} a testa${left ? ` (${left === 1 ? "l'ultima resta fuori" : `le ultime ${left} restano fuori`})` : ''}. Serve internet (le canzoni arrivano da YouTube).`,
              `${data.songs.length} songs: ${each} each${left ? ` (${left === 1 ? 'the last one is left out' : `the last ${left} are left out`})` : ''}. Needs internet (the songs come from YouTube).`,
            )}
          </p>
        </>
      ) : (
        <>
          <Choice label={tr('🔔 Prenotazione', '🔔 Buzzing in')} value={game.buzz} options={BUZZ_MODES} onChange={(buzz) => setGame((g) => ({ ...g, buzz }))} />
          {game.buzz === 'keys' && (
            <p className="muted">
              {tr('Tasti', 'Keys')}: {game.teams.map((t, i) => `${t.name} → ${BUZZ_KEYS[i]}`).join(' · ')}
            </p>
          )}
          <Choice label={tr('🟥 Canzoni da indovinare per vincere', '🟥 Songs to guess to win')} value={game.slots} options={SLOTS.map((n) => ({ value: n, label: String(n) }))} onChange={(slots) => setGame((g) => ({ ...g, slots }))} />
          <Choice label={tr('⏱ Secondi di ascolto', '⏱ Seconds of listening')} value={game.clip} options={CLIPS.map((n) => ({ value: n, label: `${n}s` }))} onChange={(clip) => setGame((g) => ({ ...g, clip }))} />
          {data.songs.length < game.slots * game.teams.length && (
            <p className="muted">
              ⚠️{' '}
              {tr(
                `Con ${data.songs.length} canzoni la partita potrebbe finire prima che una squadra riempia la colonna: vincerebbe chi ne ha di più.`,
                `With ${data.songs.length} songs the game might end before a team fills its column: the team with the most would win.`,
              )}
            </p>
          )}
          <p className="muted">
            🎵 {tr(`${data.songs.length} canzoni. Serve internet (le canzoni arrivano da YouTube).`, `${data.songs.length} songs. Needs internet (the songs come from YouTube).`)}
          </p>
        </>
      )}
    </SetupPage>
  );
}

const musichiere: Game = {
  id: 'musichiere',
  name: NAME,
  icon,
  tagline: tr(
    'Canzoni da YouTube da indovinare: a prenotazione, o a turno con una lista e un cronometro per squadra.',
    'Songs from YouTube to guess: buzzing in, or taking turns with a list and a clock per team.',
  ),
  tags: ['prenotazione', 'turno', 'internet'],
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
          title={tr("Playlist con l'IA", 'Playlist with AI')}
          intro={
            tr(
              <>
                Scegli tema e numero di canzoni, copia il prompt e incollalo nella tua IA (<b>ChatGPT, Claude, Gemini…</b>). Poi incolla qui la risposta:
                l'app controlla ogni link YouTube e ti mostra il titolo vero del video, così sistemi quelli sbagliati prima di giocare.
              </>,
              <>
                Choose a theme and the number of songs, copy the prompt and paste it into your AI (<b>ChatGPT, Claude, Gemini…</b>). Then paste the
                answer here: the app checks every YouTube link and shows you the video's real title, so you can fix the wrong ones before playing.
              </>,
            )
          }
          fields={[
            { key: 'topic', label: tr('Tema', 'Theme'), placeholder: tr('Es. Sanremo, anni 2000, cartoni animati, rock…', 'E.g. Eurovision, the 2000s, cartoons, rock…') },
            { key: 'songs', label: tr('Quante canzoni', 'How many songs'), type: 'number', options: [10, 15, 20, 30, 40] },
            { key: 'audience', label: tr('Chi gioca (facoltativo)', 'Who is playing (optional)'), placeholder: tr('Es. amici sui 30 anni', 'E.g. friends around 30') },
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
          name={NAME}
          icon={icon}
          intro={tr('Indovinate titolo e artista: prenotandovi sulla stessa canzone, o a turno ognuno con la sua lista.', 'Guess title and artist: buzzing in on the same song, or taking turns, each with its own list.')}
          rules={RULES}
          items={lib.all}
          onRemove={lib.removeLocal}
          title={(d) => d.title}
          description={(d) => d.description}
          tags={(d) => [tr(`${d.songs?.length ?? 0} canzoni`, `${d.songs?.length ?? 0} songs`)]}
        />
      );
    if (view === 'play') return <Play key={loaded.slug} loaded={loaded} />;
    return <Setup key={loaded.slug} slug={loaded.slug} data={loaded.data} />;
  },
};

export default musichiere;
