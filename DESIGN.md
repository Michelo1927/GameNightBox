# JeopardyQuiz: progetto

Ricostruzione di JeopardyLabs per le serate quiz con gli amici: gioco a squadre, un host,
5 categorie × 5 domande (100 → 500), con supporto a immagini, audio e video,
e creazione dei quiz tramite Claude.

## Decisioni prese

| Tema | Scelta |
|---|---|
| Hosting | GitHub Pages (gratuito), repository pubblico, deploy automatico con GitHub Actions |
| Visibilità risposte | In chiaro nei file (non è un problema) |
| Creazione con Claude | Skill di Claude Code `/crea-quiz` dentro il repo (nessun costo API) |
| Editor manuale | Editor visuale **locale** (`npm run dev`), che salva i file nel repo |
| Media | Immagini, audio, video / YouTube |
| Import da JeopardyLabs | Non previsto per ora |

## Regole di gioco

- Si gioca a squadre; chi ha creato il quiz fa da host e gestisce il tabellone.
- Risposta corretta: la squadra **guadagna** i punti della casella.
- Risposta sbagliata: la squadra **perde** i punti della casella.
- Più squadre possono rispondere alla stessa domanda (es. una sbaglia e un'altra indovina).
- L'host può sempre correggere un punteggio a mano (per regole speciali tipo "±10%" o punteggi a tempo).

## Architettura

```
JeopardyQuiz/
├─ quizzes/                    ← un quiz = una cartella
│  └─ halloween/
│     ├─ quiz.json
│     ├─ zucca.jpg
│     └─ thriller.mp3
├─ src/                        ← app React + TypeScript (Vite)
│  ├─ pages/Home.tsx           elenco quiz
│  ├─ pages/Setup.tsx          creazione squadre
│  ├─ pages/Board.tsx          tabellone 5×5 + punteggi
│  ├─ components/QuestionModal.tsx  domanda → risposta → assegna punti
│  ├─ components/Media.tsx     immagine / audio / video / YouTube
│  ├─ editor/                  editor visuale (attivo solo in locale)
│  └─ quiz/schema.ts           tipi + validazione del formato
├─ scripts/validate.ts         controlla tutti i quiz.json (usato da Claude e in CI)
├─ vite-plugin-editor.ts       API locali per salvare file dall'editor (solo dev)
├─ .claude/skills/crea-quiz/SKILL.md
└─ .github/workflows/deploy.yml
```

- I quiz vengono caricati in fase di build (`import.meta.glob`): basta aggiungere una
  cartella in `quizzes/` e il quiz compare in home.
- Lo stato della partita (squadre, punteggi, caselle giocate) è salvato nel `localStorage`:
  ricaricando la pagina non si perde nulla. C'è un pulsante "Nuova partita".

## Formato del quiz (`quiz.json`)

```jsonc
{
  "title": "Halloween",
  "description": "Quiz per la serata del 31",
  "author": "Michele",
  "categories": [
    {
      "name": "INDOVINA LA CANZONE",
      "questions": [
        {
          "points": 100,
          "question": "Di chi è questa canzone?",
          "media": { "type": "audio", "src": "thriller.mp3", "start": 0, "end": 3 },
          "answer": "Thriller - Michael Jackson",
          "hostNote": "Max 3 secondi di ascolto"
        },
        {
          "points": 200,
          "question": "Che film è?",
          "media": { "type": "youtube", "src": "https://youtu.be/XXXX", "start": 42, "end": 50 },
          "answer": "Shining"
        },
        {
          "points": 300,
          "question": "Da dove deriva la parola \"ciao\"?",
          "choices": ["Dal greco", "Dal tardo latino sclavus", "Dal francese", "Dal longobardo"],
          "answer": "Dal tardo latino sclavus",
          "answerMedia": { "type": "image", "src": "schiavo.jpg" }
        }
        // ... fino a 500
      ]
    }
    // ... 5 categorie
  ]
}
```

Campi della domanda:

| Campo | Obbligatorio | Note |
|---|---|---|
| `points` | sì | 100, 200, 300, 400, 500 |
| `question` | sì* | testo della domanda (*può essere vuoto se c'è `media`) |
| `answer` | sì | testo della risposta |
| `media` | no | media mostrato con la domanda |
| `answerMedia` | no | media mostrato quando si svela la risposta |
| `choices` | no | opzioni per la scelta multipla |
| `hostNote` | no | nota per l'host (regole speciali), visibile in piccolo |

Tipi di `media`: `image`, `audio`, `video` (file locale), `youtube` (link).
`start`/`end` in secondi sono facoltativi (per audio, video e YouTube).

> Limiti di GitHub: file < 100 MB, meglio se pochi MB. Per gli audio meglio clip mp3 brevi;
> per i video meglio YouTube.

## Flusso di gioco (schermo TV/proiettore)

1. **Home**: scegli il quiz.
2. **Setup**: aggiungi le squadre (nome e colore).
3. **Tabellone**: 5 colonne con le categorie, caselle 100–500, punteggi delle squadre in basso.
4. **Domanda** (click sulla casella): testo e media a schermo intero.
   - `Spazio`: svela la risposta.
   - Per ogni squadra ci sono i bottoni ✅ (+punti) e ❌ (−punti).
   - `Esc`: chiude; la casella diventa "giocata" (si può riaprire).
5. **Fine**: classifica finale.

## Editor locale

- Si avvia con `npm run dev` e si apre `/editor.html` (pagina separata dal gioco, non pubblicata).
- Crea un nuovo quiz o ne modifica uno esistente con una griglia identica al tabellone.
- Ogni casella ha un form: testo, risposta, scelte, nota, e media con drag & drop o incolla.
- Il plugin `vite-plugin-editor.ts` (attivo **solo in sviluppo**) scrive `quiz.json` e i media nella
  cartella del quiz. È una pagina a sé perché non importa l'elenco dei quiz: così il ricaricamento
  automatico che parte quando salvi o carichi un file non resetta l'editor.
- Pulsanti "Anteprima" (singola domanda) e "Prova" (quiz salvato).
- Per pubblicare: `git commit` + `git push` (oppure lo fa Claude).

## Skill Claude: `/crea-quiz`

Due modalità:

- **Tutto a Claude**: `/crea-quiz tema: Natale in famiglia`.
  Claude sceglie 5 categorie varie e scrive 25 domande.
- **Categorie tue**: `/crea-quiz categorie: Musica anni 80, Pokémon, Geografia, Cucina, Film Disney`.
  Claude scrive solo le domande.

Opzioni facoltative nel prompt: pubblico (es. "amici 25–30 anni"), lingua, tipi di domanda
da includere (immagini, canzoni, scelta multipla), domande da evitare.

Cosa fa la skill:
1. Legge lo schema del formato e alcuni quiz di esempio dal repo.
2. Scrive le domande con difficoltà crescente. Linee guida per la scala:
   - 100: la sa quasi chiunque;
   - 300: serve conoscere un po' l'argomento;
   - 500: per esperti o dettagli poco noti.
3. Verifica i fatti e preferisce risposte univoche e brevi.
4. Facoltativo: cerca immagini con licenza libera (Wikimedia Commons), le scarica nella
   cartella del quiz e cita la fonte in `credits`. Per l'audio inserisce dei segnaposto
   e chiede a te i file mp3, oppure usa un link YouTube con il tempo di inizio.
5. Lancia `npm run validate`, ti mostra un riepilogo del tabellone e, se approvi, fa
   commit e push. Il quiz è online in circa 1 minuto.

## Fasi di sviluppo

1. **Base**: progetto Vite + React + TS, schema, validatore, un quiz di esempio.
2. **Gioco**: home, setup squadre, tabellone, finestra domanda, punteggi, salvataggio partita.
3. **Media**: immagini, audio con start/end, video, YouTube.
4. **Deploy**: repository GitHub + GitHub Actions + Pages.
5. **Skill Claude** `/crea-quiz` + documentazione d'uso nel README.
6. **Editor locale**.
