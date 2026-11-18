import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const n = Number(f.questions) || 100;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara le domande per un gioco a squadre "In ritardo!" in italiano, per una serata tra amici.

Tema: ${topic || 'cultura generale facile: geografia, storia, natura, animali, corpo umano, sport, cibo, numeri, cose di tutti i giorni'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Le domande arrivano una dopo l'altra, contro il tempo, ma la squadra risponde sempre "in ritardo di una":
mentre legge una domanda deve dire la risposta di quella PRIMA, e intanto ricordarsi la risposta di quella nuova.
Esempio: "Quanti sono i colli di Roma?" → si dice la parola d'ordine; "Chi fu il primo re di Roma?" → si dice "7";
"Quante zampe ha un cane?" → si dice "Romolo"; e così via. Se sbaglia, ricomincia dalla prima domanda della stessa lista.
La difficoltà è tutta nel tenere a mente la risposta mentre se ne legge un'altra: le domande devono essere FACILI.

REGOLE
- Crea ${n} domande, tutte diverse.
- Domande di cultura generale facile: la risposta la sa quasi chiunque, al primo colpo, senza pensarci.
- Una sola risposta giusta e indiscutibile (niente "dipende", niente risposte con più versioni).
- Domande brevi, da leggere in 2-3 secondi.
- Risposte CORTISSIME, da ricordare al volo: un numero, un nome, una parola; al massimo 2-3 parole.
  I numeri scritti in cifre ("7", "1492").
- Varia molto il tipo di risposta (numeri, persone, città, animali, colori, oggetti…), così le risposte non si confondono tra loro.
- La risposta non deve essere scritta nella domanda.

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "domande": [
    { "question": "Quanti sono i colli di Roma?", "answer": "7" },
    { "question": "Chi fu il primo re di Roma?", "answer": "Romolo" }
  ]
}`;
}

function promptEn(f: Form): string {
  const n = Number(f.questions) || 100;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare the questions for a team game "One Behind!" in English, for a night in with friends.

Theme: ${topic || 'easy general knowledge: geography, history, nature, animals, the human body, sport, food, numbers, everyday things'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
The questions come one after another, against the clock, but the team always answers "one behind":
while reading a question it must say the answer to the PREVIOUS one, and meanwhile remember the answer to the new one.
Example: "How many hills is Rome built on?" → they say the password; "Who was the first king of Rome?" → they say "7";
"How many legs does a dog have?" → they say "Romulus"; and so on. If they slip, they start again from the first question of the same list.
All the difficulty is in keeping the answer in mind while reading another question: the questions must be EASY.

RULES
- Create ${n} questions, all different.
- Easy general knowledge: almost anyone knows the answer straight away, without thinking.
- One right answer, beyond dispute (no "it depends", no answers with several versions).
- Short questions, readable in 2-3 seconds.
- VERY short answers, to remember on the fly: a number, a name, a word; at most 2-3 words.
  Numbers written as digits ("7", "1492").
- Vary the kind of answer a lot (numbers, people, cities, animals, colours, objects…), so the answers don't get mixed up.
- The answer must not be written in the question.

FORMAT
Answer ONLY with a valid JSON code block, with no other text.
Keep the keys exactly as written ("domande", "question", "answer"):
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "domande": [
    { "question": "How many hills is Rome built on?", "answer": "7" },
    { "question": "Who was the first king of Rome?", "answer": "Romulus" }
  ]
}`;
}
