import { MAX_ANSWERS, MIN_ANSWERS } from './schema';
import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const lists = Number(f.lists) || 6;
  const answers = Math.min(MAX_ANSWERS, Math.max(MIN_ANSWERS, Number(f.answers) || 10));
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara le liste per un gioco "Top Ten" in italiano, per una serata tra amici a squadre.

Tema: ${topic || 'vario: geografia, cultura generale, sport, spettacolo, cibo, record'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Sullo schermo c'è una domanda (es. "I 10 fiumi più lunghi d'Italia") e un tabellone con le risposte coperte.
Le squadre dicono una risposta alla volta: se è nella lista si scopre. Tutte le voci valgono gli stessi punti.
L'host scrive quello che dicono le squadre e l'app lo confronta con la lista, quindi le risposte devono essere
nomi brevi e precisi.

REGOLE
- Crea ${lists} liste, ognuna con ${answers} risposte (se una lista vera ne ha meno, va bene da ${MIN_ANSWERS} a ${MAX_ANSWERS}).
- Ogni lista deve essere VERA e VERIFICABILE: una classifica con dati reali (popolazione, lunghezza, vendite,
  record, titoli vinti…) oppure un elenco completo e chiuso (es. i 7 colli di Roma). Niente classifiche
  di gusto o sondaggi inventati.
- In "source" scrivi da dove viene (es. "ISTAT, 2024", "Wikipedia: Fiumi d'Italia", o un link).
  Se hai la ricerca web, controlla ogni lista sulla fonte. Preferisci dati stabili: evita classifiche che
  cambiano spesso o dove le ultime posizioni sono in bilico.
- Risposte in ordine, dal 1º posto in giù. In "note" il dato che le ordina, breve (es. "652 km", "2,7 milioni").
- "text": il nome più comune, corto (es. "Stati Uniti", non "Stati Uniti d'America").
- "also": altri modi in cui una squadra potrebbe dirla (es. ["USA", "America"]); niente nomi che valgano per due risposte.
- Difficoltà: almeno 3-4 risposte per lista note a quasi tutti, qualcuna difficile.
- Liste varie tra loro; domanda chiara, con il numero di risposte (es. "Le 8 città…").

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "liste": [
    {
      "question": "I 10 fiumi più lunghi d'Italia",
      "source": "Wikipedia: Fiumi d'Italia",
      "answers": [
        { "text": "Po", "note": "652 km" },
        { "text": "Adige", "note": "410 km" }
      ]
    }
  ]
}`;
}

function promptEn(f: Form): string {
  const lists = Number(f.lists) || 6;
  const answers = Math.min(MAX_ANSWERS, Math.max(MIN_ANSWERS, Number(f.answers) || 10));
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare the lists for a "Top Ten" game in English, for a team game night with friends.

Theme: ${topic || 'mixed: geography, general knowledge, sport, entertainment, food, records'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
The screen shows a question (e.g. "The 10 longest rivers in Europe") and a board with the answers covered.
Teams say one answer at a time: if it's on the list, it's uncovered. Every answer is worth the same points.
The host types what the teams say and the app compares it with the list, so answers must be
short, precise names.

RULES
- Create ${lists} lists, each with ${answers} answers (if a real list has fewer, anything from ${MIN_ANSWERS} to ${MAX_ANSWERS} is fine).
- Every list must be TRUE and VERIFIABLE: a ranking with real data (population, length, sales,
  records, titles won…) or a complete, closed list (e.g. the 7 continents). No rankings based on
  taste or made-up polls.
- In "source" write where it comes from (e.g. "UN, 2024", "Wikipedia: List of rivers of Europe", or a link).
  If you have web search, check every list against the source. Prefer stable data: avoid rankings that
  change often or where the last places are uncertain.
- Answers in order, from 1st place down. In "note" the figure behind the order, short (e.g. "3,530 km", "2.7 million").
- "text": the most common name, short (e.g. "United States", not "United States of America").
- "also": other ways a team might say it (e.g. ["USA", "America"]); no names that fit two answers.
- Difficulty: at least 3-4 answers per list known to almost everyone, some hard ones.
- Varied lists; a clear question that includes the number of answers (e.g. "The 8 cities…").

FORMAT
Answer ONLY with a valid JSON code block, with no other text.
Keep the keys exactly as written ("liste", "question", "answers"…):
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "liste": [
    {
      "question": "The 10 longest rivers in Europe",
      "source": "Wikipedia: List of rivers of Europe",
      "answers": [
        { "text": "Volga", "note": "3,530 km" },
        { "text": "Danube", "note": "2,850 km" }
      ]
    }
  ]
}`;
}

