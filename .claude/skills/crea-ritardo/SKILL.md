---
name: crea-ritardo
description: Crea un nuovo mazzo di domande per In ritardo! (domande facili di cultura generale con risposte cortissime: le squadre, contro il tempo, rispondono sempre alla domanda precedente) nel formato di questo progetto, e lo pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare un In ritardo!, delle domande "in ritardo di una" o "rispondi alla precedente", anche indicando solo un tema.
argument-hint: "[tema: <tema>] [domande: N]"
---

# Crea un In ritardo!

Crei un mazzo di domande per **In ritardo!**: domande facili, ognuna con una risposta cortissima.
Le squadre, a turno e contro il tempo, vedono una domanda alla volta ma per passare alla successiva devono dire
**la risposta di quella prima** (sulla prima domanda dicono una parola d'ordine, data dall'app). Se sbagliano
ripartono dalla prima domanda della stessa lista. L'host preme ✓ o ✗.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | cultura generale facile: geografia, storia, natura, animali, corpo umano, sport, cibo, numeri |
| Numero di domande | 80 (minimo 10; ogni squadra ne usa una lista sua, di solito 10) |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/ritardo/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/ritardo/prompt.ts`: **le regole per scrivere le domande** (le stesse della pagina
  "Crea con l'IA"). Seguile tutte.
- `content/ritardo/*.json`: per **non ripetere** domande già usate.

## 3. Scrivere

- Domande **facili**: la difficoltà del gioco è ricordare la risposta mentre se ne legge un'altra.
- Una sola risposta giusta e indiscutibile; risposte di 1-3 parole, numeri in cifre.
- Varia il tipo di risposta (numeri, persone, città, animali, colori…), così non si confondono.
- Controlla che ogni risposta sia vera: nel dubbio cerca sul web o cambia domanda.

## 4. Scrivere il file e verificare

File: `content/ritardo/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- ritardo/<slug>
```
Correggi tutti gli errori e valuta gli avvisi.

## 5. Mostrarlo all'utente

Qualche domanda d'esempio con la risposta, e il totale.
Link per provarlo in locale: `npm run dev` e poi `http://localhost:5173/#/ritardo/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/ritardo/<slug>.json
git commit -m "Nuovo In ritardo!: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/ritardo/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**).
