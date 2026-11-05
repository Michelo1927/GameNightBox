import { useState } from 'react';
import MediaView from '../components/Media';
import { youtubeId, type Media } from '../quiz/schema';
import { compressImage, formatTime, parseTime } from './draft';

type Mode = 'none' | 'photo' | 'link' | 'youtube';

function modeOf(m?: Media): Mode {
  if (!m) return 'none';
  if (m.type === 'youtube') return 'youtube';
  return m.src.startsWith('data:') ? 'photo' : 'link';
}

interface Props {
  label: string;
  media?: Media;
  onChange: (m: Media | undefined) => void;
  allowYouTube?: boolean;
}

/** Phone-friendly media field: a photo from the gallery, an image link or a YouTube link. */
export default function MediaPicker({ label, media, onChange, allowYouTube = true }: Props) {
  const [mode, setMode] = useState<Mode>(modeOf(media));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [startText, setStartText] = useState(formatTime(media?.start));
  const [endText, setEndText] = useState(formatTime(media?.end));

  const choose = (m: Mode) => {
    setMode(m);
    setError('');
    if (m === 'none') onChange(undefined);
    else if (m === 'youtube') onChange({ type: 'youtube', src: media?.type === 'youtube' ? media.src : '', audioOnly: media?.audioOnly });
    else if (modeOf(media) !== m) onChange(undefined);
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange({ type: 'image', src: await compressImage(file) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ytOk = media?.type === 'youtube' && media.src ? !!youtubeId(media.src) : true;

  return (
    <div className="cr-media">
      <div className="cr-label">{label}</div>
      <div className="cr-seg">
        <button className={mode === 'none' ? 'on' : ''} onClick={() => choose('none')}>Nessuno</button>
        <button className={mode === 'photo' ? 'on' : ''} onClick={() => choose('photo')}>📷 Foto</button>
        <button className={mode === 'link' ? 'on' : ''} onClick={() => choose('link')}>🔗 Link immagine</button>
        {allowYouTube && <button className={mode === 'youtube' ? 'on' : ''} onClick={() => choose('youtube')}>▶ YouTube</button>}
      </div>

      {mode === 'photo' && (
        <label className="cr-file">
          {busy ? 'Elaborazione…' : media?.src ? '📷 Cambia foto' : '📷 Scegli una foto'}
          <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
      )}
      {mode === 'photo' && <p className="cr-hint">Ogni foto allunga parecchio il codice da condividere: se trovi l'immagine online, meglio usare «Link immagine».</p>}
      {mode === 'link' && (
        <>
          <input
            inputMode="url"
            value={media?.src ?? ''}
            onChange={(e) => onChange(e.target.value.trim() ? { type: 'image', src: e.target.value.trim() } : undefined)}
            placeholder="https://… (tieni premuto su un'immagine → Copia indirizzo immagine)"
          />
        </>
      )}
      {mode === 'youtube' && media?.type === 'youtube' && (
        <>
          <input inputMode="url" value={media.src} onChange={(e) => onChange({ ...media, src: e.target.value.trim() })} placeholder="Link YouTube (Condividi → Copia link)" />
          {!ytOk && <p className="cr-error">Link YouTube non riconosciuto</p>}
          <div className="cr-row">
            <label>
              Da
              <input
                inputMode="numeric"
                value={startText}
                placeholder="0:00"
                onChange={(e) => {
                  setStartText(e.target.value);
                  onChange({ ...media, start: parseTime(e.target.value) });
                }}
              />
            </label>
            <label>
              A
              <input
                inputMode="numeric"
                value={endText}
                placeholder="fine"
                onChange={(e) => {
                  setEndText(e.target.value);
                  onChange({ ...media, end: parseTime(e.target.value) });
                }}
              />
            </label>
          </div>
          <label className="cr-check">
            <input type="checkbox" checked={!!media.audioOnly} onChange={(e) => onChange({ ...media, audioOnly: e.target.checked || undefined })} />
            Solo audio (per indovinare la canzone)
          </label>
        </>
      )}
      {error && <p className="cr-error">{error}</p>}
      {media?.src && (mode !== 'youtube' || ytOk) && (
        <div className="cr-preview">
          <MediaView key={media.src} media={media} url={media.src} />
        </div>
      )}
    </div>
  );
}
