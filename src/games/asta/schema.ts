// All'asta! format: content/asta/<slug>.json. Shared by the app and scripts/validate.ts.
// The content is only a list of themes: the host judges the answers, nothing to check against.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

export const MIN_THEMES = 5;
export const MAX_THEMES = 300;
/** A theme longer than this is hard to read at a glance on the TV. */
export const LONG_THEME = 60;

export interface AstaSet {
  title: string;
  description?: string;
  author?: string;
  /** "Animali della savana", "Cose che trovi in un bagno"… */
  temi: string[];
}

export function validateAsta(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.temi)) {
    errors.push('Mancano i temi ("temi")');
    return { errors, warnings };
  }
  if (data.temi.length < MIN_THEMES) errors.push(`Servono almeno ${MIN_THEMES} temi, ce ne sono ${data.temi.length}`);
  if (data.temi.length > MAX_THEMES) errors.push(`Al massimo ${MAX_THEMES} temi`);
  const seen = new Set<string>();
  data.temi.forEach((t, i) => {
    const where = `Tema ${i + 1}`;
    if (!isStr(t)) return errors.push(`${where}: vuoto o non valido`);
    if (t.trim().length > LONG_THEME) warnings.push(`${where}: lungo (${t.trim().length} caratteri), sulla TV si legge meglio corto`);
    const key = letters(t);
    if (seen.has(key)) warnings.push(`${where}: ripetuto`);
    seen.add(key);
  });
  return { errors, warnings };
}
