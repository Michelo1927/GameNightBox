import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

const VERSION_PLACEHOLDER = "'__SW_VERSION__'";
const FILES_PLACEHOLDER = '[/*__SW_FILES__*/]';

function walk(dir: string, base: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(full.slice(base.length + 1).split('\\').join('/'));
  }
}

// Dopo la build scrive in dist/sw.js la versione (hash dei file) e l'elenco dei file da mettere in cache.
export default function swPlugin(): Plugin {
  let outDir = 'dist';
  let written = false;
  return {
    name: 'gnb-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      written = true;
    },
    closeBundle() {
      // A failed build also ends here: without this its real error would be hidden by ours.
      if (!written) return;
      const files: string[] = [];
      walk(outDir, outDir, files);
      const list = files.filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const f of list) {
        hash.update(f + createHash('sha256').update(readFileSync(join(outDir, f))).digest('hex'));
      }
      const version = hash.digest('hex').slice(0, 10);
      const urls = list.map((f) => (f === 'index.html' ? './' : f));

      const swPath = join(outDir, 'sw.js');
      const src = readFileSync(swPath, 'utf8');
      for (const p of [VERSION_PLACEHOLDER, FILES_PLACEHOLDER]) {
        if (!src.includes(p)) throw new Error(`[gnb-sw] segnaposto ${p} non trovato in ${swPath}`);
      }
      writeFileSync(
        swPath,
        src
          .replace(VERSION_PLACEHOLDER, () => JSON.stringify(version))
          .replace(FILES_PLACEHOLDER, () => JSON.stringify(urls)),
      );
    },
  };
}
