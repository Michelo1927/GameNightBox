import { POINTS, type Quiz } from '../quiz/schema';

// The quiz being written on this device. Saved on every change: closing the tab loses nothing.
const KEY = 'jeopardy-quiz:draft';

export const blankQuiz = (): Quiz => ({
  title: '',
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
      reject(new Error('Impossibile leggere questa immagine'));
    };
    img.src = url;
  });
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without clipboard API permission.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
