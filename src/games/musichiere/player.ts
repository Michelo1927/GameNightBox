import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeApi, type YTPlayer } from '../../hub/youtube';
import { tr } from '../../hub/i18n';

const ERRORS: Record<number, string> = {
  2: tr('link del video non valido', 'video link not valid'),
  5: tr('il browser non riesce a riprodurlo', "the browser can't play it"),
  100: tr('video inesistente o privato', 'video missing or private'),
  101: tr("l'autore non permette di riprodurlo fuori da YouTube", "the author doesn't allow playing it outside YouTube"),
  150: tr("l'autore non permette di riprodurlo fuori da YouTube", "the author doesn't allow playing it outside YouTube"),
};

/** A hidden YouTube player driven by the game: only the sound is heard. */
export function usePlayer() {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !host.current || !window.YT) return;
      const el = document.createElement('div');
      host.current.appendChild(el);
      player.current = new window.YT.Player(el, {
        width: 200,
        height: 120,
        playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e: { data: number }) => setPlaying(e.data === window.YT!.PlayerState.PLAYING),
          onError: (e: { data: number }) => setError(ERRORS[e.data] ?? tr('video non riproducibile', "video can't be played")),
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTime(player.current?.getCurrentTime() ?? 0), 200);
    return () => clearInterval(t);
  }, [playing]);

  const cue = useCallback((videoId: string, start = 0) => {
    setError(null);
    setTime(start);
    player.current?.cueVideoById({ videoId, startSeconds: start });
  }, []);
  const play = useCallback(() => player.current?.playVideo(), []);
  const pause = useCallback(() => player.current?.pauseVideo(), []);
  const seek = useCallback((s: number) => {
    player.current?.seekTo(s, true);
    setTime(s);
  }, []);

  return { host, ready, playing, time, error, cue, play, pause, seek };
}
