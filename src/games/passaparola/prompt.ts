import { LETTERS } from './schema';

type Form = Record<string, string | number | boolean>;

/** Prompt for claude.ai (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
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
