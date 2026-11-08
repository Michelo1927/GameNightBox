// Media shown by the games (pictures, sounds, video clips, YouTube), shared by every game's content format.

export type MediaType = 'image' | 'audio' | 'video' | 'youtube';

export interface Media {
  type: MediaType;
  /** File name inside the content folder, a full URL, or a data: URL (content shared as a code). */
  src: string;
  /** Clip start/end in seconds (audio, video, youtube). */
  start?: number;
  end?: number;
  /** Play only the sound, hiding the picture (video, youtube). Good for "indovina la canzone". */
  audioOnly?: boolean;
  caption?: string;
}

export const MEDIA_TYPES: MediaType[] = ['image', 'audio', 'video', 'youtube'];

/** True for full URLs and embedded data: URLs, false for files in the content folder. */
export const isRemote = (src: string) => /^(https?:|data:)/i.test(src);

export function youtubeId(url: string): string | null {
  const m =
    url.match(/youtu\.be\/([\w-]{11})/) ??
    url.match(/[?&]v=([\w-]{11})/) ??
    url.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url) ? url : null;
}
