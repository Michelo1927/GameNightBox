// Saves a quiz shared as a code (from the "Crea un quiz" page) into quizzes/<slug>/.
// Embedded photos become separate files, so the quiz behaves like the others in the repo.
// Usage: npm run import -- <file-with-code.txt | code | link> [slug]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { slugify, validateQuiz, type Media, type Quiz } from '../src/quiz/schema';

const [input, slugArg] = process.argv.slice(2);
if (!input) {
  console.error('Uso: npm run import -- <file.txt | codice | link> [nome-cartella]');
  process.exit(1);
}

let text = existsSync(input) ? readFileSync(input, 'utf8') : input;
const link = text.indexOf('#/carica/');
if (link >= 0) text = decodeURIComponent(text.slice(link + '#/carica/'.length));
text = text.replace(/\s+/g, '');

let quiz: Quiz;
if (text.startsWith('{')) quiz = JSON.parse(text);
else {
  const start = text.indexOf('JQ1.');
  if (start < 0) throw new Error('Codice non valido: deve contenere "JQ1."');
  quiz = JSON.parse(inflateRawSync(Buffer.from(text.slice(start + 4), 'base64url')).toString('utf8'));
}

const { errors } = validateQuiz(quiz);
if (errors.length) {
  console.error('Il quiz contiene errori:\n- ' + errors.join('\n- '));
  process.exit(1);
}

const slug = slugArg ?? (slugify(quiz.title) || 'quiz');
const dir = join(import.meta.dirname, '..', 'quizzes', slug);
if (existsSync(join(dir, 'quiz.json'))) {
  console.error(`Esiste già quizzes/${slug}: scegli un altro nome, es. npm run import -- <codice> ${slug}-2`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });

let n = 0;
const extract = (m: Media | undefined, name: string): Media | undefined => {
  const match = m?.src.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m || !match) return m;
  const file = `${name}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  writeFileSync(join(dir, file), Buffer.from(match[2], 'base64'));
  n++;
  return { ...m, src: file };
};
quiz.categories.forEach((c, ci) =>
  c.questions.forEach((q) => {
    q.media = extract(q.media, `c${ci + 1}-${q.points}`);
    q.answerMedia = extract(q.answerMedia, `c${ci + 1}-${q.points}-risposta`);
  }),
);
if (quiz.final) {
  quiz.final.media = extract(quiz.final.media, 'finale');
  quiz.final.answerMedia = extract(quiz.final.answerMedia, 'finale-risposta');
}

writeFileSync(join(dir, 'quiz.json'), JSON.stringify(quiz, null, 2) + '\n', 'utf8');
console.log(`✓ Salvato in quizzes/${slug}/ (${n} immagini estratte)`);
console.log(`  Controlla con: npm run validate -- ${slug} --online`);
