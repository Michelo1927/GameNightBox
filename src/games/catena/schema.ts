// Catena format: content/catena/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

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
  catene: Catena[];
  /** Optional final round with the booking buttons. */
  finali?: Finale[];
}

const WORD = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,16}$/;

export function validateCatena(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.catene) || data.catene.length === 0) errors.push('Serve almeno una catena ("catene")');
  else {
    if (data.catene.length > 12) errors.push('Al massimo 12 catene');
    data.catene.forEach((c, ci) => {
      const where = `Catena ${ci + 1}`;
      if (!isObj(c) || !Array.isArray(c.words)) return errors.push(`${where}: mancano le parole ("words")`);
      if (c.words.length !== CHAIN_LENGTH) errors.push(`${where}: servono ${CHAIN_LENGTH} parole, ce ne sono ${c.words.length}`);
      c.words.forEach((w, wi) => {
        if (!isStr(w) || !WORD.test(w.trim())) errors.push(`${where}, parola ${wi + 1}: "${String(w)}" deve essere una sola parola, solo lettere`);
      });
      const seen = new Set<string>();
      for (const w of c.words.filter(isStr)) {
        if (seen.has(letters(w))) errors.push(`${where}: la parola "${w}" è ripetuta`);
        seen.add(letters(w));
      }
      if (c.links !== undefined && (!Array.isArray(c.links) || c.links.length !== CHAIN_LENGTH - 1))
        warnings.push(`${where}: "links" deve avere ${CHAIN_LENGTH - 1} spiegazioni (una per ogni passaggio)`);
    });
  }
  if (data.finali !== undefined) {
    if (!Array.isArray(data.finali)) errors.push('"finali" deve essere un elenco');
    else
      data.finali.forEach((f, fi) => {
        const where = `Finale ${fi + 1}`;
        if (!isObj(f)) return errors.push(`${where}: non valido`);
        if (!isStr(f.answer) || !WORD.test(f.answer.trim())) errors.push(`${where}: la risposta deve essere una sola parola`);
        if (!Array.isArray(f.clues) || f.clues.length !== CLUES) errors.push(`${where}: servono ${CLUES} indizi ("clues")`);
        else if (isStr(f.answer)) {
          const a = letters(f.answer);
          for (const c of f.clues) {
            if (!isStr(c)) errors.push(`${where}: indizio vuoto`);
            else if (letters(c).includes(a)) errors.push(`${where}: l'indizio "${c}" contiene la risposta`);
          }
        }
      });
  }
  return { errors, warnings };
}
