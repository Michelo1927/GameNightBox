// Pages are a tree, like folders: the hub holds the games, a game holds its contents and its creation pages.
//
//   #/                          hub
//   #/<game>                    the game's page (its contents)
//   #/<game>/<slug>/setup       teams and options of one content
//   #/<game>/<slug>/play        the game being played
//   #/<game>/crea[/...]         creator (Jeopardy: one page per question below it)
//   #/<game>/claude, /carica    create with Claude, load a code
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

/** Opens a page: up to the folder it shares with the current one, then down to it. */
export async function go(path: string) {
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
