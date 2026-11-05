# Jeopardy Quiz

Quiz in stile Jeopardy per giocare a squadre con gli amici: 5 categorie × 5 domande (100 → 500).
Risposta giusta = +punti, risposta sbagliata = −punti. Chi ha creato il quiz fa da host.

Supporta domande con **immagini, audio, video e YouTube** (anche "solo audio" per indovinare le canzoni),
**scelta multipla** e **note per l'host**.

## Giocare

1. Apri il sito e scegli un quiz.
2. Crea le squadre (nome e colore).
3. Clicca una casella, poi:
   - **Spazio**: mostra o nasconde la risposta;
   - **✓ / ✗** sotto ogni squadra: aggiunge o toglie i punti della casella (cliccando di nuovo annulli);
   - **Esc**: torna al tabellone.
4. I pulsanti **− / +** sotto i punteggi correggono a mano di 50 punti (per regole speciali).

La partita è salvata nel browser: ricaricando la pagina non si perde nulla.

## Creare un quiz

Ogni quiz è una cartella in `quizzes/` con un file `quiz.json` e i suoi media:

```
quizzes/halloween/
├─ quiz.json
├─ zucca.jpg
└─ canzone.mp3
```

Il formato completo è descritto in [DESIGN.md](DESIGN.md#formato-del-quiz-quizjson); come esempio
c'è [quizzes/esempio/quiz.json](quizzes/esempio/quiz.json).

Prima di pubblicare, controlla il quiz con:

```bash
npm run validate
```

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # valida i quiz + build in dist/
```

Ogni push su `main` pubblica automaticamente il sito su GitHub Pages (`.github/workflows/deploy.yml`).
