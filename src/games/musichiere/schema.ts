// Musichiere format: content/musichiere/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { youtubeId } from '../../hub/media';

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
  title: string;
  description?: string;
  author?: string;
  songs: Song[];
}

export function validatePlaylist(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.songs) || data.songs.length < 3) {
    errors.push('Servono almeno 3 canzoni ("songs")');
    return { errors, warnings };
  }
  const ids = new Set<string>();
  data.songs.forEach((s, i) => {
    const where = `Canzone ${i + 1}`;
    if (!isObj(s)) return errors.push(`${where}: non valida`);
    if (!isStr(s.title)) errors.push(`${where}: manca il titolo`);
    if (!isStr(s.artist)) errors.push(`${where}: manca l'artista`);
    const id = isStr(s.youtube) ? youtubeId(s.youtube.trim()) : null;
    if (!id) errors.push(`${where} (${String(s.title ?? '')}): link YouTube mancante o non valido`);
    else if (ids.has(id)) warnings.push(`${where}: video ripetuto`);
    else ids.add(id);
    if (s.start !== undefined && (typeof s.start !== 'number' || s.start < 0)) errors.push(`${where}: "start" deve essere un numero di secondi`);
  });
  return { errors, warnings };
}
