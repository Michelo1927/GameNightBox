import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { youtubeId } from '../../hub/media';
import { CheckLine, useYouTubeChecks } from './Preview';
import { validatePlaylist, type Playlist, type Song } from './schema';
import { ask } from '../../hub/ask';
import { langField, newLangField, tr } from '../../hub/i18n';

const MAX_SONGS = 100;

const blankSong = (): Song => ({ title: '', artist: '', youtube: '' });
export const blank = (): Playlist => ({ title: '', ...newLangField(), songs: [blankSong(), blankSong(), blankSong()] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);

export function normalize(d: unknown): Playlist {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<Playlist>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
    ...langField(o),
    songs: (Array.isArray(o.songs) && o.songs.length ? o.songs.slice(0, MAX_SONGS) : blank().songs).map((s) => ({
      title: str(s?.title),
      artist: str(s?.artist),
      youtube: str(s?.youtube),
      start: num(s?.start),
      year: num(s?.year),
    })),
  };
}

export function clean(d: Playlist): Playlist {
  const n = normalize(d);
  return {
    title: n.title.trim(),
    ...(n.description?.trim() ? { description: n.description.trim() } : {}),
    ...(n.author?.trim() ? { author: n.author.trim() } : {}),
    ...langField(n),
    songs: n.songs
      .filter((s) => s.title.trim() || s.artist.trim() || s.youtube.trim())
      .map((s) => ({
        title: s.title.trim(),
        artist: s.artist.trim(),
        youtube: s.youtube.trim(),
        ...(s.start ? { start: s.start } : {}),
        ...(s.year ? { year: s.year } : {}),
      })),
  };
}

const search = (s: Song) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.artist} official audio`.trim())}`;

export default function Editor() {
  const { draft, update, reset, full } = useDraft<Playlist>('musichiere', blank);
  const d = normalize(draft.data);
  const check = useYouTubeChecks(d.songs.map((s) => s.youtube));
  const set = (fn: (d: Playlist) => Playlist) => update((x) => fn(normalize(x)));
  const setSong = (i: number, patch: Partial<Song>) => set((x) => ({ ...x, songs: x.songs.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const remove = async (i: number) => {
    const s = d.songs[i];
    if ((s.title || s.youtube) && !(await ask(tr(`Togliere "${s.title || `canzone ${i + 1}`}"?`, `Remove "${s.title || `song ${i + 1}`}"?`), tr('Togli', 'Remove')))) return;
    set((x) => ({ ...x, songs: x.songs.filter((_, j) => j !== i) }));
  };
  const moveSong = (i: number, step: number) =>
    set((x) => {
      const songs = [...x.songs];
      [songs[i], songs[i + step]] = [songs[i + step], songs[i]];
      return { ...x, songs };
    });
  const seconds = (v: string) => (v === '' ? undefined : Math.max(0, Math.round(Number(v)) || 0));

  const ready = d.songs.filter((s) => {
    const c = check(s.youtube);
    return s.title.trim() && s.artist.trim() && c && c !== 'loading' && !c.error;
  }).length;

  return (
    <CreatorPage
      game="musichiere"
      title={tr('Crea una playlist', 'Create a playlist')}
      tip={
        tr(
          <>
            Per ogni canzone: titolo, artista e il <b>link YouTube</b> (tocca 🔍 per cercarla, poi copia il link del video e incollalo). I
            video "Official Audio" o dei canali "- Topic" partono subito con la musica. Si salva tutto mentre scrivi.
          </>,
          <>
            For each song: title, artist and the <b>YouTube link</b> (tap 🔍 to search for it, then copy the video's link and paste it).
            "Official Audio" videos or those from "- Topic" channels start straight away with the music. Everything is saved as you type.
          </>,
        )
      }
      validation={validatePlaylist(clean(d))}
      progress={{ done: ready, total: Math.max(d.songs.length, 3), label: tr('canzoni pronte', 'songs ready') }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">{tr('Titolo', 'Title')}</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder={tr('Es. Tormentoni anni 2000', 'E.g. 2000s summer hits')} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Descrizione (facoltativa)', 'Description (optional)')}</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">{tr('Autore (facoltativo)', 'Author (optional)')}</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🎵 {tr('Canzoni', 'Songs')} ({d.songs.length})</h3>
      {d.songs.map((s, i) => {
        const id = youtubeId(s.youtube.trim());
        return (
          <section key={i} className="cr-cat">
            <div className="cr-head">
              <h2>{i + 1}. {s.title || tr('Canzone', 'Song')}</h2>
              <div className="mu-edit-tools">
                <button className="btn ghost" disabled={i === 0} onClick={() => moveSong(i, -1)} title={tr('Sposta su', 'Move up')}>↑</button>
                <button className="btn ghost" disabled={i === d.songs.length - 1} onClick={() => moveSong(i, 1)} title={tr('Sposta giù', 'Move down')}>↓</button>
                <button className="btn ghost" onClick={() => remove(i)} title={tr('Togli', 'Remove')}>🗑</button>
              </div>
            </div>
            <div className="cr-row">
              <label>
                {tr('Titolo', 'Title')}
                <input value={s.title} onChange={(e) => setSong(i, { title: e.target.value })} />
              </label>
              <label>
                {tr('Artista', 'Artist')}
                <input value={s.artist} onChange={(e) => setSong(i, { artist: e.target.value })} />
              </label>
            </div>
            <div className="mu-link">
              <input value={s.youtube} onChange={(e) => setSong(i, { youtube: e.target.value })} placeholder={tr('Link YouTube', 'YouTube link')} inputMode="url" />
              <a className="btn ghost" href={search(s)} target="_blank" rel="noreferrer" title={tr('Cerca su YouTube', 'Search on YouTube')}>🔍</a>
            </div>
            {s.youtube.trim() && <CheckLine check={check(s.youtube)} />}
            <div className="cr-row">
              <label>
                {tr('Parte dal secondo', 'Starts at second')}
                <input type="number" min={0} inputMode="numeric" value={s.start ?? ''} onChange={(e) => setSong(i, { start: seconds(e.target.value) })} placeholder="0" />
              </label>
              <label>
                {tr('Anno (facoltativo)', 'Year (optional)')}
                <input type="number" min={1900} max={2100} inputMode="numeric" value={s.year ?? ''} onChange={(e) => setSong(i, { year: seconds(e.target.value) })} />
              </label>
            </div>
            {id && (
              <a className="cr-hint" href={`https://youtu.be/${id}${s.start ? `?t=${s.start}` : ''}`} target="_blank" rel="noreferrer">
                ▶ {tr("Ascolta da qui per controllare l'inizio", 'Listen from here to check the start')}
              </a>
            )}
          </section>
        );
      })}
      {d.songs.length < MAX_SONGS && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, songs: [...x.songs, blankSong()] }))}>＋ {tr('Aggiungi una canzone', 'Add a song')}</button>
      )}
    </CreatorPage>
  );
}
