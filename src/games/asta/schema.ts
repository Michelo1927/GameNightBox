// All'asta! format: content/asta/<slug>.json. Shared by the app and scripts/validate.ts.
// The content is only a list of themes: the host judges the answers, nothing to check against.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, tr, type Lang } from '../../hub/i18n';

export const MIN_THEMES = 5;
export const MAX_THEMES = 300;
/** A theme longer than this is hard to read at a glance on the TV. */
export const LONG_THEME = 60;

export interface AstaSet {
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  /** "Animali della savana", "Cose che trovi in un bagno"… */
  temi: string[];
}

export function validateAsta(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  checkLang(data, errors);
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  if (!Array.isArray(data.temi)) {
    errors.push(tr('Mancano i temi ("temi")', 'The themes are missing ("temi")'));
    return { errors, warnings };
  }
  if (data.temi.length < MIN_THEMES) errors.push(tr(`Servono almeno ${MIN_THEMES} temi, ce ne sono ${data.temi.length}`, `At least ${MIN_THEMES} themes are needed, there are ${data.temi.length}`));
  if (data.temi.length > MAX_THEMES) errors.push(tr(`Al massimo ${MAX_THEMES} temi`, `At most ${MAX_THEMES} themes`));
  const seen = new Set<string>();
  data.temi.forEach((t, i) => {
    const where = tr(`Tema ${i + 1}`, `Theme ${i + 1}`);
    if (!isStr(t)) return errors.push(`${where}: ${tr('vuoto o non valido', 'empty or not valid')}`);
    if (t.trim().length > LONG_THEME) warnings.push(
        tr(
          `${where}: lungo (${t.trim().length} caratteri), sulla TV si legge meglio corto`,
          `${where}: long (${t.trim().length} characters), a short one reads better on the TV`,
        ),
      );
    const key = letters(t);
    if (seen.has(key)) warnings.push(`${where}: ${tr('ripetuto', 'repeated')}`);
    seen.add(key);
  });
  return { errors, warnings };
}
