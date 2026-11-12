// In fila! format: content/infila/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';

export const MIN_CARDS = 4;
export const MAX_CARDS = 8;
export const MIN_SEQUENCES = 2;
export const MAX_SEQUENCES = 40;

export interface Carta {
  /** What's on the card: "Esce il primo iPhone". */
  text: string;
  /** The value that puts it in its place, shown when the sequence is revealed: "2007", "8.848 m". */
  value: string;
}

export interface Sequenza {
  /** What the cards are about: "Quando sono successe queste cose?". */
  question: string;
  /** Label of the left end of the row (the first card): "Il più vecchio". */
  first: string;
  /** Label of the right end of the row (the last card): "Il più recente". */
  last: string;
  /** Where the values come from, e.g. "Wikipedia". Shown under the question. */
  source?: string;
  /** In the right order: the `first` end first. 4 to 8. */
  cards: Carta[];
}

export interface InFilaSet {
  title: string;
  description?: string;
  author?: string;
  sequenze: Sequenza[];
}

/**
 * The number in a value, to check the order of the cards: "2,7 milioni", "8.848 m", "44 a.C.".
 * Returns the number and the rest of the text (the unit): values with different units can't be compared.
 */
export function valueNumber(value: string): { n: number; unit: string } | null {
  const text = value.toLowerCase().trim();
  const m = text.match(/-?\d[\d.' ]*(?:,\d+)?/);
  if (!m) return null;
  let digits = m[0].replace(/[' ]/g, '');
  // "8.848": a dot followed by groups of 3 digits is a thousands separator, otherwise a decimal point.
  digits = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(digits) ? digits.replace(/\./g, '') : digits;
  let n = Number(digits.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  let unit = text.replace(m[0], ' ');
  const scales: [RegExp, number][] = [
    [/\bmila\b/, 1e3],
    [/\bmilion[ei]\b/, 1e6],
    [/\bmiliard[oi]\b/, 1e9],
  ];
  for (const [re, k] of scales)
    if (re.test(unit)) {
      n *= k;
      unit = unit.replace(re, ' ');
    }
  if (/\ba\.?\s?c\.?(?=\s|$)/.test(unit)) {
    n = -n;
    unit = unit.replace(/\ba\.?\s?c\.?(?=\s|$)/, ' ');
  }
  unit = unit
    .replace(/\bd\.?\s?c\.?(?=\s|$)/, ' ')
    .replace(/\b(?:circa|ca\.|quasi|oltre)(?=\s|$)/g, ' ').replace(/[^\p{L}%°²³/]+/gu, ' ').trim();
  return { n, unit };
}

/** When every value has a number with the same unit: whether they go all up or all down (the order of the cards). */
export function orderProblem(cards: Carta[]): string | null {
  const nums = cards.map((c) => (isStr(c.value) ? valueNumber(c.value) : null));
  if (nums.some((x) => !x) || new Set(nums.map((x) => x!.unit)).size > 1) return null;
  const ns = nums.map((x) => x!.n);
  for (let i = 1; i < ns.length; i++)
    if (ns[i] === ns[i - 1]) return `le carte ${i} e ${i + 1} hanno lo stesso valore: l'ordine sarebbe discutibile`;
  const up = ns.every((n, i) => i === 0 || n > ns[i - 1]);
  const down = ns.every((n, i) => i === 0 || n < ns[i - 1]);
  return up || down ? null : `i valori non vanno tutti in su o tutti in giù (${cards.map((c) => c.value).join(', ')}): controlla l'ordine delle carte`;
}

export function validateInFila(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: ['Il file deve essere un oggetto JSON'], warnings };
  if (!isStr(data.title)) errors.push('Manca il titolo ("title")');
  if (!Array.isArray(data.sequenze) || data.sequenze.length === 0) {
    errors.push('Serve almeno una sequenza ("sequenze")');
    return { errors, warnings };
  }
  if (data.sequenze.length < MIN_SEQUENCES) errors.push(`Servono almeno ${MIN_SEQUENCES} sequenze`);
  if (data.sequenze.length > MAX_SEQUENCES) errors.push(`Al massimo ${MAX_SEQUENCES} sequenze`);
  else if (data.sequenze.length < 6) warnings.push('Con meno di 6 sequenze la partita è corta (ogni squadra ne gioca una a turno)');
  data.sequenze.forEach((s, si) => {
    const where = `Sequenza ${si + 1}`;
    if (!isObj(s)) return errors.push(`${where}: non valida`);
    if (!isStr(s.question)) errors.push(`${where}: manca la domanda ("question")`);
    if (!isStr(s.first)) errors.push(`${where}: manca l'etichetta della prima carta ("first", es. "Il più vecchio")`);
    if (!isStr(s.last)) errors.push(`${where}: manca l'etichetta dell'ultima carta ("last", es. "Il più recente")`);
    if (s.source !== undefined && typeof s.source !== 'string') errors.push(`${where}: "source" deve essere un testo`);
    if (!Array.isArray(s.cards)) return errors.push(`${where}: mancano le carte ("cards")`);
    if (s.cards.length < MIN_CARDS || s.cards.length > MAX_CARDS)
      errors.push(`${where}: servono da ${MIN_CARDS} a ${MAX_CARDS} carte, ce ne sono ${s.cards.length}`);
    const seen = new Map<string, number>();
    let ok = true;
    s.cards.forEach((c, ci) => {
      const at = `${where}, carta ${ci + 1}`;
      if (!isObj(c) || !isStr(c.text)) {
        ok = false;
        return errors.push(`${at}: manca il testo ("text")`);
      }
      if (!isStr(c.value)) {
        ok = false;
        errors.push(`${at}: manca il valore ("value", es. "1989")`);
      }
      const key = letters(c.text);
      if (seen.has(key)) errors.push(`${where}: le carte ${seen.get(key)! + 1} e ${ci + 1} sono uguali`);
      seen.set(key, ci);
    });
    if (ok) {
      const problem = orderProblem(s.cards as Carta[]);
      if (problem) warnings.push(`${where}: ${problem}`);
    }
  });
  return { errors, warnings };
}
