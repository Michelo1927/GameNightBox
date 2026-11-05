// Quiz <-> shareable text code ("JQ1." + base64url of the deflated JSON).
// The same format is read by scripts/import-code.ts to save a shared quiz into the repo.
import { validateQuiz, type Quiz } from './schema';

const PREFIX = 'JQ1.';

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream) {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeQuiz(quiz: Quiz): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(quiz));
  return PREFIX + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Accepts a code, a link containing it (…#/carica/<code>) or plain quiz JSON. */
export async function decodeQuiz(input: string): Promise<Quiz> {
  let text = input.trim();
  const link = text.indexOf('#/carica/');
  if (link >= 0) text = decodeURIComponent(text.slice(link + '#/carica/'.length));
  text = text.replace(/\s+/g, '');

  let data: unknown;
  if (text.startsWith('{')) {
    data = JSON.parse(input);
  } else {
    const start = text.indexOf(PREFIX);
    if (start < 0) throw new Error('Questo non sembra un codice quiz: deve iniziare con "JQ1."');
    try {
      const bytes = await pipe(fromBase64Url(text.slice(start + PREFIX.length)), new DecompressionStream('deflate-raw'));
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error('Il codice è incompleto o danneggiato: ricopialo per intero');
    }
  }
  const { errors } = validateQuiz(data);
  if (errors.length) throw new Error(`Il quiz contiene errori: ${errors.slice(0, 3).join('; ')}`);
  return data as Quiz;
}
