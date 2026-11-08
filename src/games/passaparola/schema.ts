// Passaparola format: content/passaparola/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

/** The 21 letters of the Italian alphabet, in wheel order. */
export const LETTERS = 'ABCDEFGHILMNOPQRSTUVZ'.split('');

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
  /** One wheel per team, each with a different answer for every letter. */
  ruote: Ruota[];
}

export const fits = (answer: string, letter: string, type: Item['type']) => {
  const a = letters(answer);
  return type === 'inizia' ? a.startsWith(letter) : a.includes(letter);
};

export function validatePassaparola(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.ruote) || data.ruote.length === 0) {
    errors.push('Serve almeno una ruota ("ruote")');
    return { errors, warnings };
  }
  if (data.ruote.length > 10) errors.push('Al massimo 10 ruote');
  const seen = new Map<string, string>();
  data.ruote.forEach((r, ri) => {
    const where = `Ruota ${ri + 1}`;
    const items = isObj(r) && Array.isArray(r.items) ? r.items : null;
    if (!items) return errors.push(`${where}: mancano le lettere ("items")`);
    if (items.length !== LETTERS.length) errors.push(`${where}: servono ${LETTERS.length} lettere, ce ne sono ${items.length}`);
    LETTERS.forEach((letter, li) => {
      const it = items[li];
      const at = `${where}, lettera ${letter}`;
      if (!isObj(it)) return errors.push(`${at}: manca`);
      if (it.letter !== letter) return errors.push(`${at}: al suo posto c'è "${String(it.letter)}" (le lettere vanno in ordine: ${LETTERS.join(' ')})`);
      if (it.type !== 'inizia' && it.type !== 'contiene') errors.push(`${at}: "type" deve essere "inizia" o "contiene"`);
      if (!isStr(it.question)) errors.push(`${at}: manca la definizione ("question")`);
      else if (it.question.length > 250) errors.push(`${at}: definizione troppo lunga (max 250 caratteri)`);
      if (!isStr(it.answer)) return errors.push(`${at}: manca la risposta ("answer")`);
      const type = it.type === 'contiene' ? 'contiene' : 'inizia';
      const answers = [it.answer, ...(Array.isArray(it.accept) ? it.accept : [])].filter(isStr);
      for (const a of answers) {
        if (!fits(a, letter, type)) errors.push(`${at}: "${a}" non ${type === 'inizia' ? 'inizia con' : 'contiene'} la ${letter}`);
      }
      if (isStr(it.question) && letters(it.question).includes(letters(it.answer)) && letters(it.answer).length > 3)
        warnings.push(`${at}: la definizione contiene la risposta`);
      const key = letters(it.answer);
      if (seen.has(key)) warnings.push(`${at}: risposta "${it.answer}" ripetuta (anche in ${seen.get(key)})`);
      else seen.set(key, at);
    });
  });
  return { errors, warnings };
}
