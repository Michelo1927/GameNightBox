// Top Ten format: content/topten/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, tr, type Lang } from '../../hub/i18n';

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
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  liste: Lista[];
}

export function validateTopTen(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  checkLang(data, errors);
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  if (!Array.isArray(data.liste) || data.liste.length === 0) {
    errors.push(tr('Serve almeno una lista ("liste")', 'At least one list is needed ("liste")'));
    return { errors, warnings };
  }
  if (data.liste.length > MAX_LISTS) errors.push(tr(`Al massimo ${MAX_LISTS} liste`, `At most ${MAX_LISTS} lists`));
  if (data.liste.length < 3) warnings.push(tr('Con meno di 3 liste la partita è molto corta', 'With fewer than 3 lists the game is very short'));
  data.liste.forEach((l, li) => {
    const where = tr(`Lista ${li + 1}`, `List ${li + 1}`);
    if (!isObj(l)) return errors.push(`${where}: ${tr('non valida', 'not valid')}`);
    if (!isStr(l.question)) errors.push(`${where}: ${tr('manca la domanda ("question")', 'the question is missing ("question")')}`);
    if (l.source !== undefined && typeof l.source !== 'string') errors.push(`${where}: ${tr('"source" deve essere un testo', '"source" must be text')}`);
    else if (!isStr(l.source)) warnings.push(`${where}: ${tr('manca la fonte ("source"), utile se qualcuno contesta', 'the source is missing ("source"), useful if someone objects')}`);
    if (!Array.isArray(l.answers)) return errors.push(`${where}: ${tr('mancano le risposte ("answers")', 'the answers are missing ("answers")')}`);
    if (l.answers.length < MIN_ANSWERS || l.answers.length > MAX_ANSWERS)
      errors.push(
        tr(
          `${where}: servono da ${MIN_ANSWERS} a ${MAX_ANSWERS} risposte, ce ne sono ${l.answers.length}`,
          `${where}: ${MIN_ANSWERS} to ${MAX_ANSWERS} answers are needed, there are ${l.answers.length}`,
        ),
      );
    // Every name (answer or alternative) must point to one answer only, or a typed guess would be ambiguous.
    const names = new Map<string, number>();
    l.answers.forEach((a, ai) => {
      const at = tr(`${where}, risposta ${ai + 1}`, `${where}, answer ${ai + 1}`);
      if (!isObj(a) || !isStr(a.text)) return errors.push(`${at}: ${tr('manca il testo ("text")', 'the text is missing ("text")')}`);
      if (a.also !== undefined && (!Array.isArray(a.also) || !a.also.every(isStr))) errors.push(`${at}: ${tr('"also" deve essere un elenco di nomi', '"also" must be a list of names')}`);
      if (a.note !== undefined && typeof a.note !== 'string') errors.push(`${at}: ${tr('"note" deve essere un testo', '"note" must be text')}`);
      const all = [a.text, ...(Array.isArray(a.also) ? a.also.filter(isStr) : [])];
      for (const n of all) {
        const key = letters(n);
        if (!key) continue;
        const other = names.get(key);
        if (other !== undefined && other !== ai) errors.push(tr(`${where}: "${n}" vale per due risposte (${other + 1} e ${ai + 1})`, `${where}: "${n}" fits two answers (${other + 1} and ${ai + 1})`));
        names.set(key, ai);
      }
    });
  });
  return { errors, warnings };
}
