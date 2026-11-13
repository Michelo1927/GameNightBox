// Languages of the site: Italian (the default) and English.
// Every text is written next to its translation, `tr('Gioca', 'Play')`: both are required, so TypeScript
// flags a missing translation. The language is read once when the app starts; changing it reloads the page
// (games in progress are saved in the browser, so nothing is lost). Also safe in Node (scripts): Italian.

export type Lang = 'it' | 'en';
export const LANGS: Lang[] = ['it', 'en'];

const STORE = 'gnb:lang';

function detect(): Lang {
  // Node (scripts/validate.ts…) has a navigator too: the scripts stay in Italian.
  if (typeof window === 'undefined') return 'it';
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'it' || saved === 'en') return saved;
  } catch {
    /* no storage: fall back to the browser */
  }
  const first = (navigator.languages?.[0] ?? navigator.language ?? 'it').toLowerCase();
  return first.startsWith('it') ? 'it' : 'en';
}

/** The language of the site, fixed for this page load. */
export const lang: Lang = detect();

if (typeof document !== 'undefined') document.documentElement.lang = lang;

/** The Italian or the English version of a text (or of any value: JSX, lists…). */
export function tr<T>(it: T, en: T): T {
  return lang === 'en' ? en : it;
}

/** English ordinal: 1st, 2nd, 3rd, 4th, 11th, 21st… */
export function ordinal(n: number) {
  const ten = n % 100;
  const s = ten >= 11 && ten <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

/** Key names written in <kbd>. */
export const KEY = {
  enter: tr('Invio', 'Enter'),
  space: tr('Spazio', 'Space'),
  esc: 'Esc',
};

/** Locale for dates and numbers. */
export const locale = tr('it-IT', 'en-GB');

/** Saves the choice and reloads the page in the new language. */
export function setLang(next: Lang) {
  if (next === lang) return;
  try {
    localStorage.setItem(STORE, next);
  } catch {
    /* without storage the choice can't stick */
  }
  location.reload();
}

/** Language of a piece of content: "it" when not written. */
export const contentLang = (data: unknown): Lang =>
  typeof data === 'object' && data !== null && (data as { lang?: unknown }).lang === 'en' ? 'en' : 'it';

/** The "lang" field to keep when a creator rewrites content: only English is written ("it" is the default). */
export const langField = (data: unknown): { lang?: 'en' } => (contentLang(data) === 'en' ? { lang: 'en' } : {});

/** The "lang" field of new content made in the creator: the site's language. */
export const newLangField = (): { lang?: 'en' } => (lang === 'en' ? { lang: 'en' } : {});

/** Checks the optional "lang" field of a piece of content. */
export function checkLang(data: Record<string, unknown>, errors: string[]) {
  if (data.lang !== undefined && data.lang !== 'it' && data.lang !== 'en')
    errors.push(tr('"lang" deve essere "it" o "en"', '"lang" must be "it" or "en"'));
}
