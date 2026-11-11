// Top Ten format: content/topten/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

export const MIN_ANSWERS = 5;
export const MAX_ANSWERS = 10;
export const MAX_LISTS = 12;

export interface Voce {
  /** What's shown on the board when it's found, e.g. "Stati Uniti". */
  text: string;
  /** Other names the app accepts when the host types the guess, e.g. ["USA", "America"]. */
  also?: string[];
  /** The figure behind the ranking, shown with the answer, e.g. "652 km". */
  note?: string;
}

export interface Lista {
  /** "I 10 fiumi più lunghi d'Italia". */
  question: string;
  /** Where the ranking comes from, e.g. "ISTAT, 2024" or a link. Shown under the question. */
  source?: string;
  /** In order, first place first: 5 to 10. */
  answers: Voce[];
}

export interface TopTenSet {
  title: string;
  description?: string;
  author?: string;
  liste: Lista[];
}

export function validateTopTen(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.liste) || data.liste.length === 0) {
    errors.push('Serve almeno una lista ("liste")');
    return { errors, warnings };
  }
  if (data.liste.length > MAX_LISTS) errors.push(`Al massimo ${MAX_LISTS} liste`);
  if (data.liste.length < 3) warnings.push('Con meno di 3 liste la partita è molto corta');
  data.liste.forEach((l, li) => {
    const where = `Lista ${li + 1}`;
    if (!isObj(l)) return errors.push(`${where}: non valida`);
    if (!isStr(l.question)) errors.push(`${where}: manca la domanda ("question")`);
    if (l.source !== undefined && typeof l.source !== 'string') errors.push(`${where}: "source" deve essere un testo`);
    else if (!isStr(l.source)) warnings.push(`${where}: manca la fonte ("source"), utile se qualcuno contesta`);
    if (!Array.isArray(l.answers)) return errors.push(`${where}: mancano le risposte ("answers")`);
    if (l.answers.length < MIN_ANSWERS || l.answers.length > MAX_ANSWERS)
      errors.push(`${where}: servono da ${MIN_ANSWERS} a ${MAX_ANSWERS} risposte, ce ne sono ${l.answers.length}`);
    // Every name (answer or alternative) must point to one answer only, or a typed guess would be ambiguous.
    const names = new Map<string, number>();
    l.answers.forEach((a, ai) => {
      const at = `${where}, risposta ${ai + 1}`;
      if (!isObj(a) || !isStr(a.text)) return errors.push(`${at}: manca il testo ("text")`);
      if (a.also !== undefined && (!Array.isArray(a.also) || !a.also.every(isStr))) errors.push(`${at}: "also" deve essere un elenco di nomi`);
      if (a.note !== undefined && typeof a.note !== 'string') errors.push(`${at}: "note" deve essere un testo`);
      const all = [a.text, ...(Array.isArray(a.also) ? a.also.filter(isStr) : [])];
      for (const n of all) {
        const key = letters(n);
        if (!key) continue;
        const other = names.get(key);
        if (other !== undefined && other !== ai) errors.push(`${where}: "${n}" vale per due risposte (${other + 1} e ${ai + 1})`);
        names.set(key, ai);
      }
    });
  });
  return { errors, warnings };
}
