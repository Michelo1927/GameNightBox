// Sbagliato! format: content/sbagliato/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, tr, type Lang } from '../../hub/i18n';

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
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  domande: Domanda[];
}

export function validateSbagliato(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  checkLang(data, errors);
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  if (!Array.isArray(data.domande)) {
    errors.push(tr('Mancano le domande ("domande")', 'The questions are missing ("domande")'));
    return { errors, warnings };
  }
  if (data.domande.length < MIN_QUESTIONS) errors.push(tr(`Servono almeno ${MIN_QUESTIONS} domande, ce ne sono ${data.domande.length}`, `At least ${MIN_QUESTIONS} questions are needed, there are ${data.domande.length}`));
  else if (data.domande.length < 66) warnings.push(
      tr(
        `Con ${data.domande.length} domande, oltre le due squadre alcune avranno domande in comune: ognuna ne usa 22, meglio almeno 66`,
        `With ${data.domande.length} questions, beyond two teams some will share questions: each uses 22, better at least 66`,
      ),
    );
  if (data.domande.length > MAX_QUESTIONS) errors.push(tr(`Al massimo ${MAX_QUESTIONS} domande`, `At most ${MAX_QUESTIONS} questions`));
  const seen = new Set<string>();
  data.domande.forEach((d, i) => {
    const where = tr(`Domanda ${i + 1}`, `Question ${i + 1}`);
    if (!isObj(d)) return errors.push(`${where}: ${tr('non valida', 'not valid')}`);
    if (!isStr(d.question)) errors.push(`${where}: ${tr('manca la domanda ("question")', 'the question is missing ("question")')}`);
    if (!isStr(d.answer)) errors.push(`${where}: ${tr('manca la risposta vera ("answer")', 'the true answer is missing ("answer")')}`);
    if (!isStr(d.other)) errors.push(`${where}: ${tr('manca la risposta sbagliata ("other")', 'the wrong answer is missing ("other")')}`);
    if (isStr(d.answer) && isStr(d.other) && letters(d.answer) === letters(d.other)) errors.push(`${where}: ${tr('le due risposte sono uguali', 'the two answers are the same')}`);
    if (isStr(d.question)) {
      const key = letters(d.question);
      if (seen.has(key)) warnings.push(`${where}: ${tr('ripetuta', 'repeated')}`);
      seen.add(key);
    }
  });
  return { errors, warnings };
}
