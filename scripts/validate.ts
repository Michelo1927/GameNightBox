// Checks every game's content: quizzes/<slug>/quiz.json (Jeopardy, with its media files)
// and content/<game>/<slug>.json (Passaparola, Catena, Musichiere).
// Usage: npm run validate                     (everything)
//        npm run validate -- <slug>           (one quiz or content file, e.g. "natura" or "catena/esempio")
//        npm run validate -- <slug> --online  (also checks YouTube links and prints the video titles)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localMediaFiles, validateQuiz, youtubeId, type Media, type Quiz } from '../src/games/jeopardy/quiz/schema';
import { validatePassaparola } from '../src/games/passaparola/schema';
import { validateCatena } from '../src/games/catena/schema';
import { validatePlaylist, type Playlist } from '../src/games/musichiere/schema';
import { validateTopTen } from '../src/games/topten/schema';
import { validateSbagliato } from '../src/games/sbagliato/schema';
import { validateInFila } from '../src/games/infila/schema';
import { validateAsta } from '../src/games/asta/schema';
import type { Validation } from '../src/hub/content';

const root = join(import.meta.dirname, '..', 'quizzes');
const args = process.argv.slice(2);
const online = args.includes('--online');
const only = args.find((a) => !a.startsWith('--'));
const wanted = (game: string, slug: string) => !only || only === slug || only === `${game}/${slug}`;
const slugs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && wanted('jeopardy', d.name))
  .map((d) => d.name);

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

// --- the other games: content/<game>/<slug>.json ---
const contentRoot = join(import.meta.dirname, '..', 'content');
const validators: Record<string, (d: unknown) => Validation> = {
  passaparola: validatePassaparola,
  catena: validateCatena,
  musichiere: validatePlaylist,
  topten: validateTopTen,
  sbagliato: validateSbagliato,
  infila: validateInFila,
  asta: validateAsta,
};
let checked = slugs.length;
for (const [game, validate] of Object.entries(validators)) {
  const dir = join(contentRoot, game);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const slug = file.replace(/\.json$/, '');
    if (!wanted(game, slug)) continue;
    checked++;
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (e) {
      console.log(`✗ ${game}/${slug}: JSON non valido - ${(e as Error).message}`);
      failed++;
      continue;
    }
    const { errors, warnings } = validate(data);
    const info: string[] = [];
    if (online && game === 'musichiere' && errors.length === 0) {
      for (const song of (data as Playlist).songs) {
        try {
          const r = await checkYouTube(song.youtube);
          if (r.error) errors.push(`${song.title}: YouTube ${song.youtube} - ${r.error}`);
          else info.push(`${song.title}: YouTube → ${r.title}`);
        } catch (e) {
          warnings.push(`${song.title}: impossibile verificare ${song.youtube} (${(e as Error).message})`);
        }
      }
    }
    console.log(`${errors.length ? '✗' : '✓'} ${game}/${slug}`);
    for (const e of errors) console.log(`   errore: ${e}`);
    for (const w of warnings) console.log(`   avviso: ${w}`);
    for (const i of info) console.log(`   ${i}`);
    if (errors.length) failed++;
  }
}

if (only && checked === 0) {
  console.error(`"${only}" non trovato in quizzes/ né in content/`);
  process.exit(1);
}
console.log(failed ? `\n${failed} file con errori` : `\nTutti i ${checked} contenuti sono validi`);
process.exit(failed ? 1 : 0);
