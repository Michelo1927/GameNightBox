import { MAX_CARDS, MIN_CARDS } from './schema';
import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
  const sequences = Number(f.sequences) || 8;
  const cards = Math.min(MAX_CARDS, Math.max(MIN_CARDS, Number(f.cards) || 5));
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara le sequenze per un gioco a squadre "In fila!" in italiano, per una serata tra amici.

Tema: ${topic || 'vario: storia, invenzioni, film e canzoni, geografia, natura, sport, record'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

COME FUNZIONA
Sullo schermo compare una domanda (es. "Quando sono successe queste cose?") con alcune carte mescolate
(es. "Cade il Muro di Berlino", "Nasce Google", "Esce il primo iPhone"...). La squadra di turno deve dire
l'ordine giusto, da un capo all'altro della fila (es. dal più vecchio al più recente). Prende punti per ogni
carta al posto giusto; se sbaglia, le altre squadre possono rubare rimettendo in ordine tutte le carte.
Alla fine sotto ogni carta compare il suo valore (es. "1989"), che dimostra l'ordine.

REGOLE
- Crea ${sequences} sequenze, ognuna con ${cards} carte (va bene da ${MIN_CARDS} a ${MAX_CARDS}).
- Ogni sequenza ha un criterio CHIARO e MISURABILE: anno, data, altezza, lunghezza, superficie, abitanti,
  velocità, peso, età, durata, prezzo, distanza... Niente criteri di gusto o discutibili ("il più bello").
- I valori devono essere VERI e verificabili. In "source" scrivi da dove vengono (es. "Wikipedia", "ISTAT, 2024").
  Se hai la ricerca web, controlla ogni valore. Preferisci dati stabili e noti.
- Nessun pareggio, e valori non troppo vicini tra loro: l'ordine deve essere indiscutibile.
- Varia i criteri tra le sequenze (non tutte date), e mescola carte facili e difficili:
  il bello è che qualcuna si sa e qualcuna si deve ragionare.
- Le carte vanno scritte GIÀ NELL'ORDINE GIUSTO, dalla prima della fila all'ultima.
- "first" e "last" sono le etichette dei due capi della fila (es. "Il più vecchio" / "Il più recente",
  "Il più piccolo" / "Il più grande", "Il più a nord" / "Il più a sud").
- "text": la carta, breve (2-6 parole), senza il valore dentro (non "Nasce Google nel 1998").
- "value": il valore che la mette al suo posto, breve, con l'unità, la stessa per tutte le carte della
  sequenza (es. "1998", "8.848 m", "2,7 milioni", "44 a.C.").

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo del gioco",
  "description": "Una riga di descrizione",
  "sequenze": [
    {
      "question": "Quando sono successe queste cose?",
      "first": "Il più vecchio",
      "last": "Il più recente",
      "source": "Wikipedia",
      "cards": [
        { "text": "Cade il Muro di Berlino", "value": "1989" },
        { "text": "Nasce Google", "value": "1998" },
        { "text": "Esce il primo iPhone", "value": "2007" }
      ]
    }
  ]
}`;
}

function promptEn(f: Form): string {
  const sequences = Number(f.sequences) || 8;
  const cards = Math.min(MAX_CARDS, Math.max(MIN_CARDS, Number(f.cards) || 5));
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare the sequences for a team game "In Order!" in English, for a night in with friends.

Theme: ${topic || 'mixed: history, inventions, films and songs, geography, nature, sport, records'}.
Players: ${audience || 'friends between 20 and 40'}.

HOW IT WORKS
The screen shows a question (e.g. "When did these things happen?") with some shuffled cards
(e.g. "The Berlin Wall falls", "Google is founded", "The first iPhone comes out"...). The team whose turn it is must say
the right order, from one end of the row to the other (e.g. from the oldest to the most recent). It scores points for each
card in the right place; if it's wrong, the other teams can steal by putting all the cards in order.
At the end each card shows its value (e.g. "1989"), which proves the order.

RULES
- Create ${sequences} sequences, each with ${cards} cards (anything from ${MIN_CARDS} to ${MAX_CARDS} is fine).
- Each sequence has a CLEAR, MEASURABLE criterion: year, date, height, length, area, population,
  speed, weight, age, duration, price, distance... No criteria of taste or opinion ("the most beautiful").
- Values must be TRUE and verifiable. In "source" write where they come from (e.g. "Wikipedia", "UN, 2024").
  If you have web search, check every value. Prefer stable, well-known data.
- No ties, and values not too close to each other: the order must be beyond dispute.
- Vary the criteria between sequences (not all dates), and mix easy and hard cards:
  the fun is that some are known and some need reasoning.
- Write the cards ALREADY IN THE RIGHT ORDER, from the first in the row to the last.
- "first" and "last" are the labels of the two ends of the row (e.g. "Oldest" / "Most recent",
  "Smallest" / "Largest", "Furthest north" / "Furthest south").
- "text": the card, short (2-6 words), without the value in it (not "Google is founded in 1998").
- "value": the value that puts it in its place, short, with the unit, the same for every card in the
  sequence (e.g. "1998", "8,849 m", "2.7 million", "44 BC").

FORMAT
Answer ONLY with a valid JSON code block, with no other text.
Keep the keys exactly as written ("sequenze", "question", "first", "last", "cards"…):
{
  "lang": "en",
  "title": "Game title",
  "description": "A one-line description",
  "sequenze": [
    {
      "question": "When did these things happen?",
      "first": "Oldest",
      "last": "Most recent",
      "source": "Wikipedia",
      "cards": [
        { "text": "The Berlin Wall falls", "value": "1989" },
        { "text": "Google is founded", "value": "1998" },
        { "text": "The first iPhone comes out", "value": "2007" }
      ]
    }
  ]
}`;
}

