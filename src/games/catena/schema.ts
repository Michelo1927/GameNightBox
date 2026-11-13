// Catena format: content/catena/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, tr, type Lang } from '../../hub/i18n';

export const CHAIN_LENGTH = 8;
export const CLUES = 5;

export interface Catena {
  /** 8 words, each linked to the next one (e.g. pane → burro → arachidi). The first and last are shown. */
  words: string[];
  /** Optional, 7 items: how each word is linked to the next one (shown to everyone when the chain is done). */
  links?: string[];
}

export interface Finale {
  /** The word to guess. */
  answer: string;
  /** 5 words linked to the answer, shown one at a time. */
  clues: string[];
}

export interface CatenaSet {
  title: string;
  description?: string;
  author?: string;
  /** Language of the content ("it" when missing). */
  lang?: Lang;
  catene: Catena[];
  /** Optional final round with the booking buttons. */
  finali?: Finale[];
}

const WORD = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,16}$/;

export function validateCatena(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  checkLang(data, errors);
  if (!Array.isArray(data.catene) || data.catene.length === 0) errors.push(tr('Serve almeno una catena ("catene")', 'At least one chain is needed ("catene")'));
  else {
    if (data.catene.length > 12) errors.push(tr('Al massimo 12 catene', 'At most 12 chains'));
    data.catene.forEach((c, ci) => {
      const where = tr(`Catena ${ci + 1}`, `Chain ${ci + 1}`);
      if (!isObj(c) || !Array.isArray(c.words)) return errors.push(tr(`${where}: mancano le parole ("words")`, `${where}: the words are missing ("words")`));
      if (c.words.length !== CHAIN_LENGTH) errors.push(tr(`${where}: servono ${CHAIN_LENGTH} parole, ce ne sono ${c.words.length}`, `${where}: ${CHAIN_LENGTH} words are needed, there are ${c.words.length}`));
      c.words.forEach((w, wi) => {
        if (!isStr(w) || !WORD.test(w.trim())) errors.push(
            tr(`${where}, parola ${wi + 1}: "${String(w)}" deve essere una sola parola, solo lettere`, `${where}, word ${wi + 1}: "${String(w)}" must be a single word, letters only`),
          );
      });
      const seen = new Set<string>();
      for (const w of c.words.filter(isStr)) {
        if (seen.has(letters(w))) errors.push(tr(`${where}: la parola "${w}" è ripetuta`, `${where}: the word "${w}" is repeated`));
        seen.add(letters(w));
      }
      if (c.links !== undefined && (!Array.isArray(c.links) || c.links.length !== CHAIN_LENGTH - 1))
        warnings.push(tr(`${where}: "links" deve avere ${CHAIN_LENGTH - 1} spiegazioni (una per ogni passaggio)`, `${where}: "links" must have ${CHAIN_LENGTH - 1} explanations (one per step)`));
    });
  }
  if (data.finali !== undefined) {
    if (!Array.isArray(data.finali)) errors.push(tr('"finali" deve essere un elenco', '"finali" must be a list'));
    else
      data.finali.forEach((f, fi) => {
        const where = tr(`Finale ${fi + 1}`, `Final ${fi + 1}`);
        if (!isObj(f)) return errors.push(tr(`${where}: non valido`, `${where}: not valid`));
        if (!isStr(f.answer) || !WORD.test(f.answer.trim())) errors.push(tr(`${where}: la risposta deve essere una sola parola`, `${where}: the answer must be a single word`));
        if (!Array.isArray(f.clues) || f.clues.length !== CLUES) errors.push(tr(`${where}: servono ${CLUES} indizi ("clues")`, `${where}: ${CLUES} clues are needed ("clues")`));
        else if (isStr(f.answer)) {
          const a = letters(f.answer);
          for (const c of f.clues) {
            if (!isStr(c)) errors.push(tr(`${where}: indizio vuoto`, `${where}: empty clue`));
            else if (letters(c).includes(a)) errors.push(tr(`${where}: l'indizio "${c}" contiene la risposta`, `${where}: the clue "${c}" contains the answer`));
          }
        }
      });
  }
  return { errors, warnings };
}
