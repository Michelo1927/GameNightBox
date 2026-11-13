import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const n = Number(f.themes) || 40;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara i temi per un gioco a squadre "All'asta!" in italiano, per una serata tra amici.

Tema generale: ${topic || 'vario: animali, cibo, geografia, sport, musica, cinema, TV, cose di casa, mestieri'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Sullo schermo esce un tema (es. "Animali della savana"). Le squadre fanno un'asta: "ne diciamo 8", "10", "12"…
Chi offre di più deve dire, entro un tempo fisso (di solito 60 secondi), almeno tante risposte quante ne ha promesse.
L'host le conta a voce, fidandosi: non c'è una lista di risposte da controllare.

REGOLE
- Crea ${n} temi, tutti diversi e che non si sovrappongano (non "Frutti" e "Frutti tropicali" insieme).
- Ogni tema deve avere TANTE risposte possibili che una persona normale conosce: almeno 15-20, meglio di più.
  Così l'asta sale e la sfida è dire tutte quelle promesse in tempo.
- Le risposte devono essere facili da giudicare al volo (giusta o no si capisce subito), brevi da dire (una o due parole).
- Temi corti, da leggere in un colpo d'occhio sulla TV: al massimo 6-7 parole.
- Mescola temi chiusi (es. "Regioni italiane", "Capitali europee") e aperti (es. "Cose che trovi in un bagno", "Cose di colore rosso"),
  facili e un po' più difficili.
- Niente temi troppo di nicchia o che dipendono dai gusti personali.

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "temi": [
    "Animali della savana",
    "Cose che trovi in un bagno"
  ]
}`;
}

function promptEn(f: Form): string {
  const n = Number(f.themes) || 40;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare the themes for a team game "Going Once!" in English, for a night in with friends.

Overall theme: ${topic || 'mixed: animals, food, geography, sport, music, movies, TV, household things, jobs'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
A theme appears on the screen (e.g. "Animals of the savannah"). The teams hold an auction: "we'll name 8", "10", "12"…
The highest bidder must say, within a fixed time (usually 60 seconds), at least as many answers as they promised.
The host counts them out loud, on trust: there is no list of answers to check against.

RULES
- Create ${n} themes, all different and not overlapping (not "Fruit" and "Tropical fruit" together).
- Each theme must have MANY possible answers that an ordinary person knows: at least 15-20, more is better.
  That way the auction climbs and the challenge is saying all the promised ones in time.
- The answers must be easy to judge on the spot (right or not is obvious straight away), short to say (one or two words).
- Short themes, readable at a glance on the TV: 6-7 words at most.
- Mix closed themes (e.g. "US states", "European capitals") and open ones (e.g. "Things you find in a bathroom", "Things that are red"),
  easy ones and slightly harder ones.
- No themes that are too niche or depend on personal taste.

FORMAT
Answer ONLY with a valid JSON code block, with no other text.
Keep the keys exactly as written ("temi"…):
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "temi": [
    "Animals of the savannah",
    "Things you find in a bathroom"
  ]
}`;
}

