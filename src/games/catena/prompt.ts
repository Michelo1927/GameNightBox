import { lang } from '../../hub/i18n';
import { CHAIN_LENGTH, CLUES } from './schema';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const chains = Number(f.chains) || 4;
  const finals = Number(f.finals) || 0;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Crea un gioco "Catena di parole" in italiano per una serata tra amici a squadre.

Tema: ${topic || 'nessuno in particolare: parole ed espressioni della lingua italiana di tutti i giorni'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Una catena è fatta di ${CHAIN_LENGTH} parole: ognuna è legata alla successiva da un'espressione, un modo di dire,
una parola composta o un titolo famoso in italiano. Si vedono solo la prima e l'ultima parola; le squadre indovinano
quelle in mezzo, partendo da quelle accanto a una parola già scoperta, con l'aiuto delle lettere che si scoprono man mano.
Esempio di catena: PANE → BURRO → ARACHIDI → NOCCIOLINE … (pane e burro, burro di arachidi, arachidi e noccioline).
${finals ? `\nNel finale c'è una parola misteriosa e ${CLUES} indizi: ogni indizio è legato alla parola misteriosa allo stesso modo
(es. parola GATTO: indizi STIVALI, RANDAGIO, TOPO, NERO, MIAGOLARE).\n` : ''}
REGOLE
- Crea ${chains} catene di ${CHAIN_LENGTH} parole ciascuna.
- Ogni parola è UNA sola parola, solo lettere (niente spazi, apostrofi o trattini), da 3 a 12 lettere.
- Ogni legame tra due parole vicine deve essere noto a quasi tutti (un'espressione che si usa davvero, es. "carta di credito",
  "colpo di fulmine", "fuori luogo"). Il legame vale in entrambe le direzioni di lettura.
- Una parola non può comparire due volte nella stessa catena.
- Per ogni catena scrivi in "links" i ${CHAIN_LENGTH - 1} legami, uno per passaggio (es. "pane e burro").
- Livello: facile/medio. Evita nomi propri poco noti.
${finals ? `- Crea ${finals} parole finali, ognuna con ${CLUES} indizi di una sola parola, dal più difficile al più facile. Gli indizi non devono contenere la parola misteriosa.\n` : ''}
FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "catene": [
    { "words": ["PANE", "BURRO", "…", "…", "…", "…", "…", "…"], "links": ["pane e burro", "burro di arachidi", "…", "…", "…", "…", "…"] }
  ]${finals ? `,\n  "finali": [\n    { "answer": "…", "clues": ["…", "…", "…", "…", "…"] }\n  ]` : ''}
}`;
}

function promptEn(f: Form): string {
  const chains = Number(f.chains) || 4;
  const finals = Number(f.finals) || 0;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Create a "Word Chain" game in English for a team game night with friends.

Theme: ${topic || 'none in particular: everyday English words and expressions'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
A chain is made of ${CHAIN_LENGTH} words: each one is linked to the next by an expression, an idiom,
a compound word or a famous title in English. Only the first and the last word are shown; the teams guess
the ones in between, starting next to a word already found, helped by the letters revealed as they go.
Example chain: BREAD → BUTTER → PEANUT → GALLERY … (bread and butter, peanut butter, peanut gallery).
${finals ? `\nIn the final there is a mystery word and ${CLUES} clues: each clue is linked to the mystery word in the same way
(e.g. word CAT: clues BOOTS, ALLEY, MOUSE, BLACK, MEOW).\n` : ''}
RULES
- Create ${chains} chains of ${CHAIN_LENGTH} words each.
- Each word is ONE single word, letters only (no spaces, apostrophes or hyphens), from 3 to 12 letters.
- Each link between two neighbouring words must be known to almost everyone (an expression people really use, e.g. "credit card",
  "love at first sight", "out of place"). The link works in both reading directions.
- A word can't appear twice in the same chain.
- For each chain write the ${CHAIN_LENGTH - 1} links in "links", one per step (e.g. "bread and butter").
- Level: easy/medium. Avoid little-known proper names.
${finals ? `- Create ${finals} final words, each with ${CLUES} one-word clues, from the hardest to the easiest. The clues must not contain the mystery word.\n` : ''}
FORMAT
Answer ONLY with a valid JSON code block, with no other text:
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "catene": [
    { "words": ["BREAD", "BUTTER", "…", "…", "…", "…", "…", "…"], "links": ["bread and butter", "peanut butter", "…", "…", "…", "…", "…"] }
  ]${finals ? `,\n  "finali": [\n    { "answer": "…", "clues": ["…", "…", "…", "…", "…"] }\n  ]` : ''}
}`;
}

