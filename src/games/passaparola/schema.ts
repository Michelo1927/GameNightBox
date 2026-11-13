// Passaparola format: content/passaparola/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, contentLang, lang, tr, type Lang } from '../../hub/i18n';

/** The 21 letters of the Italian alphabet, in wheel order. */
export const LETTERS_IT = 'ABCDEFGHILMNOPQRSTUVZ'.split('');
/** The 26 letters of the English alphabet, for content in English. */
export const LETTERS_EN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** The wheel of a piece of content: 21 letters in Italian, 26 in English ("lang"). */
export const lettersOf = (data: unknown) => (contentLang(data) === 'en' ? LETTERS_EN : LETTERS_IT);
/** The wheel of new content made on this site: the site's language. */
export const siteLetters = () => (lang === 'en' ? LETTERS_EN : LETTERS_IT);

export interface Item {
  letter: string;
  /** The answer starts with the letter, or only contains it (for hard letters like H, Q, Z). */
  type: 'inizia' | 'contiene';
  question: string;
  answer: string;
  /** Other answers to accept (synonyms, other spellings). */
  accept?: string[];
}

export interface Ruota {
  items: Item[];
}

export interface Passaparola {
  title: string;
  description?: string;
  author?: string;
  /** Language: "en" uses the 26-letter wheel ("it" when missing). */
  lang?: Lang;
  /** One wheel per team, each with a different answer for every letter. */
  ruote: Ruota[];
}

export const fits = (answer: string, letter: string, type: Item['type']) => {
  const a = letters(answer);
  return type === 'inizia' ? a.startsWith(letter) : a.includes(letter);
};

/** "Pane" doesn't start with Q: the answer doesn't fit its letter. */
export const misfit = (at: string, answer: string, letter: string, type: Item['type']) =>
  type === 'inizia'
    ? tr(`${at}"${answer}" non inizia con la ${letter}`, `${at}"${answer}" doesn't start with ${letter}`)
    : tr(`${at}"${answer}" non contiene la ${letter}`, `${at}"${answer}" doesn't contain ${letter}`);

export function validatePassaparola(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  checkLang(data, errors);
  const LETTERS = lettersOf(data);
  if (!Array.isArray(data.ruote) || data.ruote.length === 0) {
    errors.push(tr('Serve almeno una ruota ("ruote")', 'At least one wheel is needed ("ruote")'));
    return { errors, warnings };
  }
  if (data.ruote.length > 10) errors.push(tr('Al massimo 10 ruote', 'At most 10 wheels'));
  const seen = new Map<string, string>();
  data.ruote.forEach((r, ri) => {
    const where = tr(`Ruota ${ri + 1}`, `Wheel ${ri + 1}`);
    const items = isObj(r) && Array.isArray(r.items) ? r.items : null;
    if (!items) return errors.push(tr(`${where}: mancano le lettere ("items")`, `${where}: the letters are missing ("items")`));
    if (items.length !== LETTERS.length) errors.push(tr(`${where}: servono ${LETTERS.length} lettere, ce ne sono ${items.length}`, `${where}: ${LETTERS.length} letters are needed, there are ${items.length}`));
    LETTERS.forEach((letter, li) => {
      const it = items[li];
      const at = tr(`${where}, lettera ${letter}`, `${where}, letter ${letter}`);
      if (!isObj(it)) return errors.push(tr(`${at}: manca`, `${at}: missing`));
      if (it.letter !== letter) return errors.push(
          tr(
            `${at}: al suo posto c'è "${String(it.letter)}" (le lettere vanno in ordine: ${LETTERS.join(' ')})`,
            `${at}: there is "${String(it.letter)}" in its place (the letters go in order: ${LETTERS.join(' ')})`,
          ),
        );
      if (it.type !== 'inizia' && it.type !== 'contiene') errors.push(tr(`${at}: "type" deve essere "inizia" o "contiene"`, `${at}: "type" must be "inizia" (starts with) or "contiene" (contains)`));
      if (!isStr(it.question)) errors.push(tr(`${at}: manca la definizione ("question")`, `${at}: the clue is missing ("question")`));
      else if (it.question.length > 250) errors.push(tr(`${at}: definizione troppo lunga (max 250 caratteri)`, `${at}: clue too long (max 250 characters)`));
      if (!isStr(it.answer)) return errors.push(tr(`${at}: manca la risposta ("answer")`, `${at}: the answer is missing ("answer")`));
      const type = it.type === 'contiene' ? 'contiene' : 'inizia';
      const answers = [it.answer, ...(Array.isArray(it.accept) ? it.accept : [])].filter(isStr);
      for (const a of answers) {
        if (!fits(a, letter, type)) errors.push(misfit(`${at}: `, a, letter, type));
      }
      if (isStr(it.question) && letters(it.question).includes(letters(it.answer)) && letters(it.answer).length > 3)
        warnings.push(tr(`${at}: la definizione contiene la risposta`, `${at}: the clue contains the answer`));
      const key = letters(it.answer);
      if (seen.has(key)) warnings.push(tr(`${at}: risposta "${it.answer}" ripetuta (anche in ${seen.get(key)})`, `${at}: answer "${it.answer}" repeated (also in ${seen.get(key)})`));
      else seen.set(key, at);
    });
  });
  return { errors, warnings };
}
