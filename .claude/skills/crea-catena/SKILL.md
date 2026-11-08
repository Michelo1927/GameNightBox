---
name: crea-catena
description: Crea una nuova serie di catene di parole (8 parole legate a due a due, stile Reazione a catena) con finale facoltativo, nel formato di questo progetto, e la pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare delle catene o una partita di Catena, anche indicando solo un tema.
argument-hint: "[tema: <tema>] [catene: N] [finale: sì/no]"
---

# Crea catene

Crei una partita di **Catena** per le serate a squadre dell'utente: ogni catena ha 8 parole, ognuna legata
alla successiva (pane → burro → arachidi…); si vedono la prima e l'ultima, le squadre scoprono le altre.
L'host scrive la risposta e l'app la confronta, quindi ogni parola deve essere **una sola parola** e il
legame deve essere riconoscibile da tutti.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | parole ed espressioni della lingua italiana di tutti i giorni |
| Numero di catene | 6 |
| Finale | sì, 2 parole finali con 5 indizi ciascuna |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/catena/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/catena/prompt.ts`: **le regole per costruire catene e finali** (le stesse della pagina
  "Crea con Claude"). Seguile tutte.
- `content/catena/*.json`: per **non ripetere** catene o parole finali già usate.

## 3. Scrivere

- 8 parole per catena, solo lettere (niente spazi, apostrofi o trattini), nessuna ripetuta nella catena.
- `links`: 7 spiegazioni brevi, una per passaggio (es. "pane e burro"): si mostrano a catena finita.
- Finale: `answer` di una sola parola, 5 `clues` dal più difficile al più facile, nessun indizio contiene la risposta.
- Rileggi ogni passaggio: due parole vicine devono formare un'espressione o un legame che un italiano riconosce subito.

## 4. Scrivere il file e verificare

File: `content/catena/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- catena/<slug>
```
Correggi tutti gli errori e valuta gli avvisi.

## 5. Mostrarlo all'utente

Ogni catena su una riga (`pane → burro → …`, con i legami), poi le parole finali con i loro indizi.
Link per provarla in locale: `npm run dev` e poi `http://localhost:5173/#/catena/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/catena/<slug>.json
git commit -m "Nuove catene: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/catena/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**). Il repository è pubblico: chi conosce il link può leggere le risposte.
