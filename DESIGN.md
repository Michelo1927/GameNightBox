# Game Night Box: progetto

Hub di giochi da serata, tutti nella stessa stanza davanti allo stesso schermo.
Il primo gioco è il Jeopardy: ricostruzione di JeopardyLabs per le serate quiz con gli amici: gioco a squadre, un host,
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
- Si gioca a turni: la squadra di turno sceglie la casella e risponde, poi tocca alla successiva.
  Le domande che avanzano dopo un numero uguale di turni per squadra (25 mod n) sono per tutti.
- L'host può sempre correggere un punteggio a mano (per regole speciali tipo "±10%" o punteggi a tempo).

## Architettura

Il sito è un **hub di giochi**: la home (`#/`) elenca i giochi, ognuno ha le sue pagine.
Per ora c'è solo il Jeopardy.

```
GameNightBox/
├─ quizzes/                    ← contenuti del Jeopardy: un quiz = una cartella
│  └─ halloween/
│     ├─ quiz.json
│     ├─ zucca.jpg
│     └─ thriller.mp3
├─ src/
│  ├─ App.tsx                  smista gli indirizzi: home dell'hub o pagine di un gioco
│  ├─ hub/                     ← motore comune a tutti i giochi
│  │  ├─ HubHome.tsx           home con l'elenco dei giochi
│  │  ├─ games.ts              cosa deve dichiarare un gioco (nome, icona, indirizzi)
│  │  ├─ teams.ts              squadre e colori
│  │  ├─ useSaved.ts           stato salvato nel browser + Annulla
│  │  ├─ sounds.ts  media.ts  nav.ts
│  │  └─ components/           Timer, OrderWheel, Ranking, AnimatedNumber, Media, TeamList
│  └─ games/
│     ├─ index.ts              elenco dei giochi dell'hub
│     └─ jeopardy/
│        ├─ index.tsx          scheda del gioco + i suoi indirizzi
│        ├─ state.ts           regole: turni, caselle speciali, punteggi
│        ├─ pages/             Home (elenco quiz), Setup, Board
│        ├─ components/        QuestionModal, FinalModal, SpecialIntro
│        ├─ quiz/schema.ts     tipi + validazione del formato
│        ├─ creator/           "Crea un quiz" dal telefono, Claude, caricamento da codice
│        └─ editor/            editor visuale (attivo solo in locale)
├─ scripts/validate.ts         controlla tutti i quiz.json (usato da Claude e in CI)
├─ vite-plugin-editor.ts       API locali per salvare file dall'editor (solo dev)
├─ .claude/skills/crea-quiz/SKILL.md
└─ .github/workflows/deploy.yml
```

Regole dell'hub:

- `src/hub/` non importa mai da `src/games/`: così il motore resta riusabile da ogni gioco.
- Un gioco nuovo = una cartella `src/games/<id>/` con un `index.tsx` che esporta un `Game`
  (vedi `src/hub/games.ts`), aggiunto all'elenco in `src/games/index.ts`.
- Gli indirizzi del Jeopardy sono rimasti quelli di prima (`#/q/<slug>/…`, `#/crea`, `#/carica/<codice>`,
  `#/claude`), così link e codici già condivisi funzionano ancora; l'elenco dei quiz è ora in `#/jeopardy`.
- Le chiavi del `localStorage` non sono cambiate (`jeopardy-quiz:…`): partite, bozze e quiz caricati restano.

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
          "rules": "Max 3 secondi di ascolto"
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
| `rules` | no | regole visibili a tutti insieme alla domanda (es. "servono titolo e artista") |
| `hostNote` | no | nota privata per l'host: compare **solo dopo** aver mostrato la risposta |

Domanda finale facoltativa, a livello del quiz (accanto a `categories`):

```jsonc
"final": {
  "category": "Storia d'Italia",       // si vede prima delle puntate
  "question": "…", "answer": "…",      // più media, answerMedia, rules, hostNote come le altre domande
}
```

Tipi di `media`: `image`, `audio`, `video` (file locale), `youtube` (link).
`start`/`end` in secondi sono facoltativi (per audio, video e YouTube).

> Limiti di GitHub: file < 100 MB, meglio se pochi MB. Per gli audio meglio clip mp3 brevi;
> per i video meglio YouTube.

## Flusso di gioco (schermo TV/proiettore)

1. **Home**: scegli il quiz.
2. **Setup**: aggiungi le squadre (nome e colore), opzioni (durata del timer, quante caselle
   speciali di ogni tipo, 0-5). Prima del tabellone, una ruota della fortuna estrae l'ordine dei turni una
   squadra alla volta (si può saltare e tenere l'ordine della lista, modificabile con ▲ ▼). Compare solo a
   partita nuova con almeno due squadre.
3. **Tabellone**: 5 colonne con le categorie, caselle 100–500, punteggi delle squadre in basso.
4. **Domanda** (click sulla casella): testo e media a schermo intero.
   - `Spazio`: svela la risposta.
   - Per ogni squadra ci sono i bottoni ✅ (+punti) e ❌ (−punti).
   - `T`: timer (tick negli ultimi 5 secondi, suono alla fine).
   - `Esc`: chiude; la casella diventa "giocata" (si può riaprire).
   - **Caselle speciali** (scelte a caso a inizio partita, salvate nello stato in `specials`): valgono
     solo se le apre la squadra di turno, che viene salvata in `by`. 🥷 Furto: con risposta giusta la
     squadra sceglie a chi rubare i punti. 🎯 Passa la mano: la squadra può passare la domanda; chi la
     riceve non perde punti, se sbaglia i punti vanno a chi l'ha passata. 🎁 Imprevisto: una carta
     pescata all'apertura (con i punti già calcolati) cambia i punteggi, poi la domanda si gioca come
     sempre e i suoi punti si sommano a quelli della carta (all'inizio la carta sostituiva la domanda,
     ma così si perdeva una domanda del quiz).
     Il vecchio Raddoppio è stato tolto perché troppo forte (si poteva puntare tutto su una domanda
     facile); le sue puntate restano lette solo per le partite salvate prima.
5. **Domanda finale**, quando tutte le squadre hanno avuto lo stesso numero di turni: è l'ultima
   casella avanzata (se 25 non è divisibile per il numero di squadre; le altre avanzate sono per
   tutti), altrimenti la `final` del quiz, se c'è. Puntate inserite dall'host, poi domanda e ✓/✗.
6. **Fine**: schermata del vincitore con coriandoli e classifica.

Sempre disponibili: **Annulla** (Ctrl+Z, ultime 50 azioni, solo in memoria), schermo intero (F),
suoni sintetizzati con Web Audio (nessun file, 🔇 per spegnerli, scelta salvata nel browser).
La pagina `#/claude` costruisce un prompt per claude.ai e carica il JSON che Claude risponde.

## Editor locale

- Si avvia con `npm run dev` e si apre `/editor.html` (pagina separata dal gioco, non pubblicata).
- Crea un nuovo quiz o ne modifica uno esistente con una griglia identica al tabellone.
- Ogni casella ha un form: testo, risposta, scelte, nota, e media con drag & drop o incolla.
- Il plugin `vite-plugin-editor.ts` (attivo **solo in sviluppo**) scrive `quiz.json` e i media nella
  cartella del quiz. È una pagina a sé perché non importa l'elenco dei quiz: così il ricaricamento
  automatico che parte quando salvi o carichi un file non resetta l'editor.
- Pulsanti "Anteprima" (singola domanda) e "Prova" (quiz salvato).
- Per pubblicare: `git commit` + `git push` (oppure lo fa Claude).

## Crea quiz da telefono e codice condivisibile

- Pagina `#/crea` sul sito pubblicato, pensata per il telefono: una domanda per schermata, bozza salvata
  in `localStorage`, foto ridimensionate (480px JPEG) e incorporate come `data:` URL.
- "Genera il codice": `JQ1.` + base64url del JSON compresso (deflate). Condivisibile come testo, link
  (`#/carica/<codice>`) o file `.txt` (quando le foto lo rendono troppo lungo per un messaggio).
- Generare il codice salva anche il quiz tra quelli del dispositivo (sostituendo la sua versione
  precedente) e segna la bozza come finita: "Crea un quiz" dalla home (`#/crea/nuovo`) riparte da zero
  solo se la bozza è finita e non è stata più modificata. "✏️ Modifica" su un quiz caricato lo riporta
  nel creatore.
- `#/carica`: incolla codice/link o apri file → il quiz viene salvato nel browser (`localStorage`) e
  compare in home tra "Caricati su questo dispositivo".
- `npm run import -- <file|codice|link>` salva un quiz condiviso in `quizzes/` estraendo le foto.

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
