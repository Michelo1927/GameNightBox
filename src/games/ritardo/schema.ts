// In ritardo! format: content/ritardo/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, tr, type Lang } from '../../hub/i18n';

export const MIN_QUESTIONS = 10;
export const MAX_QUESTIONS = 300;
/** Answers longer than this (in words) are hard to keep in mind while reading the next question. */
export const MAX_ANSWER_WORDS = 3;

export interface Domanda {
  /** "Quanti sono i colli di Roma?" */
  question: string;
  /** "7": short, to be said one question later. */
  answer: string;
}

export interface RitardoSet {
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  domande: Domanda[];
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function validateRitardo(data: unknown): Validation {
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
  else if (data.domande.length < 40)
    warnings.push(
      tr(
        `Con ${data.domande.length} domande, oltre le due squadre alcune avranno domande in comune: meglio almeno 40`,
        `With ${data.domande.length} questions, beyond two teams some will share questions: better at least 40`,
      ),
    );
  if (data.domande.length > MAX_QUESTIONS) errors.push(tr(`Al massimo ${MAX_QUESTIONS} domande`, `At most ${MAX_QUESTIONS} questions`));
  const seen = new Set<string>();
  data.domande.forEach((d, i) => {
    const where = tr(`Domanda ${i + 1}`, `Question ${i + 1}`);
    if (!isObj(d)) return errors.push(`${where}: ${tr('non valida', 'not valid')}`);
    if (!isStr(d.question)) errors.push(`${where}: ${tr('manca la domanda ("question")', 'the question is missing ("question")')}`);
    if (!isStr(d.answer)) errors.push(`${where}: ${tr('manca la risposta ("answer")', 'the answer is missing ("answer")')}`);
    else if (words(d.answer) > MAX_ANSWER_WORDS)
      warnings.push(`${where}: ${tr(`risposta lunga (meglio al massimo ${MAX_ANSWER_WORDS} parole, va ricordata)`, `long answer (better at most ${MAX_ANSWER_WORDS} words, it must be remembered)`)}`);
    if (isStr(d.question)) {
      const key = letters(d.question);
      if (seen.has(key)) warnings.push(`${where}: ${tr('ripetuta', 'repeated')}`);
      seen.add(key);
    }
  });
  return { errors, warnings };
}
