import { lang } from '../../hub/i18n';

type Form = Record<string, string | number | boolean>;

/** Prompt for any AI chat: ChatGPT, Claude, Gemini… (also the reference for the Claude Code skill). */
export function prompt(f: Form): string {
  if (lang === 'en') return promptEn(f);
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

function promptEn(f: Form): string {
  const n = Number(f.songs) || 20;
  const topic = String(f.topic ?? '').trim();
  const audience = String(f.audience ?? '').trim();
  return `Prepare a playlist for a team "name the song" game at a night in with friends.

Theme: ${topic || 'big international hits from the 80s to today'}.
Players: ${audience || 'friends between 20 and 40'}.

RULES
- ${n} songs very well known to these players: they must be recognisable in a few seconds.
- Vary artists and periods; no two songs by the same artist.
- For each song you need the YouTube link of the OFFICIAL video, preferably the "Official Audio" version
  or the one from the "- Topic" channels (they start straight away with the music, without spoken intros).
- If you have web search, look up each video and use the real link. If you're not sure of the exact link, still write
  the most likely link: the game checks them one by one and shows which ones don't work.
- "start": optional, the second the clip should start from (e.g. to skip a long intro). If you're not sure, leave it out.
- "year": release year.

FORMAT
Answer ONLY with a valid JSON code block, with no other text:
{
  "lang": "en",
  "title": "Playlist title",
  "description": "A one-line description",
  "songs": [
    { "title": "…", "artist": "…", "year": 1999, "youtube": "https://www.youtube.com/watch?v=…" }
  ]
}`;
}

