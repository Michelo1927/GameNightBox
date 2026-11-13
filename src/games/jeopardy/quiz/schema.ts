// Quiz file format (quizzes/<slug>/quiz.json). Shared by the app and scripts/validate.ts.
import { isRemote, MEDIA_TYPES, youtubeId, type Media, type MediaType } from '../../../hub/media';
import { slugify } from '../../../hub/text';
import { checkLang, tr, type Lang } from '../../../hub/i18n';

export { isRemote, MEDIA_TYPES, slugify, youtubeId, type Media, type MediaType };

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
  choices?: string[];
  rules?: string;
  hostNote?: string;
}

export interface Quiz {
  title: string;
  description?: string;
  author?: string;
  /** Language of the quiz ("it" when missing). */
  lang?: Lang;
  credits?: string[];
  categories: Category[];
  final?: FinalQuestion;
}

export const POINTS = [100, 200, 300, 400, 500];

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function checkMedia(m: unknown, where: string, errors: string[]) {
  if (!isObj(m)) return errors.push(tr(`${where}: deve essere un oggetto`, `${where}: must be an object`));
  if (!MEDIA_TYPES.includes(m.type as MediaType)) errors.push(tr(`${where}.type: deve essere uno di ${MEDIA_TYPES.join(', ')}`, `${where}.type: must be one of ${MEDIA_TYPES.join(', ')}`));
  if (!isStr(m.src) || !m.src.trim()) errors.push(tr(`${where}.src: obbligatorio`, `${where}.src: required`));
  for (const k of ['start', 'end'] as const) {
    if (m[k] !== undefined && (typeof m[k] !== 'number' || (m[k] as number) < 0)) errors.push(tr(`${where}.${k}: deve essere un numero di secondi ≥ 0`, `${where}.${k}: must be a number of seconds ≥ 0`));
  }
  if (typeof m.start === 'number' && typeof m.end === 'number' && m.end <= m.start) errors.push(tr(`${where}: end deve essere maggiore di start`, `${where}: end must be greater than start`));
  if (m.type === 'youtube' && isStr(m.src) && !youtubeId(m.src)) errors.push(tr(`${where}.src: link YouTube non riconosciuto`, `${where}.src: YouTube link not recognised`));
}

export function validateQuiz(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve contenere un oggetto JSON', 'The file must contain a JSON object')], warnings };
  if (!isStr(data.title) || !data.title.trim()) errors.push(tr('title: obbligatorio', 'title: required'));
  checkLang(data, errors);
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    errors.push(tr('categories: serve almeno una categoria', 'categories: at least one category is needed'));
    return { errors, warnings };
  }
  if (data.categories.length !== 5) warnings.push(tr(`Ci sono ${data.categories.length} categorie (di solito sono 5)`, `There are ${data.categories.length} categories (usually 5)`));

  data.categories.forEach((cat, ci) => {
    const cw = `categories[${ci}]`;
    if (!isObj(cat)) return errors.push(tr(`${cw}: deve essere un oggetto`, `${cw}: must be an object`));
    if (!isStr(cat.name) || !cat.name.trim()) errors.push(tr(`${cw}.name: obbligatorio`, `${cw}.name: required`));
    if (!Array.isArray(cat.questions) || cat.questions.length === 0) return errors.push(tr(`${cw}.questions: serve almeno una domanda`, `${cw}.questions: at least one question is needed`));
    if (cat.questions.length !== 5) warnings.push(tr(`${cw} "${cat.name}": ${cat.questions.length} domande (di solito sono 5)`, `${cw} "${cat.name}": ${cat.questions.length} questions (usually 5)`));
    const seen = new Set<number>();
    cat.questions.forEach((q, qi) => {
      const w = `${cw}.questions[${qi}]`;
      if (!isObj(q)) return errors.push(tr(`${w}: deve essere un oggetto`, `${w}: must be an object`));
      if (typeof q.points !== 'number' || q.points <= 0) errors.push(tr(`${w}.points: numero positivo obbligatorio`, `${w}.points: a positive number is required`));
      else if (seen.has(q.points)) errors.push(tr(`${w}.points: ${q.points} ripetuto nella stessa categoria`, `${w}.points: ${q.points} repeated in the same category`));
      else seen.add(q.points);
      if (!isStr(q.question)) errors.push(tr(`${w}.question: obbligatorio (può essere "" se c'è un media)`, `${w}.question: required (can be "" if there is a media)`));
      else if (!q.question.trim() && !q.media) errors.push(tr(`${w}: serve il testo della domanda oppure un media`, `${w}: the question needs a text or a media`));
      if (!isStr(q.answer) || !q.answer.trim()) errors.push(tr(`${w}.answer: obbligatorio`, `${w}.answer: required`));
      if (q.media !== undefined) checkMedia(q.media, `${w}.media`, errors);
      if (q.answerMedia !== undefined) checkMedia(q.answerMedia, `${w}.answerMedia`, errors);
      if (q.choices !== undefined) {
        if (!Array.isArray(q.choices) || q.choices.length < 2 || !q.choices.every(isStr)) errors.push(tr(`${w}.choices: servono almeno 2 opzioni di testo`, `${w}.choices: at least 2 text options are needed`));
        else if (isStr(q.answer) && findCorrectChoice(q.choices, q.answer) < 0) warnings.push(tr(`${w}: la risposta non corrisponde a nessuna delle scelte`, `${w}: the answer matches none of the choices`));
      }
      if (q.rules !== undefined && !isStr(q.rules)) errors.push(tr(`${w}.rules: deve essere testo`, `${w}.rules: must be text`));
      if (q.hostNote !== undefined && !isStr(q.hostNote)) errors.push(tr(`${w}.hostNote: deve essere testo`, `${w}.hostNote: must be text`));
    });
  });
  if (data.final !== undefined) {
    const f = data.final;
    if (!isObj(f)) errors.push(tr('final: deve essere un oggetto', 'final: must be an object'));
    else {
      if (!isStr(f.category) || !f.category.trim()) errors.push(tr('final.category: obbligatorio', 'final.category: required'));
      if (!isStr(f.question)) errors.push(tr('final.question: obbligatorio', 'final.question: required'));
      else if (!f.question.trim() && !f.media) errors.push(tr('final: serve il testo della domanda oppure un media', 'final: the question needs a text or a media'));
      if (!isStr(f.answer) || !f.answer.trim()) errors.push(tr('final.answer: obbligatorio', 'final.answer: required'));
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

const norm = (s: string) => s.trim().toLowerCase();

/** Index of the choice matching the answer: exact match first, then "answer contains choice". */
export function findCorrectChoice(choices: string[], answer: string): number {
  const a = norm(answer);
  const exact = choices.findIndex((c) => norm(c) === a);
  if (exact >= 0) return exact;
  return choices.findIndex((c) => a.includes(norm(c)) || norm(c).includes(a));
}
