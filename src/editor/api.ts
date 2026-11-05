import { isRemote, type Quiz, type ValidationResult } from '../quiz/schema';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/__editor/${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Errore ${res.status}`);
  return data as T;
}

export const listQuizzes = () => call<{ slug: string; title: string }[]>('quizzes');
export const loadQuiz = (slug: string) => call<Quiz>(`quiz/${slug}`);

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
export const createQuiz = (slug: string, quiz: Quiz) => call<ValidationResult>(`quiz/${slug}`, json('POST', quiz));
export const saveQuiz = (slug: string, quiz: Quiz) => call<ValidationResult>(`quiz/${slug}`, json('PUT', quiz));

export async function uploadMedia(slug: string, file: File): Promise<string> {
  const { name } = await call<{ name: string }>(`media/${slug}?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
  return name;
}

/** Dev-server URL of a file in the quiz folder (works right after upload). */
export const devFileUrl = (slug: string, src: string) => (isRemote(src) ? src : `/quizzes/${slug}/${src}`);

export { slugify } from '../quiz/schema';
