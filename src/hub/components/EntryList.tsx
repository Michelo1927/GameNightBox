import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { playedSlugs, setPlayed } from '../played';

/** A button on a row (edit, remove, archive…): an icon, named by its title. */
export interface EntryAction {
  icon: string;
  title: string;
  onClick: () => void;
}

/** One game to play, as a row of a game's list. */
export interface Entry {
  slug: string;
  title: string;
  description?: string;
  /** Short facts, e.g. "6 liste". */
  info?: string[];
  /** When it was added to the site, or saved on this device (ms). */
  date?: number;
  /** Saved on this device, not part of the site. */
  mine?: boolean;
  /** Where it opens; missing when it can't be played. */
  href?: string;
  errors?: string[];
  /** A game in progress is saved for it. */
  playing?: boolean;
  icon: ReactNode;
  actions?: EntryAction[];
}

type Tab = 'mine' | 'site';

interface Props {
  game: string;
  entries: Entry[];
  /** Shown in "Le tue" when there is none: the buttons to make one are already at the top of the page. */
  emptyMine?: string;
  emptySite?: string;
  /** The words for a masculine noun ("i tuoi quiz") instead of "le tue partite". */
  masculine?: boolean;
}

const WORDS = {
  f: { mine: 'Le tue', saved: 'salvate', ready: 'pronte', savedOne: 'salvata', addedOne: 'aggiunta', done: 'Fatta', mark: 'già fatta' },
  m: { mine: 'I tuoi', saved: 'salvati', ready: 'pronti', savedOne: 'salvato', addedOne: 'aggiunto', done: 'Fatto', mark: 'già fatto' },
};
type Words = (typeof WORDS)['f'];

/**
 * A game's list: two tabs, "Le tue" (saved on this device) and "Del sito", each a grid of compact rows at most
 * three and a half rows high (the half row shows there is more), scrolling on its own.
 * Each row can be marked as already played: it fades and goes to the bottom.
 */
export default function EntryList({
  game,
  entries,
  emptyMine = 'Non hai ancora partite tue: creane una con i pulsanti in alto.',
  emptySite = 'Ancora niente qui.',
  masculine = false,
}: Props) {
  const w = WORDS[masculine ? 'm' : 'f'];
  const [played, setPlayedSet] = useState(() => playedSlugs(game));
  const mine = sortEntries(entries.filter((e) => e.mine), played);
  const site = sortEntries(entries.filter((e) => !e.mine), played);
  const [tab, setTab] = useState<Tab>(() => savedTab(game) ?? (mine.length ? 'mine' : 'site'));
  const open = (t: Tab) => {
    setTab(t);
    try {
      sessionStorage.setItem(tabKey(game), t);
    } catch {
      /* only a convenience */
    }
  };
  const shown = tab === 'mine' ? mine : site;
  const toggle = (slug: string) => setPlayedSet(setPlayed(game, slug, !played.has(slug)));

  return (
    <section className="entry-list">
      <div className="entry-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'on' : ''} onClick={() => open('mine')}>
          {w.mine} <b>{mine.length}</b>
        </button>
        <button role="tab" aria-selected={tab === 'site'} className={tab === 'site' ? 'on' : ''} onClick={() => open('site')}>
          Del sito <b>{site.length}</b>
        </button>
        <small>{tab === 'mine' ? `${w.saved} su questo dispositivo` : `${w.ready} da giocare`}</small>
      </div>
      {shown.length ? (
        <EntryRows key={tab} entries={shown} played={played} onToggle={toggle} masculine={masculine} />
      ) : (
        <p className="entry-none">{tab === 'mine' ? emptyMine : emptySite}</p>
      )}
    </section>
  );
}

/** Rows in a box at most three and a half rows high. Also used on its own (Jeopardy's archive). */
export function EntryRows({
  entries,
  played,
  onToggle,
  masculine = false,
}: {
  entries: Entry[];
  played: Set<string>;
  onToggle: (slug: string) => void;
  masculine?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useRowLimit(box, entries.length);
  return (
    <div className="entry-scroll" ref={box}>
      <div className="entry-grid">
        {entries.map((e) => (
          <Row key={e.slug} entry={e} done={played.has(e.slug)} onToggle={() => onToggle(e.slug)} w={WORDS[masculine ? 'm' : 'f']} />
        ))}
      </div>
    </div>
  );
}

function Row({ entry: e, done, onToggle, w }: { entry: Entry; done: boolean; onToggle: () => void; w: Words }) {
  const broken = !!e.errors?.length;
  // Buttons inside the row link: they must not open the game.
  const act = (fn: () => void) => (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    fn();
  };
  // The date first: when the line is too long, the facts at the end are the ones cut.
  const facts = [...(e.date ? [`${e.mine ? w.savedOne : w.addedOne} ${onDay(e.date)}`] : []), ...(e.info ?? [])];
  return (
    <a className={`entry-row ${e.mine ? 'mine' : ''} ${done ? 'played' : ''} ${broken ? 'broken' : ''}`} href={broken ? undefined : e.href}>
      <span className="entry-icon">{e.icon}</span>
      <span className="entry-body">
        <h2>{e.title}</h2>
        {broken ? (
          <p className="entry-errors">
            {e.errors![0]}
            {e.errors!.length > 1 && ` (e altri ${e.errors!.length - 1} errori)`}
          </p>
        ) : (
          e.description && <p>{e.description}</p>
        )}
        <span className="entry-meta">
          {done && <span className="entry-chip done">✓ {w.done}</span>}
          {e.playing && !broken && <span className="entry-chip live">In corso</span>}
          {facts.map((f) => (
            <span key={f} className="fact">
              {f}
            </span>
          ))}
        </span>
      </span>
      <span className="entry-actions">
        {!broken && (
          <button className={`check ${done ? 'on' : ''}`} title={done ? 'Segna come da fare' : `Segna come ${w.mark}`} aria-pressed={done} onClick={act(onToggle)}>
            ✓
          </button>
        )}
        {e.actions?.map((a) => (
          <button key={a.title} title={a.title} onClick={act(a.onClick)}>
            {a.icon}
          </button>
        ))}
      </span>
    </a>
  );
}

/** Still to play first, then the newest; the ones already played at the bottom. */
function sortEntries(list: Entry[], played: Set<string>) {
  return [...list].sort(
    (a, b) =>
      Number(played.has(a.slug)) - Number(played.has(b.slug)) || (b.date ?? 0) - (a.date ?? 0) || a.title.localeCompare(b.title),
  );
}

/** Caps the box at three and a half rows, measured on the first row, and keeps it right when the width changes. */
function useRowLimit(ref: RefObject<HTMLDivElement | null>, count: number) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const fit = () => {
      const grid = box.firstElementChild as HTMLElement | null;
      const first = grid?.firstElementChild as HTMLElement | null;
      if (!grid || !first) return;
      const style = getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(' ').length;
      const gap = parseFloat(style.rowGap) || 0;
      const fits = Math.ceil(grid.children.length / cols) <= 3;
      box.classList.toggle('fits', fits);
      box.style.maxHeight = fits ? '' : `${3.5 * first.offsetHeight + 3 * gap + parseFloat(getComputedStyle(box).paddingTop)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [ref, count]);
}

const tabKey = (game: string) => `gnb:${game}:tab`;

function savedTab(game: string): Tab | null {
  try {
    const t = sessionStorage.getItem(tabKey(game));
    return t === 'mine' || t === 'site' ? t : null;
  } catch {
    return null;
  }
}

/** "il 12 nov", "l'8 nov", with the year only when it isn't this year's. */
function onDay(ms: number) {
  const d = new Date(ms);
  const year = d.getFullYear() !== new Date().getFullYear();
  const text = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
  return `${d.getDate() === 8 || d.getDate() === 11 ? "l'" : 'il '}${text}`;
}
