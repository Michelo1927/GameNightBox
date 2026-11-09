// Service worker: l'app si apre anche senza rete. Al build vengono iniettati VERSION e FILES (vite-plugin-sw.ts).
// Pagina, JS e CSS sono salvati all'installazione; i media (assets/, nomi con hash) alla prima richiesta, anche con Range.
// Pagina e icone: prima la rete, poi la copia salvata. Ad ogni nuova versione le vecchie cache vengono ripulite.
const VERSION = '__SW_VERSION__';
const FILES = [/*__SW_FILES__*/];

const CACHE = 'gnb-' + VERSION;
const SCOPE = self.registration.scope;
const ASSETS = SCOPE + 'assets/';
const URLS = FILES.map((f) => new URL(f, SCOPE).href);
const SHELL = URLS.filter((u) => !u.startsWith(ASSETS) || /\.(js|css)$/.test(u));

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        SHELL.map(async (u) => {
          const res = await fetch(new Request(u, { cache: 'reload' }));
          if (!res.ok) throw new Error('precache ' + u + ' ' + res.status);
          await cache.put(u, res);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const current = new Set(URLS);
      for (const name of await caches.keys()) {
        if (name === CACHE || !name.startsWith('gnb-')) continue;
        const old = await caches.open(name);
        for (const req of await old.keys()) {
          if (!current.has(req.url) || (await cache.match(req.url))) continue;
          const res = await old.match(req);
          if (res) await cache.put(req.url, res);
        }
        await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

// Risposta 206 ricavata dal file completo.
async function rangeResponse(full, header) {
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  let start, end;
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    } else {
      start = Math.max(size - Number(m[2]), 0);
      end = size - 1;
    }
  }
  if (start === undefined || start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

async function assetFetch(req) {
  const cache = await caches.open(CACHE);
  let res = await cache.match(req.url, { ignoreVary: true });
  if (!res) {
    res = await fetch(req.url);
    if (res.status === 200) await cache.put(req.url, res.clone());
  }
  const range = req.headers.get('Range');
  if (range && res.status === 200) return rangeResponse(res, range);
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.status === 200) await cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match(SCOPE) : undefined);
    return hit || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE)) return;
  e.respondWith(req.url.startsWith(ASSETS) ? assetFetch(req) : networkFirst(req));
});
