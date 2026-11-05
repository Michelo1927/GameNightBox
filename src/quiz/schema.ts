// Quiz file format (quizzes/<slug>/quiz.json). Shared by the app and scripts/validate.ts.

export type MediaType = 'image' | 'audio' | 'video' | 'youtube';

export interface Media {
  type: MediaType;
  /** File name inside the quiz folder, a full URL, or a data: URL (quizzes shared as a code). */
  src: string;
  /** Clip start/end in seconds (audio, video, youtube). */
  start?: number;
  end?: number;
  /** Play only the sound, hiding the picture (video, youtube). Good for "indovina la canzone". */
  audioOnly?: boolean;
  caption?: string;
}

export interface Question {
  points: number;
  question: string;
  answer: string;
  media?: Media;
  answerMedia?: Media;
  choices?: string[];
  /** Rules shown to everyone together with the question (e.g. "servono titolo e artista"). */
  rules?: string;
  /** Private hints for the host: shown only after the answer is revealed. */
  hostNote?: string;
}

export interface Category {
  name: string;
  questions: Question[];
}

/** Optional last question, played after the board: every team bets part of its score. */
export interface FinalQuestion {
  category: string;
  question: string;
  answer: string;
  media?: Media;
  answerMedia?: Media;
  rules?: string;
  hostNote?: string;
}

export interface Quiz {
  title: string;
  description?: string;
  author?: string;
  credits?: string[];
  categories: Category[];
  final?: FinalQuestion;
}

export const POINTS = [100, 200, 300, 400, 500];
export const MEDIA_TYPES: MediaType[] = ['image', 'audio', 'video', 'youtube'];

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function checkMedia(m: unknown, where: string, errors: string[]) {
  if (!isObj(m)) return errors.push(`${where}: deve essere un oggetto`);
  if (!MEDIA_TYPES.includes(m.type as MediaType)) errors.push(`${where}.type: deve essere uno di ${MEDIA_TYPES.join(', ')}`);
  if (!isStr(m.src) || !m.src.trim()) errors.push(`${where}.src: obbligatorio`);
  for (const k of ['start', 'end'] as const) {
    if (m[k] !== undefined && (typeof m[k] !== 'number' || (m[k] as number) < 0)) errors.push(`${where}.${k}: deve essere un numero di secondi ≥ 0`);
  }
  if (typeof m.start === 'number' && typeof m.end === 'number' && m.end <= m.start) errors.push(`${where}: end deve essere maggiore di start`);
  if (m.type === 'youtube' && isStr(m.src) && !youtubeId(m.src)) errors.push(`${where}.src: link YouTube non riconosciuto`);
}

export function validateQuiz(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve contenere un oggetto JSON'], warnings };
  if (!isStr(data.title) || !data.title.trim()) errors.push('title: obbligatorio');
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    errors.push('categories: serve almeno una categoria');
    return { errors, warnings };
  }
  if (data.categories.length !== 5) warnings.push(`Ci sono ${data.categories.length} categorie (di solito sono 5)`);

  data.categories.forEach((cat, ci) => {
    const cw = `categories[${ci}]`;
    if (!isObj(cat)) return errors.push(`${cw}: deve essere un oggetto`);
    if (!isStr(cat.name) || !cat.name.trim()) errors.push(`${cw}.name: obbligatorio`);
    if (!Array.isArray(cat.questions) || cat.questions.length === 0) return errors.push(`${cw}.questions: serve almeno una domanda`);
    if (cat.questions.length !== 5) warnings.push(`${cw} "${cat.name}": ${cat.questions.length} domande (di solito sono 5)`);
    const seen = new Set<number>();
    cat.questions.forEach((q, qi) => {
      const w = `${cw}.questions[${qi}]`;
      if (!isObj(q)) return errors.push(`${w}: deve essere un oggetto`);
      if (typeof q.points !== 'number' || q.points <= 0) errors.push(`${w}.points: numero positivo obbligatorio`);
      else if (seen.has(q.points)) errors.push(`${w}.points: ${q.points} ripetuto nella stessa categoria`);
      else seen.add(q.points);
      if (!isStr(q.question)) errors.push(`${w}.question: obbligatorio (può essere "" se c'è un media)`);
      else if (!q.question.trim() && !q.media) errors.push(`${w}: serve il testo della domanda oppure un media`);
      if (!isStr(q.answer) || !q.answer.trim()) errors.push(`${w}.answer: obbligatorio`);
      if (q.media !== undefined) checkMedia(q.media, `${w}.media`, errors);
      if (q.answerMedia !== undefined) checkMedia(q.answerMedia, `${w}.answerMedia`, errors);
      if (q.choices !== undefined) {
        if (!Array.isArray(q.choices) || q.choices.length < 2 || !q.choices.every(isStr)) errors.push(`${w}.choices: servono almeno 2 opzioni di testo`);
        else if (isStr(q.answer) && findCorrectChoice(q.choices, q.answer) < 0) warnings.push(`${w}: la risposta non corrisponde a nessuna delle scelte`);
      }
      if (q.rules !== undefined && !isStr(q.rules)) errors.push(`${w}.rules: deve essere testo`);
      if (q.hostNote !== undefined && !isStr(q.hostNote)) errors.push(`${w}.hostNote: deve essere testo`);
    });
  });
  if (data.final !== undefined) {
    const f = data.final;
    if (!isObj(f)) errors.push('final: deve essere un oggetto');
    else {
      if (!isStr(f.category) || !f.category.trim()) errors.push('final.category: obbligatorio');
      if (!isStr(f.question)) errors.push('final.question: obbligatorio');
      else if (!f.question.trim() && !f.media) errors.push('final: serve il testo della domanda oppure un media');
      if (!isStr(f.answer) || !f.answer.trim()) errors.push('final.answer: obbligatorio');
      if (f.media !== undefined) checkMedia(f.media, 'final.media', errors);
      if (f.answerMedia !== undefined) checkMedia(f.answerMedia, 'final.answerMedia', errors);
    }
  }
  return { errors, warnings };
}

/** Lists every local media file a quiz references (for existence checks). */
export function localMediaFiles(quiz: Quiz): string[] {
  const files: string[] = [];
  const all: { media?: Media; answerMedia?: Media }[] = quiz.categories.flatMap((c) => c.questions);
  if (quiz.final) all.push(quiz.final);
  for (const q of all) for (const m of [q.media, q.answerMedia]) {
    if (m && m.type !== 'youtube' && !isRemote(m.src)) files.push(m.src);
  }
  return files;
}

/** True for full URLs and embedded data: URLs, false for files in the quiz folder. */
export const isRemote = (src: string) => /^(https?:|data:)/i.test(src);

export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

const norm = (s: string) => s.trim().toLowerCase();

/** Index of the choice matching the answer: exact match first, then "answer contains choice". */
export function findCorrectChoice(choices: string[], answer: string): number {
  const a = norm(answer);
  const exact = choices.findIndex((c) => norm(c) === a);
  if (exact >= 0) return exact;
  return choices.findIndex((c) => a.includes(norm(c)) || norm(c).includes(a));
}

export function youtubeId(url: string): string | null {
  const m =
    url.match(/youtu\.be\/([\w-]{11})/) ??
    url.match(/[?&]v=([\w-]{11})/) ??
    url.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url) ? url : null;
}
