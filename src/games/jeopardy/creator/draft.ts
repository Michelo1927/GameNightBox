import { cleanQuiz } from '../quiz/clean';
import { POINTS, type Quiz } from '../quiz/schema';
import { ask } from '../../../hub/ask';
import { newLangField, tr } from '../../../hub/i18n';

// The quiz being written on this device. Saved on every change: closing the tab loses nothing.
const KEY = 'jeopardy-quiz:draft';

export const blankQuiz = (): Quiz => ({
  title: '',
  ...newLangField(),
  categories: Array.from({ length: 5 }, () => ({
    name: '',
    questions: POINTS.map((points) => ({ points, question: '', answer: '' })),
  })),
});

export function loadDraft(): Quiz | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Quiz) : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser has no room left (usually too many photos). */
export function saveDraft(quiz: Quiz): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(quiz));
    return true;
  } catch {
    return false;
  }
}

// A draft is "finished" once its code has been generated (and the quiz saved on the device):
// "Crea un quiz" from the home page then starts a new one instead of reopening it.
const DONE_KEY = 'jeopardy-quiz:draft-done';

function fingerprint(quiz: Quiz) {
  const text = JSON.stringify(cleanQuiz(quiz));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${text.length}-${(h >>> 0).toString(36)}`;
}

/** Remembers that this quiz is saved on the device as `slug`. */
export function markDraftDone(quiz: Quiz, slug: string) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify({ slug, print: fingerprint(quiz) }));
  } catch {
    /* not persisted */
  }
}

/** The slug of the saved copy of this draft, if the draft is still the same as when it was saved. */
export function savedSlugOf(quiz: Quiz): string | undefined {
  try {
    const done = JSON.parse(localStorage.getItem(DONE_KEY) ?? 'null') as { slug: string; print: string } | null;
    return done && done.print === fingerprint(quiz) ? done.slug : undefined;
  } catch {
    return undefined;
  }
}

/** The previous saved copy of this draft (even if edited since), to replace it instead of keeping both. */
export function lastSavedSlug(): string | undefined {
  try {
    return (JSON.parse(localStorage.getItem(DONE_KEY) ?? 'null') as { slug: string } | null)?.slug;
  } catch {
    return undefined;
  }
}

/**
 * Puts another quiz in the creator. Asks first if that would throw away a quiz still being written
 * (a finished one is safe: it is saved on the device). Returns false if the user says no.
 */
export async function replaceDraft(quiz: Quiz, savedAs?: string): Promise<boolean> {
  const current = loadDraft();
  if (hasDraftContent(current) && !savedSlugOf(current!) && !(await ask(tr('Stai già scrivendo un quiz su questo dispositivo: sostituirlo con questo?', "You're already writing a quiz on this device: replace it with this one?"), tr('Sostituisci', 'Replace'))))
    return false;
  clearDraft();
  saveDraft(quiz);
  if (savedAs) markDraftDone(quiz, savedAs);
  return true;
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DONE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasDraftContent(quiz: Quiz | null): boolean {
  return !!quiz && (!!quiz.title.trim() || quiz.categories.some((c) => c.name.trim() || c.questions.some((q) => q.question.trim() || q.answer.trim())));
}

/** "1:05" -> 65, "42" -> 42, "" -> undefined */
export function parseTime(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const parts = t.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function formatTime(s?: number): string {
  if (s === undefined) return '';
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);
}

/** Shrinks a photo so the shared code stays short: max 480px, JPEG (~20-50k characters). */
export function compressImage(file: File, max = 480, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; // transparent PNGs would turn black in JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(tr('Impossibile leggere questa immagine', "Can't read this image")));
    };
    img.src = url;
  });
}

export { copyText } from '../../../hub/text';
