import CreatorPage from '../../hub/components/CreatorPage';
import { useDraft } from '../../hub/draft';
import { youtubeId } from '../../hub/media';
import { CheckLine, useYouTubeChecks } from './Preview';
import { validatePlaylist, type Playlist, type Song } from './schema';
import { ask } from '../../hub/ask';

const MAX_SONGS = 100;

const blankSong = (): Song => ({ title: '', artist: '', youtube: '' });
export const blank = (): Playlist => ({ title: '', songs: [blankSong(), blankSong(), blankSong()] });

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);

export function normalize(d: unknown): Playlist {
  const o = (d && typeof d === 'object' ? d : {}) as Partial<Playlist>;
  return {
    title: str(o.title),
    description: str(o.description) || undefined,
    author: str(o.author) || undefined,
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
    if ((s.title || s.youtube) && !(await ask(`Togliere "${s.title || `canzone ${i + 1}`}"?`, 'Togli'))) return;
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
      title="Crea una playlist"
      tip={
        <>
          Per ogni canzone: titolo, artista e il <b>link YouTube</b> (tocca 🔍 per cercarla, poi copia il link del video e incollalo). I
          video "Official Audio" o dei canali "- Topic" partono subito con la musica. Si salva tutto mentre scrivi.
        </>
      }
      validation={validatePlaylist(clean(d))}
      progress={{ done: ready, total: Math.max(d.songs.length, 3), label: 'canzoni pronte' }}
      full={full}
      onReset={reset}
    >
      <label className="cr-field">
        <span className="cr-label">Titolo</span>
        <input value={d.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }))} placeholder="Es. Tormentoni anni 2000" />
      </label>
      <label className="cr-field">
        <span className="cr-label">Descrizione (facoltativa)</span>
        <input value={d.description ?? ''} onChange={(e) => set((x) => ({ ...x, description: e.target.value }))} />
      </label>
      <label className="cr-field">
        <span className="cr-label">Autore (facoltativo)</span>
        <input value={d.author ?? ''} onChange={(e) => set((x) => ({ ...x, author: e.target.value }))} />
      </label>

      <h3 className="cr-section">🎵 Canzoni ({d.songs.length})</h3>
      {d.songs.map((s, i) => {
        const id = youtubeId(s.youtube.trim());
        return (
          <section key={i} className="cr-cat">
            <div className="cr-head">
              <h2>{i + 1}. {s.title || 'Canzone'}</h2>
              <div className="mu-edit-tools">
                <button className="btn ghost" disabled={i === 0} onClick={() => moveSong(i, -1)} title="Sposta su">↑</button>
                <button className="btn ghost" disabled={i === d.songs.length - 1} onClick={() => moveSong(i, 1)} title="Sposta giù">↓</button>
                <button className="btn ghost" onClick={() => remove(i)} title="Togli">🗑</button>
              </div>
            </div>
            <div className="cr-row">
              <label>
                Titolo
                <input value={s.title} onChange={(e) => setSong(i, { title: e.target.value })} />
              </label>
              <label>
                Artista
                <input value={s.artist} onChange={(e) => setSong(i, { artist: e.target.value })} />
              </label>
            </div>
            <div className="mu-link">
              <input value={s.youtube} onChange={(e) => setSong(i, { youtube: e.target.value })} placeholder="Link YouTube" inputMode="url" />
              <a className="btn ghost" href={search(s)} target="_blank" rel="noreferrer" title="Cerca su YouTube">🔍</a>
            </div>
            {s.youtube.trim() && <CheckLine check={check(s.youtube)} />}
            <div className="cr-row">
              <label>
                Parte dal secondo
                <input type="number" min={0} inputMode="numeric" value={s.start ?? ''} onChange={(e) => setSong(i, { start: seconds(e.target.value) })} placeholder="0" />
              </label>
              <label>
                Anno (facoltativo)
                <input type="number" min={1900} max={2100} inputMode="numeric" value={s.year ?? ''} onChange={(e) => setSong(i, { year: seconds(e.target.value) })} />
              </label>
            </div>
            {id && (
              <a className="cr-hint" href={`https://youtu.be/${id}${s.start ? `?t=${s.start}` : ''}`} target="_blank" rel="noreferrer">
                ▶ Ascolta da qui per controllare l'inizio
              </a>
            )}
          </section>
        );
      })}
      {d.songs.length < MAX_SONGS && (
        <button className="cr-add" onClick={() => set((x) => ({ ...x, songs: [...x.songs, blankSong()] }))}>＋ Aggiungi una canzone</button>
      )}
    </CreatorPage>
  );
}
