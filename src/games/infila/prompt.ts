import { MAX_CARDS, MIN_CARDS } from './schema';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
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
