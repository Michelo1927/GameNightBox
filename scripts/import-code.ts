// Saves something shared as a code (from a game's creator) into the repo:
//   Jeopardy → quizzes/<slug>/ (embedded photos become separate files, so the quiz behaves like the others)
//   Passaparola, Catena, Musichiere, Top Ten, Sbagliato!, In fila!, All'asta!, In ritardo! → content/<game>/<slug>.json
// A pack of games (GNB1., see src/hub/pack.ts) saves each of its games the same way (the site's own contents it
// names by slug are already in the repo).
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
import { validateRitardo } from '../src/games/ritardo/schema';
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
  { prefix: 'RI1.', game: 'ritardo', key: 'domande', validate: validateRitardo },
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

type Kind = (typeof GAMES)[number];
const PACK_PREFIX = 'GNB1.';
const inflate = (code: string) => JSON.parse(inflateRawSync(Buffer.from(code, 'base64url')).toString('utf8'));

/** Saves one content in the repo; returns false (with the reason printed) when it can't. */
function saveOne(kind: Kind, data: Record<string, unknown>, slugArg?: string): boolean {
  const { errors } = kind.validate(data);
  if (errors.length) {
    console.error(`Ci sono errori in "${String(data.title)}" (${kind.game}):\n- ` + errors.join('\n- '));
    return false;
  }

  if (kind.game !== 'jeopardy') {
    const slug = slugArg ?? (slugify(String(data.title)) || kind.game);
    const dir = join(import.meta.dirname, '..', 'content', kind.game);
    const file = join(dir, `${slug}.json`);
    if (existsSync(file)) {
      console.error(`Esiste già content/${kind.game}/${slug}.json: scegli un altro nome, es. npm run import -- <codice> ${slug}-2`);
      return false;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✓ Salvato in content/${kind.game}/${slug}.json`);
    console.log(`  Controlla con: npm run validate -- ${kind.game}/${slug}${kind.game === 'musichiere' ? ' --online' : ''}`);
    return true;
  }
  const quiz = data as unknown as Quiz;

  const slug = slugArg ?? (slugify(quiz.title) || 'quiz');
  const dir = join(import.meta.dirname, '..', 'quizzes', slug);
  if (existsSync(join(dir, 'quiz.json'))) {
    console.error(`Esiste già quizzes/${slug}: scegli un altro nome, es. npm run import -- <codice> ${slug}-2`);
    return false;
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
  return true;
}

let data: Record<string, unknown>;
let kind: Kind | undefined;
if (text.startsWith('{')) {
  data = JSON.parse(text);
  kind = GAMES.find((g) => g.key in data);
} else if (text.includes(PACK_PREFIX)) {
  data = inflate(text.slice(text.indexOf(PACK_PREFIX) + PACK_PREFIX.length));
} else {
  const found = GAMES.map((g) => ({ g, at: text.indexOf(g.prefix) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at)[0];
  if (!found) throw new Error(`Codice non valido: deve contenere ${[...GAMES.map((g) => g.prefix), PACK_PREFIX].map((p) => `"${p}"`).join(', ')}`);
  kind = found.g;
  data = inflate(text.slice(found.at + found.g.prefix.length));
}

if (Array.isArray(data.items)) {
  // A pack: every game in it.
  const items = data.items as { game: string; data?: Record<string, unknown>; site?: string }[];
  console.log(`Pacchetto "${String(data.title)}": ${items.length} partite`);
  let ok = 0;
  for (const item of items) {
    const k = GAMES.find((g) => g.game === item.game);
    if (item.site) {
      console.log(`· ${item.game}/${item.site}: è già sul sito`);
      ok++;
    } else if (!k || !item.data) console.error(`Gioco sconosciuto: ${item.game}`);
    else if (saveOne(k, item.data)) ok++;
  }
  console.log(`${ok} di ${items.length} partite a posto`);
  process.exit(ok === items.length ? 0 : 1);
}
if (!kind) throw new Error('Non capisco di che gioco è questo JSON');
process.exit(saveOne(kind, data, slugArg) ? 0 : 1);
