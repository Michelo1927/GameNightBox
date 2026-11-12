// Content <-> shareable text code: "<PREFIX>" + base64url of the deflated JSON (e.g. "PP1.eJx…").
// The same format is read by scripts/import-code.ts to save shared content into the repo.

/** Code prefix of each game, so a code pasted in the wrong game can say where it belongs. */
export const CODES: { prefix: string; game: string; name: string }[] = [
  { prefix: 'JQ1.', game: 'jeopardy', name: 'Jeopardy' },
  { prefix: 'PP1.', game: 'passaparola', name: 'Passaparola' },
  { prefix: 'CT1.', game: 'catena', name: 'Catena' },
  { prefix: 'MU1.', game: 'musichiere', name: 'Musichiere' },
  { prefix: 'TT1.', game: 'topten', name: 'Top Ten' },
  { prefix: 'SB1.', game: 'sbagliato', name: 'Sbagliato!' },
  { prefix: 'IF1.', game: 'infila', name: 'In fila!' },
];

/** Codes longer than this don't fit in a chat message: share them as a file. */
export const MESSAGE_LIMIT = 60000;

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

export async function encode(prefix: string, data: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(data));
  return prefix + toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/**
 * Accepts a code, a link containing it (…/carica/<code>) or plain JSON. Returns the parsed data,
 * or throws a message for the person (wrong game, broken code…).
 */
export async function decode(input: string, prefix: string): Promise<unknown> {
  let text = input.trim();
  const link = text.indexOf('/carica/');
  if (link >= 0) text = decodeURIComponent(text.slice(link + '/carica/'.length));
  text = text.replace(/\s+/g, '');
  if (text.startsWith('{')) {
    try {
      return JSON.parse(input);
    } catch {
      throw new Error('Il testo incollato sembra JSON ma è incompleto: ricopialo per intero');
    }
  }

  const start = text.indexOf(prefix);
  if (start < 0) {
    const other = CODES.find((c) => text.includes(c.prefix));
    if (other) throw new Error(`Questo è un codice di ${other.name}: aprilo dalla pagina di ${other.name} (📥 Carica).`);
    throw new Error(`Questo non sembra un codice valido: deve iniziare con "${prefix}"`);
  }
  try {
    const bytes = await pipe(fromBase64Url(text.slice(start + prefix.length)), new DecompressionStream('deflate-raw'));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Il codice è incompleto o danneggiato: ricopialo per intero');
  }
}
