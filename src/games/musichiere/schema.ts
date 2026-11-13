// Musichiere format: content/musichiere/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { youtubeId } from '../../hub/media';
import { checkLang, tr, type Lang } from '../../hub/i18n';

export interface Song {
  title: string;
  artist: string;
  /** YouTube link or id. Best: "Official Audio" or "- Topic" channels, which start with the music. */
  youtube: string;
  /** Second where the clip starts (default 0). */
  start?: number;
  year?: number;
}

export interface Playlist {
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  songs: Song[];
}

export function validatePlaylist(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  checkLang(data, errors);
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  if (!Array.isArray(data.songs) || data.songs.length < 3) {
    errors.push(tr('Servono almeno 3 canzoni ("songs")', 'At least 3 songs are needed ("songs")'));
    return { errors, warnings };
  }
  const ids = new Set<string>();
  data.songs.forEach((s, i) => {
    const where = tr(`Canzone ${i + 1}`, `Song ${i + 1}`);
    if (!isObj(s)) return errors.push(`${where}: ${tr('non valida', 'not valid')}`);
    if (!isStr(s.title)) errors.push(`${where}: ${tr('manca il titolo', 'the title is missing')}`);
    if (!isStr(s.artist)) errors.push(`${where}: ${tr("manca l'artista", 'the artist is missing')}`);
    const id = isStr(s.youtube) ? youtubeId(s.youtube.trim()) : null;
    if (!id) errors.push(`${where} (${String(s.title ?? '')}): ${tr('link YouTube mancante o non valido', 'YouTube link missing or not valid')}`);
    else if (ids.has(id)) warnings.push(`${where}: ${tr('video ripetuto', 'repeated video')}`);
    else ids.add(id);
    if (s.start !== undefined && (typeof s.start !== 'number' || s.start < 0)) errors.push(`${where}: ${tr('"start" deve essere un numero di secondi', '"start" must be a number of seconds')}`);
  });
  return { errors, warnings };
}
