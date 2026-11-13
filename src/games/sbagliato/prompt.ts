import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const n = Number(f.questions) || 100;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara le domande per un gioco a squadre "Sbagliato!" in italiano, per una serata tra amici.

Tema: ${topic || 'vario: cose di tutti i giorni, natura, animali, cibo, geografia facile, numeri, colori'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Le domande arrivano a raffica, una ogni pochi secondi, e hanno sempre DUE risposte possibili.
La squadra deve dire la risposta SBAGLIATA, il più in fretta possibile, a tutte le domande della sua lista (di solito 22) di fila.
Se sbaglia ricomincia dalla prima domanda della stessa lista, quindi l'ordine conta poco: conta che le domande siano tante e diverse.
Esempio: "È più alto un albero o un fiore?" → la squadra deve dire "fiore".
Il bello è che la risposta vera viene d'istinto: le domande devono essere facilissime, così la fatica è non dirla.

REGOLE
- Crea ${n} domande, tutte diverse.
- La risposta vera deve essere OVVIA per chiunque e indiscutibile (niente trabocchetti, niente "dipende").
- Domande brevi, da leggere in 2 secondi; le due risposte di 1-3 parole, scritte nella domanda
  (es. "Il ghiaccio è caldo o freddo?", "Quante zampe ha un gatto: quattro o sei?").
- Varia il tipo: confronti (più grande, più veloce…), colori, numeri, categorie (è un frutto o un ortaggio?),
  luoghi, contrari, cose di casa. Varia anche la posizione della risposta vera (a volte prima, a volte seconda).
- "answer" è la risposta VERA (quella da non dire), "other" è quella SBAGLIATA (quella da dire).

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "domande": [
    { "question": "È più alto un albero o un fiore?", "answer": "Albero", "other": "Fiore" },
    { "question": "Il ghiaccio è caldo o freddo?", "answer": "Freddo", "other": "Caldo" }
  ]
}`;
}

function promptEn(f: Form): string {
  const n = Number(f.questions) || 100;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare the questions for a team game "Wrong Answer!" in English, for a night in with friends.

Theme: ${topic || 'mixed: everyday things, nature, animals, food, easy geography, numbers, colours'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
The questions come in a rapid-fire stream, one every few seconds, and always have TWO possible answers.
The team must say the WRONG answer, as fast as possible, to every question on its list (usually 22) in a row.
If they slip they start again from the first question of the same list, so the order matters little: what matters is that the questions are many and varied.
Example: "Which is taller, a tree or a flower?" → the team must say "flower".
The fun is that the true answer comes by instinct: the questions must be super easy, so the hard part is not saying it.

RULES
- Create ${n} questions, all different.
- The true answer must be OBVIOUS to anyone and beyond dispute (no tricks, no "it depends").
- Short questions, readable in 2 seconds; the two answers 1-3 words long, written in the question
  (e.g. "Is ice hot or cold?", "How many legs does a cat have: four or six?").
- Vary the type: comparisons (bigger, faster…), colours, numbers, categories (is it a fruit or a vegetable?),
  places, opposites, household things. Also vary the position of the true answer (sometimes first, sometimes second).
- "answer" is the TRUE answer (the one not to say), "other" is the WRONG one (the one to say).

FORMAT
Answer ONLY with a valid JSON code block, with no other text.
Keep the keys exactly as written ("domande", "question", "answer", "other"):
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "domande": [
    { "question": "Which is taller, a tree or a flower?", "answer": "Tree", "other": "Flower" },
    { "question": "Is ice hot or cold?", "answer": "Cold", "other": "Hot" }
  ]
}`;
}

