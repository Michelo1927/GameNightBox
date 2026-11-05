---
name: crea-quiz
description: Crea un nuovo quiz Jeopardy (5 categorie × 5 domande da 100 a 500) nel formato di questo progetto, con domande di difficoltà crescente, media opzionali (immagini Wikimedia, YouTube) e pubblicazione su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare un quiz, anche indicando solo un tema o solo le categorie.
argument-hint: "tema: <tema>  |  categorie: <cat1>, <cat2>, ...  [pubblico: ...] [media: sì/no]"
---

# Crea quiz

Crei un quiz per le serate a squadre dell'utente. Si gioca così: chi ha preparato il quiz fa da host,
risposta giusta = +punti, sbagliata = −punti. Quindi le domande devono avere **una risposta chiara e
breve** che l'host possa giudicare subito.

## 1. Capire la richiesta

Dagli argomenti (`$ARGUMENTS`) e dalla conversazione ricava:

| Cosa | Default se non indicato |
|---|---|
| **Modalità** | `tema: X` → scegli tu le 5 categorie. `categorie: A, B, ...` → usa *esattamente* quelle (stesso nome, stesso ordine) e scrivi solo le domande |
| Tema / occasione | chiedi, se mancano sia tema che categorie |
| Pubblico | amici adulti italiani, 20-35 anni, cultura generale |
| Lingua | italiano |
| Media | includi alcune domande con immagini e/o canzoni da YouTube dove ha senso, senza esagerare |
| Titolo | proponilo tu, in linea col tema |

Se l'utente dà meno di 5 categorie, completa tu le mancanti e dillo. Se ne dà più di 5, chiedi quali tenere.
Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere il formato

Prima di scrivere, leggi:
- `src/quiz/schema.ts`: tipi e regole di validazione (fonte di verità del formato);
- `quizzes/esempio/quiz.json`: esempio con tutti i tipi di domanda;
- i titoli e le categorie degli altri quiz in `quizzes/*/quiz.json`, per **non ripetere** categorie
  o domande già usate.

## 3. Scrivere le domande

### Scala di difficoltà (in ogni categoria)
- **100**: la sa quasi tutto il tavolo. Riscaldamento.
- **200**: facile, ma serve un minimo di conoscenza.
- **300**: media: metà delle squadre la sa.
- **400**: difficile: serve conoscere bene l'argomento.
- **500**: da esperti o dettaglio poco noto, ma **non impossibile**: deve essere "ah, giusto!" quando
  si sente la risposta, non "e chi lo sapeva?".

La difficoltà deve crescere in modo evidente dentro ogni categoria. Rileggi ogni colonna e scambia le
domande se l'ordine non è giusto.

### Calibrazione: il livello dei quiz dell'utente
Il livello giusto è quello dei quiz che l'utente ha fatto su JeopardyLabs (cenaNatalizia, Halloween,
Hakuna Matata, Oggi è totta, Robbe strane, Esame di maturità). In generale sono **più facili di quanto
sembri**: cultura generale da scuola superiore e cultura pop. Anche il 500 è qualcosa che molti hanno
sentito nominare. Nessuna domanda è da specialisti.

Domande vere, per livello (domanda → risposta):

| Punti | Esempi dai quiz dell'utente |
|---|---|
| **100** | Re dell'Olimpo → Zeus · Vero nome di Spider-Man → Peter Parker · Tasti di un pianoforte → 88 · Animale che cambia colore → Camaleonte · Legge di gravitazione → Newton · Venezia, quale mare → Adriatico · Luca Medici → Checco Zalone · Yakitori → Giappone · Cos'è una jack o' lantern · Secondi in un giorno → 86.400 |
| **200** | Cavallo alato → Pegaso · Martello di Thor → Mjolnir · Unico mammifero che vola → Pipistrello · Teoria dell'evoluzione → Darwin · "Nel blu dipinto di blu" → Modugno · Montagna più alta d'Africa → Kilimanjaro · Chi ha dipinto la Nascita di Venere → Botticelli · Ex cantante dei Litfiba → Piero Pelù · Animale in cui partorisce il maschio → Cavalluccio marino |
| **300** | Re che trasformava in oro → Mida · "Abbey Road" → Beatles · Supereroe che rompe la quarta parete → Deadpool · Caduta dei gravi e massa → Galileo · Confine Europa-Asia → Urali · Squadra di Kobe Bryant → Lakers · Città dei processi alle streghe, quale Stato → Massachusetts · Patatas bravas → Spagna · Pasquale Petrolo → Lillo |
| **400** | Chi uccise il Minotauro → Teseo · Principessa amazzone → Wonder Woman · Mammifero con la menopausa oltre all'uomo → Orca · Nobel 1903 per la radioattività → Marie Curie · Mondiale F1 2021 → Verstappen · Poutine → Canada · Pasquale Zagaria → Lino Banfi · Animale con la lingua più lunga → Formichiere |
| **500** | Città sommersa del mito → Atlantide · Anello che si basa sulla forza di volontà → Lanterna Verde · Animale con tre cuori e sangue blu → Polpo · Doppia elica del DNA → Watson e Crick · Barbiere di Siviglia → Rossini · Capitale dell'Ecuador → Quito · "Toccare ferro" in inglese → Knock on wood · Köttbullar → Svezia · Peter Gene Hernandez → Bruno Mars · Indizi sull'ornitorinco |

Cosa se ne ricava:
- **100 e 200 sono quasi regalati**: nomi famosissimi, cose da scuola media, "chi è / cos'è" diretti.
  Al 100 non serve nessun ragionamento.
- **300-400**: cose note ma che non vengono in mente subito, o il secondo nome più famoso di un argomento
  (Teseo dopo Zeus, Deadpool dopo Spider-Man).
- **500**: il dettaglio meno noto di una cosa **famosa** (Lanterna Verde, Quito, il polpo). Non chiedere
  date precise, nomi di secondo piano, record sportivi, vincitori di edizioni minori o "chi ha creato X"
  quando X non è famosissimo. Domande come "vincitore di Sanremo 2009" o "chi ha creato Pac-Man" sono
  **troppo difficili** anche per il 500.
- **Categorie di curiosità** ("lo sapevi che…"): qui il 500 può essere sorprendente (es. neve del Mago
  di Oz → amianto), ma solo se si può provare a indovinare o se la risposta fa dire "wow". La scelta
  multipla aiuta.
- **Nei formati a gioco la difficoltà la dà il formato**, non la nozione:
  - *prezzo*: dal più quotidiano (Ovetto Kinder) al più esotico (Rolex);
  - *travisati* (titolo/nome con lettere cambiate, con suggerimento tipo "una lettera modificata"):
    da Justin Beaver al 100 a Meryl Strip / Petallica al 500, con più lettere cambiate o un gioco di
    parole meno ovvio;
  - *indovina la canzone*: dalla hit che tutti conoscono a quella meno famosa o con un frammento più
    corto;
  - *indovina il personaggio*: l'indizio più vago è il 500 (es. "nasce il 31 luglio 1965"), il più
    chiaro il 100;
  - *definizioni* (fobie, piatti tipici, nomi d'arte): dalla più intuitiva alla più rara.

### Controllo finale della difficoltà
Prima di mostrare il quiz, per **ogni** domanda chiediti: "sta bene accanto agli esempi del suo livello
nella tabella qui sopra?".
- Se una domanda da 100-200 richiede un nome o un dato che non tutti conoscono → spostala più in alto
  o semplificala.
- Se una domanda da 400-500 la saprebbe chiunque → spostala più in basso o cambiala.
- Se una domanda è più difficile del 500 più difficile degli esempi → sostituiscila.
Nel riepilogo per l'utente segnala le 1-2 domande di cui sei meno sicuro sul livello.

### Qualità
- Risposta **univoca** e breve (un nome, un numero, una parola). Se servono tolleranze
  ("accettare ±1 anno", "basta il cognome"), scrivile in `hostNote`.
- **Regole vs nota per l'host**: lo schermo lo vedono tutti.
  - `rules`: cosa devono fare i giocatori, mostrato con la domanda (es. "servono titolo e artista",
    "massimo 10 secondi", "valida entro ±10%").
  - `hostNote`: tolleranze e spiegazioni che possono suggerire la risposta (es. "accettare anche il
    solo cognome", "gli altri sono…"); compare **solo dopo** aver mostrato la risposta.
    Non mettere mai in `rules` qualcosa che aiuti a indovinare.
- **Verifica i fatti**. Se un dato non è sicuro, controllalo con una ricerca web oppure cambia domanda.
  Evita i fatti che cambiano nel tempo ("il più ricco del mondo", "l'ultimo vincitore") o fissa la data
  nella domanda ("nel 2024...").
- Varia lo stile: non 25 domande che iniziano tutte con "Qual è...".
- La domanda non deve contenere la risposta, né renderla ovvia per esclusione.
- Testo della domanda: massimo ~200 caratteri, perché va letto su un TV.

### Formati speciali (l'utente li ama: usane qualcuno quando il tema lo permette)
- **Scelta multipla** (`choices`, 3-4 opzioni): la risposta in `answer` deve essere identica a una delle
  scelte. Ottima per etimologie, "vero o falso", quiz in cui le risposte libere sarebbero ambigue.
- **Indovina il prezzo**: domanda = prodotto, `answer` = prezzo, `rules` = tolleranza
  (es. "valida entro ±10%"), `hostNote` = intervallo esatto (es. "1,43 € - 1,75 €").
- **Indovina il personaggio / l'oggetto**: un indizio che diventa più facile man mano.
- **Indovina la canzone**: YouTube con `audioOnly: true` e `start`/`end` sul ritornello o sull'intro
  (vedi sotto). Domanda tipo "Titolo e artista?", `rules` con cosa serve (es. "servono titolo e artista").
- **Immagine**: "che cos'è / chi è / dove si trova?" con una foto o un dettaglio.
- Regole per i giocatori in `rules`; suggerimenti per giudicare la risposta in `hostNote`.

## 4. Media

Usa i media solo dove migliorano la domanda. Ogni media deve funzionare: niente link inventati.

### YouTube (canzoni, scene di film, video)
- Non inventare mai gli ID dei video. Trovali con una ricerca web e preferisci i canali ufficiali
  (artista, Vevo, casa discografica, casa di produzione).
- `start`/`end` in secondi: per le canzoni scegli 5-15 secondi riconoscibili. Se non sai con certezza
  quando parte il ritornello, usa l'inizio della canzone (salta le intro parlate dei video ufficiali)
  e scrivilo nel riepilogo, così l'utente può correggerlo.
- Per indovinare una canzone o un audio: `"audioOnly": true` (si sente ma non si vede). In `answerMedia`
  puoi rimettere lo stesso video **senza** `audioOnly`, così alla risposta si vede il video.
- Dopo aver scritto il quiz, `npm run validate -- <slug> --online` verifica ogni link YouTube e ne stampa
  il titolo. **Controlla che ogni titolo corrisponda** alla canzone o al video previsto. Se un video non
  si può incorporare, cercane un altro.

### Immagini
- Usa immagini con licenza libera da **Wikimedia Commons**. Scaricale nella cartella del quiz con un
  nome breve e senza spazi:
  ```bash
  curl -sL -A "JeopardyQuiz/1.0 (https://github.com/Michelo1927/JeopardyQuiz)" \
    "https://commons.wikimedia.org/wiki/Special:FilePath/<Nome_File.jpg>?width=1280" \
    -o quizzes/<slug>/<nome>.jpg
  ```
  Per gli SVG togli `?width=1280` e salva come `.svg`.
- **Guarda ogni immagine scaricata** (con lo strumento Read) per verificare che sia quella giusta, che
  non sia vuota o un errore, e che **non mostri la risposta** (didascalie, scritte, nomi).
- Aggiungi la fonte in `credits` del quiz: `"Nome_File.jpg - Autore, Licenza (Wikimedia Commons)"`.
- Per bandiere, forme e schemi semplici puoi anche disegnare tu un piccolo SVG.
- Peso: tieni ogni file sotto 1-2 MB.

### Audio e video locali
Non puoi creare o scaricare canzoni. Se l'utente vuole file mp3 suoi, metti `media` con il nome file
previsto (es. `"src": "canzone1.mp3"`) e alla fine elenca i file che deve copiare nella cartella.
In quel caso la validazione segnalerà i file mancanti: è normale finché non li aggiunge.

## 5. Scrivere i file

- Slug della cartella: minuscolo, con trattini, senza accenti (es. `halloween-2026`). Non sovrascrivere
  un quiz esistente: se lo slug esiste già, aggiungi un suffisso o chiedi.
- File: `quizzes/<slug>/quiz.json`, indentato con 2 spazi, con `title`, `description` (una riga),
  `author` (il nome dell'utente se lo conosci, altrimenti ometti), `credits` se ci sono immagini.
- Esattamente 5 categorie con 5 domande ciascuna, con `points` 100, 200, 300, 400, 500.
- Nomi delle categorie brevi (max ~22 caratteri): appaiono in maiuscolo nel tabellone.

## 6. Verificare

```bash
npm run validate -- <slug> --online
```
Correggi tutti gli errori. Gli avvisi vanno valutati.

## 7. Mostrare il quiz all'utente

Mostra un riepilogo compatto: per ogni categoria una tabella `Punti | Domanda | Risposta | Media`.
Segnala i dubbi (date incerte, tempi YouTube da controllare, file mp3 da aggiungere).
Poi chiedi se vuole modifiche (cambiare domande, difficoltà, categorie).

Aggiungi il link per provarlo in locale: `npm run dev` e poi `http://localhost:5173/#/q/<slug>/setup`.

## 8. Pubblicare (solo dopo l'ok dell'utente)

Quando l'utente approva:
```bash
git add quizzes/<slug>
git commit -m "Nuovo quiz: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/JeopardyQuiz/#/q/<slug>/setup`.
Ricorda all'utente che, se vede la versione vecchia, basta premere **Ctrl + F5**.

Attenzione: il repository è pubblico, quindi chi conosce il link può leggere le risposte. All'utente va
bene così.
