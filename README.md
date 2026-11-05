# Jeopardy Quiz

Quiz in stile Jeopardy per giocare a squadre con gli amici: 5 categorie × 5 domande (100 → 500).
Risposta giusta = +punti, risposta sbagliata = −punti. Chi ha creato il quiz fa da host.

Supporta domande con **immagini, audio, video e YouTube** (anche "solo audio" per indovinare le canzoni),
**scelta multipla**, **regole** visibili a tutti e **note per l'host** (che compaiono solo dopo la risposta).

## Giocare

1. Apri il sito e scegli un quiz.
2. Crea le squadre (nome e colore). L'ordine delle squadre è l'ordine dei turni: si cambia con ▲ ▼
   oppure con **🎲 Sorteggia l'ordine**. Nelle **Opzioni** scegli la durata del timer e quante caselle speciali di ogni tipo usare (da 0 a 5, di default una per tipo).
3. Clicca una casella, poi:
   - **Spazio**: mostra o nasconde la risposta;
   - **T** (o il pulsante ⏱): fa partire il timer; ripremendo ricomincia, ▾ sceglie un'altra durata, ✕ lo ferma;
   - **✓ / ✗** sotto ogni squadra: aggiunge o toglie i punti della casella (cliccando di nuovo annulli);
   - **Esc**: torna al tabellone.
4. Per correggere un punteggio a mano (regole speciali, errori): **clicca il punteggio** e scrivi il
   valore esatto (es. `350`), oppure `+120` / `-30` per aggiungere o togliere punti; Invio conferma,
   Esc annulla. I pulsanti **− / +** sotto i punteggi tolgono o aggiungono 50 punti.
5. **↶ Annulla** (o **Ctrl+Z**) torna indietro di un'azione: un ✓/✗, una casella chiusa, una correzione.
6. Il pulsante **⏱** c'è anche sul tabellone (tasto T), per cronometrare quello che vuoi durante la partita.
7. **⛶** (o **F**) mette lo schermo intero; **🔊/🔇** accende o spegne i suoni.

**✨ Caselle speciali:** alcune caselle nascoste si rivelano
quando la squadra di turno le apre:
- **🥷 Furto**: se la squadra risponde giusto, i punti li ruba a una squadra a scelta (+ a sé, − all'altra).
  Se sbaglia li perde come sempre.
- **🎯 Passa la mano**: letta la domanda, la squadra può passarla a un'altra. Se quella indovina prende
  i punti; se sbaglia non perde niente e i punti vanno a chi l'ha passata.
- **🎁 Imprevisto**: niente domanda, si gira una carta a sorpresa (colpo di fortuna, tasse, festa per
  tutti, Robin Hood, scambio di punteggio con la squadra davanti, regalo all'ultima).

**🏆 Domanda finale:** si gioca quando tutte le squadre hanno avuto lo stesso numero di turni.
- Se avanzano caselle (es. 2 squadre: 12 a testa, ne avanza 1), **l'ultima casella rimasta è la
  domanda finale**; le eventuali altre caselle avanzate si giocano prima, per tutti
  (es. 7 squadre: 3 a testa, 3 per tutti, 1 finale).
- Se non avanza niente (es. 5 squadre: 5 a testa), si gioca la domanda finale del quiz, se ce l'ha.

Si vede solo la categoria; ogni squadra scrive su un foglio quanto scommette (da 0 al proprio
punteggio) e l'host inserisce le puntate. Poi domanda, risposta e ✓/✗ per ogni squadra.
Alla fine parte la schermata del vincitore. La pagina delle squadre dice come finirà la partita.

**Turni:** le squadre giocano a turno, nell'ordine della pagina delle squadre. La squadra di turno
(evidenziata) sceglie una casella e risponde; chiusa la domanda, tocca alla squadra successiva.
Ogni squadra ha lo stesso numero di domande: quelle che avanzano alla fine sono **per tutti**, e
l'ultima è la domanda finale. Riaprire una domanda già giocata non fa avanzare il turno.

La partita è salvata nel browser: ricaricando la pagina non si perde nulla.

## Creare un quiz dal telefono (anche per gli amici)

Sul sito tocca **✏️ Crea un quiz**: si compila una domanda alla volta, con foto dalla galleria,
link a immagini, video YouTube (anche "solo audio" per le canzoni) e risposte multiple.
La bozza si salva da sola sul telefono.

Alla fine **✨ Genera il codice** produce un testo (`JQ1.…`) e un link da mandare a chi fa da host:
- aprendo il **link** il quiz si carica e si gioca subito;
- oppure, sul sito, **📥 Carica un quiz** e incolla il codice (o apri il file `.txt`).

Le foto allungano molto il codice: se è troppo lungo per un messaggio, il sito propone di
condividerlo come file. I quiz caricati restano salvati solo su quel dispositivo; per renderne uno
permanente sul sito:

```bash
npm run import -- codice.txt      # oppure il codice o il link direttamente
```

Lo script crea `quizzes/<nome>/` estraendo le foto in file; poi commit e push.

## Creare un quiz con Claude (dal sito)

Sul sito tocca **🤖 Crea con Claude**: scrivi il tema (o le 5 categorie), copia il prompt e incollalo
su [claude.ai](https://claude.ai). Poi incolla qui la risposta di Claude: il quiz si carica e si gioca.
Funziona anche dal telefono e non serve installare niente (le domande sono solo testo).

## Creare un quiz con Claude Code

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

Apri http://localhost:5173/editor.html (oppure il pulsante **🛠 Editor (locale)** nella home).

- Crea un quiz nuovo o aprine uno esistente: compare il tabellone; clicca una casella per modificarla.
- Per ogni domanda puoi impostare testo, risposta, scelta multipla, regole, nota per l'host e i media
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
