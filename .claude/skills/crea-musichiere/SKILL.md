---
name: crea-musichiere
description: Crea una nuova playlist per il Musichiere (canzoni da YouTube da indovinare a squadre) nel formato di questo progetto, con link YouTube veri e controllati, e la pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare una playlist, un musichiere o un gioco di canzoni, anche indicando solo un tema.
argument-hint: "tema: <tema>  [canzoni: N] [pubblico: ...]"
---

# Crea playlist per il Musichiere

Crei una playlist per le serate a squadre dell'utente: parte una canzone (solo audio, per 10-30 secondi),
la prima squadra che si prenota dice titolo e artista. Servono canzoni **riconoscibili dalle prime note**.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | grandi successi italiani e internazionali dagli anni 80 a oggi |
| Numero di canzoni | 20 |
| Pubblico | amici adulti italiani, 20-40 anni |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/musichiere/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/musichiere/prompt.ts`: **le regole per scegliere le canzoni** (le stesse della pagina
  "Crea con Claude"). Seguile tutte.
- `content/musichiere/*.json`: per **non ripetere** canzoni già usate.

## 3. Trovare i link YouTube veri

Non inventare mai un link. Per ogni canzone **cerca sul web** il video (preferisci "Official Audio",
i canali "<Artista> - Topic" o il video ufficiale) e usa l'URL trovato.
- `start`: il secondo da cui far partire la clip, se il video ha un'introduzione lunga o parlato (altrimenti ometti).
- `year`: l'anno di uscita, se lo sai con sicurezza.

## 4. Scrivere il file e verificare

File: `content/musichiere/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- musichiere/<slug> --online
```
`--online` controlla che ogni video esista e sia incorporabile: sostituisci quelli che non vanno.
Confronta anche il titolo del video trovato con la canzone, per scovare link sbagliati.

## 5. Mostrarla all'utente

Tabella `# | Titolo | Artista | Anno | Inizio`. Segnala i dubbi (video non ufficiali, inizi da controllare).
Link per provarla in locale: `npm run dev` e poi `http://localhost:5173/#/musichiere/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/musichiere/<slug>.json
git commit -m "Nuova playlist: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/musichiere/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**).
