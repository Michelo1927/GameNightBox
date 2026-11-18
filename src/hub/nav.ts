// Pages are a tree, like folders: the hub holds the games, a game holds its contents and its creation pages.
//
//   #/                          hub
//   #/<game>                    the game's page (its contents)
//   #/<game>/<slug>/setup       teams and options of one content
//   #/<game>/<slug>/play        the game being played
//   #/<game>/<slug>~<n>/...     another game on the same content, with its own teams and save (n = 2, 3, ...)
//   #/<game>/crea[/...]         creator (Jeopardy: one page per question below it)
//   #/<game>/claude, /carica    create with Claude, load a code
//   #/torneo[/nuovo]            the tournament (and a new one)
//   #/torneo/<game>/...         a game played inside the tournament: the same pages as above, under the tournament,
//                               with their own saves (see gameKey in content.ts)
//
// The browser history is kept equal to the path from the hub to the page on screen, so the browser's (or the
// phone's) back button always goes one folder up, the same as the back buttons on the pages. Every move goes
// through go(): it goes back to the folder the two pages share, then forward into the new page.
import { useEffect, useState } from 'react';

type Alias = (parts: string[]) => string[] | null;
const aliases: Alias[] = [];

/** Old addresses still in use (shared links) mapped to their page in the tree: see the Jeopardy game. */
export function addAlias(alias: Alias) {
  aliases.push(alias);
}

const split = (hash: string) => hash.replace(/^#?\/?/, '').split('/').filter(Boolean);

/** "#/a/b" form of any hash or path ("/a/b", "#a/b/", old addresses). */
export function norm(hash: string): string {
  let parts = split(hash);
  for (const alias of aliases) parts = alias(parts) ?? parts;
  return `#/${parts.join('/')}`;
}

/** The folder a page belongs to; null for the hub. */
export function parentOf(hash: string): string | null {
  const p = split(norm(hash));
  if (!p.length) return null;
  // A tournament game: its pages hang under the tournament instead of the hub.
  if (p[0] === 'torneo' && p.length > 1) {
    const inner = parentOf(`#/${p.slice(1).join('/')}`);
    return !inner || inner === '#/' ? '#/torneo' : inner.replace('#/', '#/torneo/');
  }
  const [game, page, arg] = p;
  const up = (...parts: string[]) => `#/${parts.join('/')}`;
  if (p.length === 1) return '#/';
  if (page === 'crea') return arg && arg !== 'nuovo' ? up(game, 'crea') : up(game);
  if (page === 'claude' || page === 'carica') return up(game);
  if (arg === 'play') return up(game, page, 'setup');
  return up(game);
}

/** The pages from the hub down to `hash`. */
export function chainOf(hash: string): string[] {
  const chain = [norm(hash)];
  for (let up = parentOf(chain[0]); up; up = parentOf(up)) chain.unshift(up);
  return chain;
}

// The app redraws on notify(), not on every hashchange: a move can pass through pages on its way.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let moving = false;

const stamp = (depth: number) => ({ gnb: true, depth });
const depthHere = (): number | undefined => (history.state?.gnb ? history.state.depth : undefined);

/** Rewrites the current history entry as the path from the hub to the page (a link opened from outside). */
function rebuild() {
  const chain = chainOf(location.hash);
  history.replaceState(stamp(1), '', chain[0]);
  chain.slice(1).forEach((h, i) => history.pushState(stamp(i + 2), '', h));
}

const backBy = (n: number) =>
  new Promise<void>((done) => {
    const end = () => {
      clearTimeout(timer);
      removeEventListener('popstate', end);
      done();
    };
    const timer = setTimeout(end, 500);
    addEventListener('popstate', end);
    history.go(-n);
  });

/**
 * Inside a tournament game, the game's own moves (to its setup, its board, its list of contents) stay inside the
 * tournament: the games write their usual addresses and here they get the tournament's prefix.
 */
function inTournament(path: string): string {
  const here = split(norm(location.hash));
  const to = split(norm(path));
  if (here[0] !== 'torneo' || !here[1] || here[1] === 'nuovo' || to[0] !== here[1]) return path;
  if (to[1] === 'crea' || to[1] === 'claude' || to[1] === 'carica') return path;
  return `#/torneo/${to.join('/')}`;
}

/**
 * On the pages of another game on the same content (#/<game>/<slug>~<n>/..., see slotOfPage in content.ts), the
 * game's moves to its own setup and board stay on that game: the games write the content's address, here it gets ~<n>.
 */
function inSlot(path: string): string {
  const here = split(norm(location.hash));
  const m = /^(.*)~(\d+)$/.exec(here[1] ?? '');
  if (here[0] === 'torneo' || !m) return path;
  const to = split(norm(path));
  const same = (a: string, b: string) => {
    try {
      return decodeURIComponent(a) === decodeURIComponent(b);
    } catch {
      return a === b;
    }
  };
  if (to[0] !== here[0] || !to[1] || !same(to[1], m[1]) || to.length < 3) return path;
  return `#/${[to[0], here[1], ...to.slice(2)].join('/')}`;
}

/** Opens a page: up to the folder it shares with the current one, then down to it (`exact`: no ~<n> added). */
export async function go(path: string, exact = false) {
  path = inTournament(path);
  if (!exact) path = inSlot(path);
  const target = chainOf(path);
  const here = chainOf(location.hash);
  if (target[target.length - 1] === here[here.length - 1]) return;
  let shared = 0;
  while (shared < target.length && shared < here.length && target[shared] === here[shared]) shared++;
  moving = true;
  try {
    // Going back is safe only if this entry was written by us at the depth we expect (otherwise we could
    // leave the site): then the entries below it are the folders above it.
    if (depthHere() === here.length) {
      if (here.length > shared) await backBy(here.length - shared);
    } else shared = 0;
    if (shared === 0) {
      history.replaceState(stamp(1), '', target[0]);
      shared = 1;
    }
    target.slice(shared).forEach((h, i) => history.pushState(stamp(shared + i + 1), '', h));
  } finally {
    moving = false;
    notify();
  }
}

/** Swaps the current page for one in the same folder (e.g. a loaded link becoming its game's setup). */
export function redirect(path: string) {
  const target = norm(path);
  history.replaceState(stamp(chainOf(target).length), '', target);
  setTimeout(notify);
}

/** The page on screen, in "#/a/b" form; redraws on every move. */
export function useHash() {
  const [hash, setHash] = useState(() => norm(location.hash));
  useEffect(() => {
    const on = () => setHash(norm(location.hash));
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  return hash;
}

/** Starts the navigation once: history in tree form, and every in-app link moving through go(). */
export function startNav() {
  if (depthHere() === undefined || norm(location.hash) !== location.hash) rebuild();
  addEventListener('hashchange', () => {
    if (moving) return;
    // An address typed in the bar, or an old one: put it in tree form.
    if (depthHere() === undefined || norm(location.hash) !== location.hash) rebuild();
    notify();
  });
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest?.('a');
    const href = a?.getAttribute('href');
    if (!a || !href?.startsWith('#') || a.target) return;
    e.preventDefault();
    go(href);
  });
}
