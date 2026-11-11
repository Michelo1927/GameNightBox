import { MAX_ANSWERS, MIN_ANSWERS } from './schema';

type Form = Record<string, string | number | boolean>;

/** Prompt for claude.ai (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
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
