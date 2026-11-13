// In fila! format: content/infila/<slug>.json. Shared by the app and scripts/validate.ts.
import { isObj, isStr, type Validation } from '../../hub/content';
import { letters } from '../../hub/text';
import { checkLang, contentLang, tr, type Lang } from '../../hub/i18n';

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
  lang?: Lang;
  title: string;
  description?: string;
  author?: string;
  sequenze: Sequenza[];
}

/**
 * The number in a value, to check the order of the cards: "2,7 milioni", "8.848 m", "44 a.C."
 * (in English content: "2.7 million", "8,848 m", "44 BC").
 * Returns the number and the rest of the text (the unit): values with different units can't be compared.
 */
export function valueNumber(value: string, en = false): { n: number; unit: string } | null {
  const text = value.toLowerCase().trim();
  const m = en ? text.match(/-?\d[\d,' ]*(?:\.\d+)?/) : text.match(/-?\d[\d.' ]*(?:,\d+)?/);
  if (!m) return null;
  let digits = m[0].replace(/[' ]/g, '');
  if (en) digits = digits.replace(/,/g, '');
  // "8.848": a dot followed by groups of 3 digits is a thousands separator, otherwise a decimal point.
  else digits = (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(digits) ? digits.replace(/\./g, '') : digits).replace(',', '.');
  let n = Number(digits);
  if (!Number.isFinite(n)) return null;
  let unit = text.replace(m[0], ' ');
  const scales: [RegExp, number][] = en
    ? [
        [/\bthousand\b/, 1e3],
        [/\bmillions?\b/, 1e6],
        [/\bbillions?\b/, 1e9],
      ]
    : [
        [/\bmila\b/, 1e3],
        [/\bmilion[ei]\b/, 1e6],
        [/\bmiliard[oi]\b/, 1e9],
      ];
  for (const [re, k] of scales)
    if (re.test(unit)) {
      n *= k;
      unit = unit.replace(re, ' ');
    }
  // Before Christ: "44 a.C." / "44 BC", "44 BCE".
  const before = en ? /\bb\.?\s?c\.?(?:e\.?)?(?=\s|$)/ : /\ba\.?\s?c\.?(?=\s|$)/;
  if (before.test(unit)) {
    n = -n;
    unit = unit.replace(before, ' ');
  }
  unit = unit
    .replace(en ? /\b(?:a\.?\s?d\.?|c\.?e\.)(?=\s|$)|\bce(?=\s|$)/ : /\bd\.?\s?c\.?(?=\s|$)/, ' ')
    .replace(en ? /\b(?:about|around|approx\.?|approximately|nearly|almost|over|c\.|ca\.)(?=\s|$)/g : /\b(?:circa|ca\.|quasi|oltre)(?=\s|$)/g, ' ')
    .replace(/[^\p{L}%°²³/]+/gu, ' ')
    .trim();
  return { n, unit };
}

/** When every value has a number with the same unit: whether they go all up or all down (the order of the cards). */
export function orderProblem(cards: Carta[], en = false): string | null {
  const nums = cards.map((c) => (isStr(c.value) ? valueNumber(c.value, en) : null));
  if (nums.some((x) => !x) || new Set(nums.map((x) => x!.unit)).size > 1) return null;
  const ns = nums.map((x) => x!.n);
  for (let i = 1; i < ns.length; i++)
    if (ns[i] === ns[i - 1])
      return tr(
        `le carte ${i} e ${i + 1} hanno lo stesso valore: l'ordine sarebbe discutibile`,
        `cards ${i} and ${i + 1} have the same value: the order would be open to dispute`,
      );
  const up = ns.every((n, i) => i === 0 || n > ns[i - 1]);
  const down = ns.every((n, i) => i === 0 || n < ns[i - 1]);
  if (up || down) return null;
  const values = cards.map((c) => c.value).join(', ');
  return tr(
    `i valori non vanno tutti in su o tutti in giù (${values}): controlla l'ordine delle carte`,
    `the values don't all go up or all go down (${values}): check the order of the cards`,
  );
}

export function validateInFila(data: unknown): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { errors: [tr('Il file deve essere un oggetto JSON', 'The file must be a JSON object')], warnings };
  checkLang(data, errors);
  const en = contentLang(data) === 'en';
  if (!isStr(data.title)) errors.push(tr('Manca il titolo ("title")', 'The title is missing ("title")'));
  if (!Array.isArray(data.sequenze) || data.sequenze.length === 0) {
    errors.push(tr('Serve almeno una sequenza ("sequenze")', 'At least one sequence is needed ("sequenze")'));
    return { errors, warnings };
  }
  if (data.sequenze.length < MIN_SEQUENCES) errors.push(tr(`Servono almeno ${MIN_SEQUENCES} sequenze`, `At least ${MIN_SEQUENCES} sequences are needed`));
  if (data.sequenze.length > MAX_SEQUENCES) errors.push(tr(`Al massimo ${MAX_SEQUENCES} sequenze`, `At most ${MAX_SEQUENCES} sequences`));
  else if (data.sequenze.length < 6) warnings.push(tr('Con meno di 6 sequenze la partita è corta (ogni squadra ne gioca una a turno)', 'With fewer than 6 sequences the game is short (each team plays one per turn)'));
  data.sequenze.forEach((s, si) => {
    const where = tr(`Sequenza ${si + 1}`, `Sequence ${si + 1}`);
    if (!isObj(s)) return errors.push(`${where}: ${tr('non valida', 'not valid')}`);
    if (!isStr(s.question)) errors.push(`${where}: ${tr('manca la domanda ("question")', 'the question is missing ("question")')}`);
    if (!isStr(s.first)) errors.push(`${where}: ${tr("manca l'etichetta della prima carta (\"first\", es. \"Il più vecchio\")", 'the label of the first card is missing ("first", e.g. "Oldest")')}`);
    if (!isStr(s.last)) errors.push(`${where}: ${tr("manca l'etichetta dell'ultima carta (\"last\", es. \"Il più recente\")", 'the label of the last card is missing ("last", e.g. "Most recent")')}`);
    if (s.source !== undefined && typeof s.source !== 'string') errors.push(`${where}: ${tr('"source" deve essere un testo', '"source" must be text')}`);
    if (!Array.isArray(s.cards)) return errors.push(`${where}: ${tr('mancano le carte ("cards")', 'the cards are missing ("cards")')}`);
    if (s.cards.length < MIN_CARDS || s.cards.length > MAX_CARDS)
      errors.push(
        tr(
          `${where}: servono da ${MIN_CARDS} a ${MAX_CARDS} carte, ce ne sono ${s.cards.length}`,
          `${where}: ${MIN_CARDS} to ${MAX_CARDS} cards are needed, there are ${s.cards.length}`,
        ),
      );
    const seen = new Map<string, number>();
    let ok = true;
    s.cards.forEach((c, ci) => {
      const at = tr(`${where}, carta ${ci + 1}`, `${where}, card ${ci + 1}`);
      if (!isObj(c) || !isStr(c.text)) {
        ok = false;
        return errors.push(`${at}: ${tr('manca il testo ("text")', 'the text is missing ("text")')}`);
      }
      if (!isStr(c.value)) {
        ok = false;
        errors.push(`${at}: ${tr('manca il valore ("value", es. "1989")', 'the value is missing ("value", e.g. "1989")')}`);
      }
      const key = letters(c.text);
      if (seen.has(key)) errors.push(tr(`${where}: le carte ${seen.get(key)! + 1} e ${ci + 1} sono uguali`, `${where}: cards ${seen.get(key)! + 1} and ${ci + 1} are the same`));
      seen.set(key, ci);
    });
    if (ok) {
      const problem = orderProblem(s.cards as Carta[], en);
      if (problem) warnings.push(`${where}: ${problem}`);
    }
  });
  return { errors, warnings };
}
