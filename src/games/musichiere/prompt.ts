type Form = Record<string, string | number | boolean>;

/** Prompt for claude.ai (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  const n = Number(f.songs) || 20;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepara una playlist per un gioco "indovina la canzone" a squadre in una serata tra amici.

Tema: ${topic || 'grandi successi italiani e internazionali dagli anni 80 a oggi'}.
Pubblico: ${audience || 'amici italiani tra i 20 e i 40 anni'}.

REGOLE
- ${n} canzoni molto conosciute dal pubblico indicato: devono essere riconoscibili in pochi secondi.
- Varia artisti e periodi; niente due canzoni dello stesso artista.
- Per ogni canzone serve il link YouTube del video UFFICIALE, preferibilmente la versione "Official Audio"
  o quella dei canali "- Topic" (partono subito con la musica, senza introduzioni parlate).
- Se hai la ricerca web, cerca ogni video e usa il link vero. Se non sei sicuro del link esatto, scrivi comunque
  il link più probabile: il gioco li controlla uno per uno e mostra quali non funzionano.
- "start": facoltativo, il secondo da cui far partire la clip (es. per saltare un'introduzione lunga). Se non sei sicuro, non metterlo.
- "year": anno di uscita.

FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo:
{
  "title": "Titolo della playlist",
  "description": "Una riga di descrizione",
  "songs": [
    { "title": "…", "artist": "…", "year": 1999, "youtube": "https://www.youtube.com/watch?v=…" }
  ]
}`;
}
