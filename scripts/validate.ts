// Checks every quizzes/<slug>/quiz.json: format, and that referenced media files exist.
// Usage: npm run validate            (all quizzes)
//        npm run validate -- <slug>  (one quiz)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localMediaFiles, validateQuiz, type Quiz } from '../src/quiz/schema';

const root = join(import.meta.dirname, '..', 'quizzes');
const only = process.argv[2];
const slugs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && (!only || d.name === only))
  .map((d) => d.name);

if (only && slugs.length === 0) {
  console.error(`Quiz "${only}" non trovato in quizzes/`);
  process.exit(1);
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
  if (errors.length === 0) {
    for (const src of localMediaFiles(data as Quiz)) {
      if (!existsSync(join(root, slug, src))) errors.push(`file media mancante: ${src}`);
    }
  }
  console.log(`${errors.length ? '✗' : '✓'} ${slug}`);
  for (const e of errors) console.log(`   errore: ${e}`);
  for (const w of warnings) console.log(`   avviso: ${w}`);
  if (errors.length) failed++;
}

console.log(failed ? `\n${failed} quiz con errori` : `\nTutti i ${slugs.length} quiz sono validi`);
process.exit(failed ? 1 : 0);
