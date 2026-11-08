import { useEffect, useState } from 'react';
import { youtubeId } from '../../hub/media';
import { checkYouTube } from '../../hub/youtube';
import type { Playlist } from './schema';

export type Check = { title?: string; error?: string } | 'loading';

/** Looks up every link on YouTube (once each) and returns what was found, by video id. */
export function useYouTubeChecks(links: string[]) {
  const [checks, setChecks] = useState<Record<string, Check>>({});
  useEffect(() => {
    const ids = [...new Set(links.map((l) => youtubeId(l.trim())).filter((id): id is string => !!id && !checks[id]))];
    if (!ids.length) return;
    setChecks((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, 'loading' as const])) }));
    for (const id of ids)
      checkYouTube(id)
        .then((r) => setChecks((c) => ({ ...c, [id]: r })))
        .catch(() => setChecks((c) => ({ ...c, [id]: { error: 'non riesco a controllarlo (sei offline?)' } })));
  }, [links, checks]);
  return (link: string): Check | undefined => {
    const id = youtubeId(link.trim());
    return id ? checks[id] : { error: 'link non valido' };
  };
}

/** One line under a link: the real video title, or what is wrong. */
export function CheckLine({ check }: { check: Check | undefined }) {
  return (
    <div className="cr-hint">
      {check === 'loading' || !check ? 'controllo…' : check.error ? <span className="flash-ko">✗ {check.error}</span> : <span>▶ {check.title}</span>}
    </div>
  );
}

/**
 * Checks every song's YouTube link and shows the real video title next to it, so wrong or made-up links
 * (Claude can't always know the exact video) can be fixed before playing.
 */
export default function Preview({ data, update }: { data: Playlist; update: (d: Playlist) => void }) {
  const songs = Array.isArray(data.songs) ? data.songs : [];
  const check = useYouTubeChecks(songs.map((s) => String(s?.youtube ?? '')));
  const bad = songs.filter((s) => {
    const c = check(String(s?.youtube ?? ''));
    return c && c !== 'loading' && c.error;
  }).length;

  const setLink = (i: number, youtube: string) => update({ ...data, songs: songs.map((s, j) => (j === i ? { ...s, youtube } : s)) });
  const remove = (i: number) => update({ ...data, songs: songs.filter((_, j) => j !== i) });

  return (
    <div className="mu-preview">
      <b>{data.title}</b>
      <p className="cr-hint">
        Controlla che il video trovato sia la canzone giusta. Se un link non va, cerca la canzone su YouTube, copia il link e incollalo,
        oppure togli la canzone.
      </p>
      {bad > 0 && <p className="cr-error">{bad === 1 ? '1 link non funziona' : `${bad} link non funzionano`}</p>}
      <ol>
        {songs.map((s, i) => (
          <li key={i}>
            <div>
              <b>{s?.title}</b> · {s?.artist}
            </div>
            <div className="mu-link">
              <input value={String(s?.youtube ?? '')} onChange={(e) => setLink(i, e.target.value)} placeholder="Link YouTube" />
              <button className="btn ghost" onClick={() => remove(i)} title="Togli questa canzone">🗑</button>
            </div>
            <CheckLine check={check(String(s?.youtube ?? ''))} />
          </li>
        ))}
      </ol>
    </div>
  );
}
