// Quizzes loaded from a code, kept in this browser's localStorage.
import type { LoadedQuiz } from './load';
import { movePlayed } from '../../../hub/played';
import { slugify, validateQuiz, type Quiz } from './schema';
import { tr } from '../../../hub/i18n';

const KEY = 'jeopardy-quiz:imported';

type Store = Record<string, { quiz: Quiz; added: number }>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store;
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    throw new Error(tr('Spazio esaurito nel browser: elimina qualche quiz caricato e riprova', 'The browser is out of space: delete some loaded quizzes and try again'));
  }
}

/** Short stable hash, so loading the same quiz twice doesn't create duplicates. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36).slice(0, 6);
}

export function importedQuizzes(): LoadedQuiz[] {
  return Object.entries(read())
    .sort(([, a], [, b]) => b.added - a.added)
    .map(([slug, { quiz, added }]) => {
      const { errors, warnings } = validateQuiz(quiz);
      return { slug, quiz, errors, warnings, imported: true, date: added };
    });
}

export function saveImported(quiz: Quiz): string {
  const slug = `c-${slugify(quiz.title) || 'quiz'}-${hash(JSON.stringify(quiz))}`;
  const store = read();
  store[slug] = { quiz, added: Date.now() };
  write(store);
  return slug;
}

export function removeImported(slug: string) {
  const store = read();
  delete store[slug];
  write(store);
  movePlayed('jeopardy', slug, null);
  try {
    localStorage.removeItem(`jeopardy-quiz:game:${slug}`);
  } catch {
    /* ignore */
  }
}
