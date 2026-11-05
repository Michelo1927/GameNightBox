import { useRef, useState } from 'react';
import MediaView from '../components/Media';
import type { Media, MediaType } from '../quiz/schema';
import { devFileUrl, uploadMedia } from './api';

const TYPES: { value: MediaType | ''; label: string }[] = [
  { value: '', label: 'Nessuno' },
  { value: 'image', label: 'Immagine' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'youtube', label: 'YouTube' },
];

const ACCEPT: Record<string, string> = { image: 'image/*', audio: 'audio/*', video: 'video/*' };

function typeOf(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

interface Props {
  label: string;
  slug: string;
  media?: Media;
  onChange: (m: Media | undefined) => void;
}

export default function MediaField({ label, slug, media, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const type = media?.type ?? '';

  const set = (patch: Partial<Media>) => onChange({ ...(media ?? { type: 'image', src: '' }), ...patch } as Media);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const detected = typeOf(file);
    if (!detected) return setError('Formato non supportato: usa immagini, audio o video');
    setBusy(true);
    setError('');
    try {
      const name = await uploadMedia(slug, file);
      // Keep clip settings when replacing a file of the same type.
      onChange(media?.type === detected ? { ...media, src: name } : { type: detected, src: name });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      upload(e.dataTransfer.files[0]);
    },
    onPaste: (e: React.ClipboardEvent) => {
      const file = e.clipboardData.files[0];
      if (file) {
        e.preventDefault();
        upload(file);
      }
    },
  };

  return (
    <fieldset className={`media-field ${over ? 'over' : ''}`} {...dropProps}>
      <legend>{label}</legend>
      <div className="row">
        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value as MediaType | '';
            onChange(t ? { type: t, src: t === media?.type ? media.src : '' } : undefined);
          }}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {!media && <span className="muted small">…oppure trascina qui un file</span>}
      </div>

      {media && media.type !== 'youtube' && (
        <div className="drop" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}>
          {busy ? 'Caricamento…' : media.src ? <>📎 <b>{media.src}</b> <span className="muted">(clicca, trascina o incolla per sostituire)</span></> : 'Trascina qui un file, clicca per sceglierlo o incolla (Ctrl+V)'}
          <input ref={input} type="file" hidden accept={ACCEPT[media.type]} onChange={(e) => upload(e.target.files?.[0])} />
        </div>
      )}
      {media?.type === 'youtube' && (
        <input className="wide" value={media.src} onChange={(e) => set({ src: e.target.value.trim() })} placeholder="https://www.youtube.com/watch?v=…" />
      )}

      {media && media.type !== 'image' && (
        <div className="row">
          <label>Inizio (s) <input type="number" min={0} value={media.start ?? ''} onChange={(e) => set({ start: num(e.target.value) })} /></label>
          <label>Fine (s) <input type="number" min={0} value={media.end ?? ''} onChange={(e) => set({ end: num(e.target.value) })} /></label>
          {(media.type === 'youtube' || media.type === 'video') && (
            <label className="check">
              <input type="checkbox" checked={!!media.audioOnly} onChange={(e) => set({ audioOnly: e.target.checked || undefined })} /> Solo audio
            </label>
          )}
        </div>
      )}
      {media && (
        <input className="wide" value={media.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} placeholder="Didascalia (facoltativa)" />
      )}
      {error && <p className="error-text">{error}</p>}
      {media?.src && (
        <div className="media-preview">
          <MediaView key={`${media.type}:${media.src}`} media={media} url={devFileUrl(slug, media.src)} />
        </div>
      )}
    </fieldset>
  );
}
