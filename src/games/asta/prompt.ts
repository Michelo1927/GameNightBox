type Form = Record<string, string | number | boolean>;

/** Prompt for claude.ai (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
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
