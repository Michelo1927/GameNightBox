// Dev-only API used by the quiz editor (#/editor) to read and write files in quizzes/.
// It is active only with `npm run dev`; the published site has no editor and no API.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import type { Plugin } from 'vite';
import { validateQuiz } from './src/games/jeopardy/quiz/schema';

const SLUG = /^[a-z0-9][a-z0-9-]{0,60}$/;
const MAX_UPLOAD = 60 * 1024 * 1024;

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_UPLOAD) {
        reject(new Error('File troppo grande (max 60 MB)'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/** "Foto Zucca (1).JPG" -> "foto-zucca-1.jpg" */
function safeFileName(name: string) {
  const ext = extname(name).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const base = name
    .slice(0, name.length - extname(name).length)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${base || 'file'}${ext}`;
}

function uniqueName(dir: string, name: string) {
  if (!existsSync(join(dir, name))) return name;
  const ext = extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 2; ; i++) if (!existsSync(join(dir, `${base}-${i}${ext}`))) return `${base}-${i}${ext}`;
}

export default function editorPlugin(): Plugin {
  let quizzesDir = '';
  return {
    name: 'jeopardy-quiz-editor',
    apply: 'serve',
    configResolved(config) {
      quizzesDir = join(config.root, 'quizzes');
    },
    configureServer(server) {
      server.middlewares.use('/__editor', async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://x');
          const [, kind, slug] = url.pathname.split('/');

          // GET /__editor/quizzes -> [{ slug, title }]
          if (kind === 'quizzes' && req.method === 'GET') {
            const list = readdirSync(quizzesDir, { withFileTypes: true })
              .filter((d) => d.isDirectory() && existsSync(join(quizzesDir, d.name, 'quiz.json')))
              .map((d) => {
                let title = d.name;
                try {
                  title = JSON.parse(readFileSync(join(quizzesDir, d.name, 'quiz.json'), 'utf8')).title || d.name;
                } catch { /* broken JSON: show the slug */ }
                return { slug: d.name, title };
              });
            return send(res, 200, list);
          }

          if (!slug || !SLUG.test(slug)) return send(res, 400, { error: 'Nome cartella non valido' });
          const dir = join(quizzesDir, slug);
          const file = join(dir, 'quiz.json');

          if (kind === 'quiz') {
            if (req.method === 'GET') {
              if (!existsSync(file)) return send(res, 404, { error: 'Quiz non trovato' });
              return send(res, 200, JSON.parse(readFileSync(file, 'utf8')));
            }
            // POST creates (fails if it exists), PUT saves.
            if (req.method === 'POST' || req.method === 'PUT') {
              if (req.method === 'POST' && existsSync(file)) return send(res, 409, { error: 'Esiste già un quiz con questo nome' });
              const quiz = JSON.parse((await readBody(req)).toString('utf8'));
              mkdirSync(dir, { recursive: true });
              writeFileSync(file, JSON.stringify(quiz, null, 2) + '\n', 'utf8');
              return send(res, 200, validateQuiz(quiz));
            }
          }

          // POST /__editor/media/<slug>?name=<file> with the raw bytes -> { name }
          if (kind === 'media' && req.method === 'POST') {
            const original = url.searchParams.get('name') ?? 'file';
            const data = await readBody(req);
            mkdirSync(dir, { recursive: true });
            const name = uniqueName(dir, safeFileName(original));
            writeFileSync(join(dir, name), data);
            return send(res, 200, { name });
          }

          send(res, 404, { error: 'Richiesta non riconosciuta' });
        } catch (e) {
          send(res, 500, { error: (e as Error).message });
        }
      });
    },
  };
}
