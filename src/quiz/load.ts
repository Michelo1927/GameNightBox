import { validateQuiz, type Quiz } from './schema';

// Every quizzes/<slug>/quiz.json is bundled at build time.
const quizModules = import.meta.glob('/quizzes/*/quiz.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const mediaModules = import.meta.glob(
  '/quizzes/**/*.{png,jpg,jpeg,gif,webp,svg,avif,PNG,JPG,JPEG,GIF,WEBP,mp3,wav,ogg,m4a,aac,MP3,WAV,mp4,webm,mov,MP4}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

export interface LoadedQuiz {
  slug: string;
  quiz: Quiz;
  errors: string[];
  warnings: string[];
}

export const quizzes: LoadedQuiz[] = Object.entries(quizModules)
  .map(([path, data]) => {
    const slug = path.split('/')[2];
    const { errors, warnings } = validateQuiz(data);
    const quiz = data as Quiz;
    if (errors.length === 0) {
      for (const c of quiz.categories) c.questions.sort((a, b) => a.points - b.points);
    }
    return { slug, quiz, errors, warnings };
  })
  .sort((a, b) => (a.quiz.title ?? a.slug).localeCompare(b.quiz.title ?? b.slug));

export function findQuiz(slug: string): LoadedQuiz | undefined {
  return quizzes.find((q) => q.slug === slug);
}

/** Turns a media src (file name in the quiz folder, or URL) into a usable URL. */
export function mediaUrl(slug: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  const clean = src.replace(/^\.?\//, '');
  return mediaModules[`/quizzes/${slug}/${clean}`] ?? '';
}
