// Checks every quizzes/<slug>/quiz.json: format, and that referenced media files exist.
// Usage: npm run validate                     (all quizzes)
//        npm run validate -- <slug>           (one quiz)
//        npm run validate -- <slug> --online  (also checks YouTube links and prints the video titles)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localMediaFiles, validateQuiz, youtubeId, type Media, type Quiz } from '../src/games/jeopardy/quiz/schema';

const root = join(import.meta.dirname, '..', 'quizzes');
const args = process.argv.slice(2);
const online = args.includes('--online');
const only = args.find((a) => !a.startsWith('--'));
const slugs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!only || d.name === only))
  .map((d) => d.name);

if (only && slugs.length === 0) {
  console.error(`Quiz "${only}" non trovato in quizzes/`);
  process.exit(1);
}

/** Looks a video up via YouTube oEmbed: returns its title, or an error message. */
async function checkYouTube(src: string): Promise<{ title?: string; error?: string }> {
  const id = youtubeId(src);
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  if (res.status === 401 || res.status === 403) return { error: 'il video non può essere incorporato in altri siti' };
  if (!res.ok) return { error: 'video inesistente o privato' };
  const data = (await res.json()) as { title: string; author_name: string };
  return { title: `${data.title} (${data.author_name})` };
}

let failed = 0;
for (const slug of slugs) {
  const file = join(root, slug, 'quiz.json');
  if (!existsSync(file)) {
    console.log(`✗ ${slug}: manca quiz.json`);
    failed++;
    continue;
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.log(`✗ ${slug}: JSON non valido - ${(e as Error).message}`);
    failed++;
    continue;
  }
  const { errors, warnings } = validateQuiz(data);
  const info: string[] = [];
  if (errors.length === 0) {
    const quiz = data as Quiz;
    for (const src of localMediaFiles(quiz)) {
      if (!existsSync(join(root, slug, src))) errors.push(`file media mancante: ${src}`);
    }
    if (online) {
      const items = quiz.categories.flatMap((cat) => cat.questions.map((q) => ({ where: `${cat.name} ${q.points}`, q: q as { media?: Media; answerMedia?: Media } })));
      if (quiz.final) items.push({ where: 'Domanda finale', q: quiz.final });
      for (const { where, q } of items) for (const m of [q.media, q.answerMedia]) {
        if (m?.type !== 'youtube') continue;
        try {
          const r = await checkYouTube(m.src);
          if (r.error) errors.push(`${where}: YouTube ${m.src} - ${r.error}`);
          else info.push(`${where}: YouTube → ${r.title}`);
        } catch (e) {
          warnings.push(`${where}: impossibile verificare ${m.src} (${(e as Error).message})`);
        }
      }
    }
  }
  console.log(`${errors.length ? '✗' : '✓'} ${slug}`);
  for (const e of errors) console.log(`   errore: ${e}`);
  for (const w of warnings) console.log(`   avviso: ${w}`);
  for (const i of info) console.log(`   ${i}`);
  if (errors.length) failed++;
}

console.log(failed ? `\n${failed} quiz con errori` : `\nTutti i ${slugs.length} quiz sono validi`);
process.exit(failed ? 1 : 0);
