type Form = Record<string, string | number | boolean>;

/** Prompt for claude.ai (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
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
