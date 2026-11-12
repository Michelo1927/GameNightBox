// Saves something shared as a code (from a game's creator) into the repo:
//   Jeopardy → quizzes/<slug>/ (embedded photos become separate files, so the quiz behaves like the others)
//   Passaparola, Catena, Musichiere, Top Ten, Sbagliato!, In fila!, All'asta! → content/<game>/<slug>.json
// Usage: npm run import -- <file-with-code.txt | code | link> [slug]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { validateCatena } from '../src/games/catena/schema';
import { slugify, validateQuiz, type Media, type Quiz } from '../src/games/jeopardy/quiz/schema';
import { validatePlaylist } from '../src/games/musichiere/schema';
import { validatePassaparola } from '../src/games/passaparola/schema';
import { validateTopTen } from '../src/games/topten/schema';
import { validateSbagliato } from '../src/games/sbagliato/schema';
import { validateInFila } from '../src/games/infila/schema';
import { validateAsta } from '../src/games/asta/schema';
import type { Validation } from '../src/hub/content';

const GAMES: { prefix: string; game: string; key: string; validate: (d: unknown) => Validation }[] = [
  { prefix: 'JQ1.', game: 'jeopardy', key: 'categories', validate: validateQuiz },
  { prefix: 'PP1.', game: 'passaparola', key: 'ruote', validate: validatePassaparola },
  { prefix: 'CT1.', game: 'catena', key: 'catene', validate: validateCatena },
  { prefix: 'MU1.', game: 'musichiere', key: 'songs', validate: validatePlaylist },
  { prefix: 'TT1.', game: 'topten', key: 'liste', validate: validateTopTen },
  { prefix: 'SB1.', game: 'sbagliato', key: 'domande', validate: validateSbagliato },
  { prefix: 'IF1.', game: 'infila', key: 'sequenze', validate: validateInFila },
  { prefix: 'AS1.', game: 'asta', key: 'temi', validate: validateAsta },
];

const [input, slugArg] = process.argv.slice(2);
if (!input) {
  console.error('Uso: npm run import -- <file.txt | codice | link> [nome]');
  process.exit(1);
}

let text = existsSync(input) ? readFileSync(input, 'utf8') : input;
const link = text.search(/#\/(\w+\/)?carica\//);
if (link >= 0) text = decodeURIComponent(text.slice(text.indexOf('carica/', link) + 'carica/'.length));
text = text.replace(/\s+/g, '');

let data: Record<string, unknown>;
let kind: (typeof GAMES)[number] | undefined;
if (text.startsWith('{')) {
  data = JSON.parse(text);
  kind = GAMES.find((g) => g.key in data);
} else {
  const found = GAMES.map((g) => ({ g, at: text.indexOf(g.prefix) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at)[0];
  if (!found) throw new Error(`Codice non valido: deve contenere ${GAMES.map((g) => `"${g.prefix}"`).join(', ')}`);
  kind = found.g;
  data = JSON.parse(inflateRawSync(Buffer.from(text.slice(found.at + found.g.prefix.length), 'base64url')).toString('utf8'));
}
if (!kind) throw new Error('Non capisco di che gioco è questo JSON');

const { errors } = kind.validate(data);
if (errors.length) {
  console.error('Ci sono errori:\n- ' + errors.join('\n- '));
  process.exit(1);
}

if (kind.game !== 'jeopardy') {
  const slug = slugArg ?? (slugify(String(data.title)) || kind.game);
  const dir = join(import.meta.dirname, '..', 'content', kind.game);
  const file = join(dir, `${slug}.json`);
  if (existsSync(file)) {
    console.error(`Esiste già content/${kind.game}/${slug}.json: scegli un altro nome, es. npm run import -- <codice> ${slug}-2`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`✓ Salvato in content/${kind.game}/${slug}.json`);
  console.log(`  Controlla con: npm run validate -- ${kind.game}/${slug}${kind.game === 'musichiere' ? ' --online' : ''}`);
  process.exit(0);
}
const quiz = data as unknown as Quiz;

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
