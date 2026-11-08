// YouTube IFrame API: loaded once, used for audio-only clips (Media) and the Musichiere player.

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: Record<string, number> };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApi: Promise<void> | null = null;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  ytApi ??= new Promise<void>((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApi;
}

/** Looks a video up via YouTube oEmbed: its title, or why it can't be played here. */
export async function checkYouTube(id: string): Promise<{ title?: string; error?: string }> {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  if (res.status === 401 || res.status === 403) return { error: 'non si può incorporare in altri siti' };
  if (!res.ok) return { error: 'video inesistente o privato' };
  const data = (await res.json()) as { title: string; author_name: string };
  return { title: `${data.title} (${data.author_name})` };
}
