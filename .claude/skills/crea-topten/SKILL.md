---
name: crea-topten
description: Crea una nuova partita di Top Ten (liste di 5-10 risposte prese da classifiche vere, con la fonte, da indovinare a squadre) nel formato di questo progetto, e la pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare una Top Ten, delle classifiche o delle liste da indovinare, anche indicando solo un tema.
argument-hint: "[tema: <tema>] [liste: N] [risposte: 5-10]"
---

# Crea una Top Ten

Crei una partita di **Top Ten** per le serate a squadre dell'utente: ogni lista è una domanda
(es. "I 10 fiumi più lunghi d'Italia") con le risposte coperte su un tabellone. Le squadre le indovinano
una alla volta; l'host scrive quello che dicono e l'app lo confronta con la lista. Tutte le risposte valgono
gli stessi punti, quindi conta **che una voce sia nella lista**, più che la sua posizione.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | vario: geografia, cultura generale, sport, spettacolo, cibo, record |
| Numero di liste | 6 |
| Risposte per lista | 10 (da 5 a 10 se la lista vera ne ha meno) |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/topten/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/topten/prompt.ts`: **le regole per scegliere e scrivere le liste** (le stesse della pagina
  "Crea con Claude"). Seguile tutte.
- `content/topten/*.json`: per **non ripetere** liste già usate.

## 3. Cercare e verificare le liste

Le liste devono essere **vere e verificabili**: classifiche con dati reali o elenchi completi e chiusi
(es. i 7 colli di Roma). Niente classifiche di gusto.

- **Usa la ricerca web per ogni lista** e scrivi in `source` da dove viene (es. "ISTAT, 2024",
  "Wikipedia: Fiumi d'Italia" o il link). Se non riesci a verificarla, scegli un'altra lista.
- Preferisci dati stabili; evita liste dove le ultime posizioni cambiano spesso o sono in bilico
  (in quel caso accorcia la lista, es. "Gli 8 paesi più popolosi").
- `note`: il dato che ordina la lista, breve ("652 km", "2,7 milioni"). Se il dato è approssimato,
  dillo nella fonte ("arrotondati").

## 4. Scrivere

- `text`: il nome più comune e corto ("Stati Uniti", non "Stati Uniti d'America").
- `also`: gli altri modi in cui una squadra potrebbe dirlo (["USA", "America"]). Un nome non può valere
  per due risposte della stessa lista. Non servono varianti con l'articolo o con un errore di battitura:
  l'app le accetta già.
- Domanda chiara, con il numero di risposte ("Le 8 città…"). Almeno 3-4 risposte per lista note a quasi tutti.

## 5. Scrivere il file e verificare

File: `content/topten/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- topten/<slug>
```
Correggi tutti gli errori e valuta gli avvisi.

## 6. Mostrarlo all'utente

Per ogni lista: la domanda, la fonte e le risposte in ordine con il dato.
Link per provarla in locale: `npm run dev` e poi `http://localhost:5173/#/topten/<slug>/setup`.

## 7. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/topten/<slug>.json
git commit -m "Nuova Top Ten: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/topten/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**). Il repository è pubblico: chi conosce il link può leggere le risposte.
