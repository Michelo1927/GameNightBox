// When each piece of content of the site was added: the date of the commit that added its file, read from git.
// The app imports it as `virtual:content-dates`: { "/content/topten/esempio.json": 1762819200000, ... } (ms).
// A file not committed yet has no date. On GitHub the checkout must have the whole history (fetch-depth: 0),
// otherwise every file would look added by the last commit.
import { execFileSync } from 'node:child_process';
import type { Plugin } from 'vite';

const ID = 'virtual:content-dates';
const RESOLVED = '\0' + ID;
const FILE = /^(content\/[^/]+\/[^/]+\.json|quizzes\/[^/]+\/quiz\.json)$/;

function readDates(root: string): Record<string, number> {
  let log = '';
  try {
    log = execFileSync('git', ['log', '--diff-filter=A', '--name-only', '--format=@%ct', '--', 'content', 'quizzes'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return {}; // no git: no dates, the lists still work
  }
  const dates: Record<string, number> = {};
  let when = 0;
  // Newest commit first: the last one seen for a file is the one that first added it.
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) when = Number(line.slice(1)) * 1000;
    else if (FILE.test(line.trim())) dates['/' + line.trim()] = when;
  }
  return dates;
}

export default function datesPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'gnb-content-dates',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === ID ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      return `export default ${JSON.stringify(readDates(root))};`;
    },
  };
}
