import { BUZZ_KEYS, BUZZ_MODES } from '../../hub/buzzer';
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
import { CLIPS, newGame, SLOTS, useMusichiere } from './state';
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
  <ul>
    <li>Parte una canzone (solo audio). La prima squadra che si prenota ferma la musica e dice titolo e artista.</li>
    <li>Prenotazione: ogni squadra ha un tasto sul portatile (es. {BUZZ_KEYS.slice(0, 2).join(' e ')}), oppure decide l'host chi è stato più veloce e preme il numero della squadra (o clicca la sua colonna).</li>
    <li>Dopo la prenotazione l'host può premere <b>Svela</b> (S) per vedere titolo e artista prima di giudicare: se poi è sbagliata, la canzone finisce per tutti. Senza svelare, chi sbaglia è fuori e la musica riparte per le altre.</li>
    <li>Giusta (Invio): la squadra riempie una casella della sua colonna. Sbagliata (X): nessuna casella, ma la squadra salta il turno e la musica riparte per le altre.</li>
    <li><b>Vince la prima squadra che riempie tutta la colonna.</b> Se finiscono le canzoni prima, vince chi ha più caselle piene.</li>
    <li>L'host ha anche: Spazio (play/pausa), R (da capo) e <b>Salta</b>, che svela la canzone quando nessuno la sa.</li>
  </ul>
);

function Setup({ slug, data }: { slug: string; data: Playlist }) {
  const { game, setGame } = useMusichiere(slug);
  return (
    <SetupPage
      back="#/musichiere"
      backLabel="← Tutte le playlist"
      title={data.title}
      description={data.description}
      teams={game.teams}
      setTeams={(fn) => setGame((g) => ({ ...g, teams: fn(g.teams) }))}
      started={game.started}
      onPlay={() => go(`/musichiere/${slug}/play`)}
      onRestart={() => setGame((g) => newGame(g.teams.map((t) => ({ ...t, adjust: 0 })), { buzz: g.buzz, slots: g.slots, clip: g.clip }))}
    >
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
    </SetupPage>
  );
}

const musichiere: Game = {
  id: 'musichiere',
  name: 'Musichiere',
  icon: '🎵',
  tagline: 'Canzoni a raffica da YouTube: chi si prenota per primo e indovina riempie la sua colonna.',
  tags: ['A squadre', 'Prenotazione', 'Serve internet'],
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
          title="Playlist con Claude"
          intro={
            <>
              Scegli tema e numero di canzoni, copia il prompt e incollalo su <b>claude.ai</b>. Poi incolla qui la risposta: l'app
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
          icon="🎵"
          hue={330}
          intro="Canzoni a raffica: prenotatevi e indovinate titolo e artista."
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
