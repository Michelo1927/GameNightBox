---
name: crea-passaparola
description: Crea un nuovo Passaparola (una ruota di 21 lettere per squadra, una definizione per lettera) nel formato di questo progetto e lo pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare un Passaparola o delle ruote di lettere, anche indicando solo un tema.
argument-hint: "tema: <tema>  [squadre: N] [pubblico: ...]"
---

# Crea Passaparola

Crei un Passaparola per le serate a squadre dell'utente: ogni squadra gioca la sua ruota contro il tempo,
l'host svela la risposta e segna giusta o sbagliata. Le risposte devono quindi essere **chiare e brevi**.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | cultura generale varia |
| Squadre (= ruote) | 2 |
| Pubblico | amici adulti italiani, 20-40 anni |
| Titolo | proponilo tu, in linea col tema |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/passaparola/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/passaparola/prompt.ts`: **le regole per scrivere le definizioni** (le stesse che usa la pagina
  "Crea con l'IA"). Seguile tutte.
- `content/passaparola/*.json`: per **non ripetere** risposte o definizioni già usate.

## 3. Scrivere

- Ogni ruota ha le 21 lettere in ordine (`A B C D E F G H I L M N O P Q R S T U V Z`), ognuna con
  `letter`, `type` (`inizia` o `contiene`), `question`, `answer` e, se servono, `accept`.
- Controlla **lettera per lettera** che ogni risposta (e ogni `accept`) inizi davvero con la lettera, o la contenga.
- Ruote equilibrate: alla stessa lettera difficoltà simile, risposte diverse. Nessuna risposta ripetuta.

## 4. Scrivere il file e verificare

File: `content/passaparola/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere
un file esistente), indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- passaparola/<slug>
```
Correggi tutti gli errori; valuta gli avvisi (risposte ripetute, definizione che contiene la risposta).

## 5. Mostrarlo all'utente

Per ogni ruota una tabella `Lettera | Definizione | Risposta`. Segnala i dubbi.
Link per provarlo in locale: `npm run dev` e poi `http://localhost:5173/#/passaparola/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/passaparola/<slug>.json
git commit -m "Nuovo Passaparola: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/passaparola/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**). Il repository è pubblico: chi conosce il link può leggere le risposte.
