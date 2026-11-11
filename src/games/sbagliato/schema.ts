// Sbagliato! format: content/sbagliato/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

export const MIN_QUESTIONS = 10;
export const MAX_QUESTIONS = 300;

export interface Domanda {
  /** "È più alto un albero o un fiore?" */
  question: string;
  /** The true answer: the one the team must NOT say. */
  answer: string;
  /** The false answer: the one the team must say. */
  other: string;
}

export interface SbagliatoSet {
  title: string;
  description?: string;
  author?: string;
  domande: Domanda[];
}

export function validateSbagliato(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.domande)) {
    errors.push('Mancano le domande ("domande")');
    return { errors, warnings };
  }
  if (data.domande.length < MIN_QUESTIONS) errors.push(`Servono almeno ${MIN_QUESTIONS} domande, ce ne sono ${data.domande.length}`);
  else if (data.domande.length < 66) warnings.push(`Con ${data.domande.length} domande, oltre le due squadre alcune avranno domande in comune: ognuna ne usa 22, meglio almeno 66`);
  if (data.domande.length > MAX_QUESTIONS) errors.push(`Al massimo ${MAX_QUESTIONS} domande`);
  const seen = new Set<string>();
  data.domande.forEach((d, i) => {
    const where = `Domanda ${i + 1}`;
    if (!isObj(d)) return errors.push(`${where}: non valida`);
    if (!isStr(d.question)) errors.push(`${where}: manca la domanda ("question")`);
    if (!isStr(d.answer)) errors.push(`${where}: manca la risposta vera ("answer")`);
    if (!isStr(d.other)) errors.push(`${where}: manca la risposta sbagliata ("other")`);
    if (isStr(d.answer) && isStr(d.other) && letters(d.answer) === letters(d.other)) errors.push(`${where}: le due risposte sono uguali`);
    if (isStr(d.question)) {
      const key = letters(d.question);
      if (seen.has(key)) warnings.push(`${where}: ripetuta`);
      seen.add(key);
    }
  });
  return { errors, warnings };
}
