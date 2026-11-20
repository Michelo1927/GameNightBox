// A pack: several games (of any kind) in one file, made by someone (e.g. a streamer's mod) for someone else to play.
//
//   - #/pacchetto          the mod adds the games, gets one AI prompt for each, pastes the answers and downloads the file;
//   - #/pacchetto/carica   whoever plays opens the file: every game is saved in its own game, and the tournament can
//                          start from them (the wheel gives each game its content, see pickFor in tournament.ts).
//
// The file holds a code like the games' own ("GNB1." + base64url of the deflated JSON, see share.ts):
//   { "title": "…", "author": "…", "items": [ { "game": "jeopardy", "data": { …the quiz… } }, { "game": "catena", "site": "<slug>" } ] }
// An item is the content itself (`data`), or a content of the site by its slug (`site`): the site's contents may have
// files of their own (photos of a quiz) that only the site has.
import type { Game } from './games';
import { CODES, decode, encode, PACK_PREFIX } from './share';
import type { PackContent } from './tournament';
import { tr } from './i18n';

export interface PackItem {
  game: string;
  data?: unknown;
  site?: string;
}

export interface Pack {
  title: string;
  author?: string;
  items: PackItem[];
}

export const encodePack = (pack: Pack) => encode(PACK_PREFIX, pack);

function isPack(d: unknown): d is Pack {
  const p = d as Pack;
  return !!p && typeof p === 'object' && typeof p.title === 'string' && Array.isArray(p.items)
    && p.items.every((i) => i && typeof i.game === 'string' && (i.data !== undefined || typeof i.site === 'string'));
}

/** A pack's code, a link with it or its JSON; a single game's code is read as a pack of one game. */
export async function decodePack(input: string): Promise<Pack> {
  const text = input.replace(/\s+/g, '');
  const single = !text.includes(PACK_PREFIX) && CODES.find((c) => text.includes(c.prefix));
  if (single) {
    const data = await decode(input, single.prefix);
    const title = (data as { title?: unknown })?.title;
    return { title: typeof title === 'string' ? title : single.name, items: [{ game: single.game, data }] };
  }
  const d = await decode(input, PACK_PREFIX);
  if (!isPack(d)) throw new Error(tr('Questo non è un pacchetto di partite valido.', 'This is not a valid pack of games.'));
  return d;
}

/** An item of a pack, checked against the games of this site. */
export interface Resolved {
  item: PackItem;
  game?: Game;
  title: string;
  summary: string;
  errors: string[];
}

export function resolve(item: PackItem, games: Game[]): Resolved {
  const game = games.find((g) => g.id === item.game);
  if (!game) return { item, title: item.game, summary: '', errors: [tr(`Gioco sconosciuto: "${item.game}" (aggiorna la pagina)`, `Unknown game: "${item.game}" (reload the page)`)] };
  const c = game.content;
  let data = item.data;
  if (item.site) {
    const found = c.all().find((x) => x.slug === item.site && !x.local);
    if (!found) return { item, game, title: item.site, summary: '', errors: [tr('Non c’è più sul sito', 'No longer on the site')] };
    data = found.data;
  }
  const errors = c.ai.validate(data).errors;
  if (errors.length) {
    const title = (data as { title?: unknown })?.title;
    return { item, game, title: typeof title === 'string' ? title : game.name, summary: '', errors };
  }
  return { item, game, title: c.title(data), summary: c.summary(data), errors: [] };
}

/** Saves the valid games of a pack on this device: their contents by game, in the pack's order. */
export function savePack(resolved: Resolved[]): Record<string, PackContent[]> {
  const out: Record<string, PackContent[]> = {};
  for (const r of resolved) {
    if (!r.game || r.errors.length) continue;
    const slug = r.item.site ?? r.game.content.save(r.item.data);
    (out[r.game.id] ??= []).push({ slug, title: r.title });
  }
  return out;
}

/** The pack's file name: its title, without characters a file name can't have. */
export const packFileName = (title: string) => `${title.replace(/[^\w\s-]/g, '').trim() || tr('pacchetto', 'pack')}.txt`;
