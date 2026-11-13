import { lang } from '../../hub/i18n';
import { LETTERS_EN, LETTERS_IT } from './schema';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const LETTERS = LETTERS_IT;
  const n = Number(f.teams) || 2;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Crea un gioco "Passaparola" in italiano per una serata tra amici a squadre.

Tema: ${topic || 'cultura generale varia (cinema, musica, geografia, storia, cucina, sport, scienza, parole comuni)'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Ogni squadra ha una sua ruota con le ${LETTERS.length} lettere dell'alfabeto italiano, in quest'ordine:
${LETTERS.join(' ')}
Per ogni lettera c'è una definizione e la risposta deve INIZIARE con quella lettera ("type": "inizia"),
oppure, solo per le lettere difficili, CONTENERE quella lettera ("type": "contiene").

REGOLE
- Crea ${n} ruote, una per squadra. Ogni ruota ha tutte le ${LETTERS.length} lettere, nell'ordine sopra.
- Le ruote devono essere ugualmente difficili: alla stessa lettera, difficoltà simile ma risposte diverse.
- Nessuna risposta ripetuta tra le ruote.
- Risposta: preferibilmente UNA parola (nome comune, nome proprio, verbo all'infinito), senza articolo.
  La risposta deve davvero iniziare con la lettera (o contenerla se "contiene"): controllala lettera per lettera.
- Usa "contiene" solo quando serve (tipicamente H, Q, Z e qualche volta U, V). Nella definizione non dire se inizia o contiene: lo mostra il gioco.
- Definizione: chiara, una sola risposta possibile, massimo 200 caratteri, stile quiz TV.
  Esempi: N, inizia → "Il grande fiume dell'Egitto" → "Nilo"; Q, contiene → "Lo è un numero diviso per due senza resto" → "Pari" NO
  (non contiene la Q!), meglio Q, contiene → "Si usa per spegnere la sete" → "Acqua".
- La definizione non deve contenere la risposta né parole della stessa famiglia.
- Livello: facile/medio, adatto a tutto il tavolo. Varia gli argomenti all'interno della stessa ruota.
- "accept": facoltativo, altre risposte valide (sinonimi, grafie diverse), che rispettino anche loro la lettera.

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "ruote": [
    {
      "items": [
        { "letter": "A", "type": "inizia", "question": "…", "answer": "…" },
        { "letter": "B", "type": "inizia", "question": "…", "answer": "…", "accept": ["…"] },
        { "letter": "H", "type": "contiene", "question": "…", "answer": "…" }
        // … tutte le ${LETTERS.length} lettere, fino alla Z
      ]
    }
    // … ${n} ruote in tutto
  ]
}`;
}

function promptEn(f: Form): string {
  const LETTERS = LETTERS_EN;
  const n = Number(f.teams) || 2;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Create an "Alphabet Wheel" game in English for a team game night with friends.

Theme: ${topic || 'mixed general knowledge (movies, music, geography, history, food, sport, science, everyday words)'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
Each team has its own wheel with the ${LETTERS.length} letters of the English alphabet, in this order:
${LETTERS.join(' ')}
For each letter there is a clue and the answer must START with that letter ("type": "inizia", which means "starts with"),
or, only for the hard letters, CONTAIN that letter ("type": "contiene", which means "contains").
Keep these two Italian values exactly as written: they are the file format.

RULES
- Create ${n} wheels, one per team. Each wheel has all ${LETTERS.length} letters, in the order above.
- The wheels must be equally hard: at the same letter, similar difficulty but different answers.
- No answer repeated between the wheels.
- Answer: preferably ONE word (common noun, proper name, verb), without an article.
  The answer must really start with the letter (or contain it if "contiene"): check it letter by letter.
- Use "contiene" only when needed (typically Q, X, Z and sometimes J, K, Y). In the clue don't say whether it starts with or contains the letter: the game shows it.
- Clue: clear, only one possible answer, 200 characters at most, TV quiz style.
  Examples: N, inizia → "The great river of Egypt" → "Nile"; X, contiene → "The opposite of the minimum" → "Most" NO
  (it doesn't contain the X!), better X, contiene → "The opposite of the minimum" → "Maximum".
- The clue must not contain the answer or words of the same family.
- Level: easy/medium, fit for the whole table. Vary the topics within the same wheel.
- "accept": optional, other valid answers (synonyms, other spellings), that also respect the letter.

FORMAT
Answer ONLY with a valid JSON code block, with no other text:
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "ruote": [
    {
      "items": [
        { "letter": "A", "type": "inizia", "question": "…", "answer": "…" },
        { "letter": "B", "type": "inizia", "question": "…", "answer": "…", "accept": ["…"] },
        { "letter": "X", "type": "contiene", "question": "…", "answer": "…" }
        // … all ${LETTERS.length} letters, up to Z
      ]
    }
    // … ${n} wheels in all
  ]
}`;
}
