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

**Turni:** le squadre giocano a turno, nell'ordine in cui sono state create. La squadra di turno
(evidenziata) sceglie una casella e risponde; chiusa la domanda, tocca alla squadra successiva.
Ogni squadra ha lo stesso numero di domande: quelle che avanzano alla fine (es. la 25ª con 2 o 3
squadre) sono **per tutti**. Riaprire una domanda già giocata non fa avanzare il turno.

La partita è salvata nel browser: ricaricando la pagina non si perde nulla.

## Creare un quiz con Claude

Apri la cartella del progetto con Claude Code e usa la skill `/crea-quiz`:

```
/crea-quiz tema: cena di Natale con la famiglia
/crea-quiz categorie: Musica anni 80, Pokémon, Geografia, Cucina, Film Disney
/crea-quiz tema: Halloween  pubblico: amici 25-30 anni  media: tante canzoni
```

- Con **tema**, Claude sceglie le 5 categorie e scrive le 25 domande.
- Con **categorie**, Claude usa le tue categorie e scrive solo le domande.

Le domande sono ordinate per difficoltà (100 facile → 500 difficile). Claude può aggiungere immagini
libere da Wikimedia e canzoni da YouTube ("solo audio"), verifica i link, ti mostra il tabellone e,
quando approvi, lo pubblica.

## Creare un quiz con l'editor

```bash
npm run dev
```

Apri http://localhost:5173/editor.html (oppure il pulsante **✏️ Editor quiz** nella home in locale).

- Crea un quiz nuovo o aprine uno esistente: compare il tabellone; clicca una casella per modificarla.
- Per ogni domanda puoi impostare testo, risposta, scelta multipla, nota per l'host e i media
  (della domanda e della risposta): **trascina un file**, sceglilo o incollalo con Ctrl+V.
  Per YouTube incolla il link e, se serve, imposta inizio, fine e "solo audio".
- Le categorie si rinominano direttamente nel tabellone; ◀ ▶ le spostano e 🗑 le elimina.
- **Ctrl+S** salva `quiz.json` e i media nella cartella del quiz. **👁 Anteprima** mostra la domanda
  come la vedranno i giocatori; **▶ Prova** apre il quiz salvato.
- Per pubblicare: commit e push (oppure chiedi a Claude di farlo).

L'editor esiste solo in locale: il sito pubblicato contiene solo il gioco.

## Creare un quiz a mano

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
npm run validate                    # tutti i quiz
npm run validate -- <slug> --online # un quiz, controllando anche i link YouTube
```

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # valida i quiz + build in dist/
```

Ogni push su `main` pubblica automaticamente il sito su GitHub Pages (`.github/workflows/deploy.yml`).
