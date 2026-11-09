import { useEffect, useRef, useState, type ReactNode } from 'react';
import { youtubeId, type Media } from '../media';
import { useQuietMusic } from '../music';
import { loadYouTubeApi, type YTPlayer } from '../youtube';

/** Image + multiple choice: picture on the left, options on the right (stacked on narrow screens). */
export function MaybeSplit({ split, media, children }: { split: boolean; media: ReactNode; children: ReactNode }) {
  if (!split) return <>{children}</>;
  return (
    <div className="q-split">
      {media}
      <div className="q-side">{children}</div>
    </div>
  );
}

/** `url` is the resolved file URL (ignored for YouTube, which uses media.src). */
export default function MediaView({ media, url }: { media: Media; url: string }) {
  // Songs and videos are heard without the background music.
  useQuietMusic(media.type !== 'image');
  if (!url && media.type !== 'youtube') return <div className="media-missing">File non trovato: {media.src}</div>;

  let content;
  if (media.type === 'image') content = <ZoomImage src={url} alt={media.caption ?? ''} />;
  else if (media.type === 'youtube') content = media.audioOnly ? <YouTubeAudio media={media} /> : <YouTubeVideo media={media} />;
  else if (media.type === 'audio' || media.audioOnly) content = <AudioClip src={url} start={media.start} end={media.end} />;
  else content = <VideoClip src={url} start={media.start} end={media.end} />;

  return (
    <figure className={`media media-${media.type}`}>
      {content}
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  );
}

function ZoomImage({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <img src={src} alt={alt} onClick={() => setZoom(true)} title="Clicca per ingrandire" />
      {zoom && (
        <div className="zoom" onClick={() => setZoom(false)}>
          <img src={src} alt={alt} />
        </div>
      )}
    </>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Keeps an <audio>/<video> inside the [start, end] window. */
function useClip(ref: React.RefObject<HTMLMediaElement | null>, start = 0, end?: number) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMeta = () => (el.currentTime = start);
    const onTime = () => {
      setTime(el.currentTime);
      if (end !== undefined && el.currentTime >= end) {
        el.pause();
        el.currentTime = start;
      }
    };
    const onPlay = () => {
      if (el.currentTime < start || (end !== undefined && el.currentTime >= end)) el.currentTime = start;
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.pause();
    };
  }, [ref, start, end]);
  return { playing, time };
}

function AudioClip({ src, start = 0, end }: { src: string; start?: number; end?: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const { playing, time } = useClip(ref, start, end);
  const el = () => ref.current!;
  const duration = (end ?? (ref.current?.duration || 0)) - start;
  const progress = duration > 0 ? Math.min(1, (time - start) / duration) : 0;
  return (
    <div className="player">
      <audio ref={ref} src={src} preload="auto" />
      <button className="play" onClick={() => (playing ? el().pause() : el().play())}>
        {playing ? '❚❚' : '▶'}
      </button>
      <button className="btn ghost" onClick={() => { el().currentTime = start; el().play(); }}>↺ Da capo</button>
      <div className="bar"><div style={{ width: `${progress * 100}%` }} /></div>
      <span className="muted">{fmt(Math.max(0, time - start))}</span>
    </div>
  );
}

function VideoClip({ src, start = 0, end }: { src: string; start?: number; end?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useClip(ref, start, end);
  return <video ref={ref} src={src} controls preload="auto" />;
}

function YouTubeVideo({ media }: { media: Media }) {
  const id = youtubeId(media.src);
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (media.start) params.set('start', String(Math.floor(media.start)));
  if (media.end) params.set('end', String(Math.ceil(media.end)));
  return (
    <div className="yt-frame">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        title="YouTube"
      />
    </div>
  );
}

// --- YouTube audio-only: hidden player driven by the IFrame API ---

function YouTubeAudio({ media }: { media: Media }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const start = media.start ?? 0;
  const end = media.end;

  useEffect(() => {
    let cancelled = false;
    const id = youtubeId(media.src);
    loadYouTubeApi().then(() => {
      if (cancelled || !host.current || !window.YT) return;
      const el = document.createElement('div');
      host.current.appendChild(el);
      player.current = new window.YT.Player(el, {
        videoId: id,
        width: 200,
        height: 120,
        playerVars: { start: Math.floor(start), ...(end ? { end: Math.ceil(end) } : {}), controls: 0, disablekb: 1, rel: 0 },
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e: { data: number }) => {
            const S = window.YT!.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.ENDED) player.current?.seekTo(start, true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [media.src, start, end]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const p = player.current;
      if (!p) return;
      const now = p.getCurrentTime();
      setTime(now);
      if (end !== undefined && now >= end) {
        p.pauseVideo();
        p.seekTo(start, true);
      }
    }, 200);
    return () => clearInterval(t);
  }, [playing, start, end]);

  const p = () => player.current!;
  const progress = end ? Math.min(1, Math.max(0, (time - start) / (end - start))) : 0;
  return (
    <div className="player">
      <div ref={host} className="yt-hidden" aria-hidden />
      <button className="play" disabled={!ready} onClick={() => (playing ? p().pauseVideo() : p().playVideo())}>
        {!ready ? '…' : playing ? '❚❚' : '▶'}
      </button>
      <button className="btn ghost" disabled={!ready} onClick={() => { p().seekTo(start, true); p().playVideo(); }}>↺ Da capo</button>
      <div className="bar"><div style={{ width: `${progress * 100}%` }} /></div>
      <span className="muted">{fmt(Math.max(0, time - start))}</span>
    </div>
  );
}
