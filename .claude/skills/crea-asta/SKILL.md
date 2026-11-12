---
name: crea-asta
description: Crea una nuova lista di temi per All'asta! (le squadre rilanciano su quante risposte sanno dire su un tema, e chi vince l'asta deve dirle tutte prima che scada il tempo) nel formato di questo progetto, e la pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare un All'asta!, dei temi per l'asta o delle categorie su cui dire più risposte possibili, anche indicando solo un argomento.
argument-hint: "[tema: <argomento>] [temi: N]"
---

# Crea un All'asta!

Crei una lista di **temi** per **All'asta!**: per ogni tema (es. "Animali della savana") le squadre fanno un'asta su
quante risposte sanno dire; chi offre di più deve dirle tutte entro un tempo fisso. L'host le conta a voce,
fidandosi: il contenuto è **solo la lista dei temi**, niente risposte da scrivere.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Argomento | vario: animali, cibo, geografia, sport, musica, cinema, TV, cose di casa, mestieri |
| Numero di temi | 40 (minimo 5; con 5 punti per vincere una partita ne usa di solito 10-20) |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/asta/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/asta/prompt.ts`: **le regole per scegliere i temi** (le stesse della pagina "Crea con Claude"). Seguile tutte.
- `content/asta/*.json`: per **non ripetere** temi già usati.

## 3. Scrivere

- Ogni tema deve avere **tante** risposte che una persona normale conosce (almeno 15-20): è quello che fa salire l'asta.
- Risposte facili da giudicare al volo e brevi da dire; temi corti (al massimo 6-7 parole, si leggono sulla TV).
- Niente temi che si sovrappongono ("Frutti" e "Frutti tropicali"), troppo di nicchia o che dipendono dai gusti.
- Mescola temi chiusi ("Regioni italiane") e aperti ("Cose che trovi in un bagno"), facili e un po' più difficili.
- Rileggi la lista chiedendoti, per ogni tema: "ne saprei dire 10 in un minuto?". Se no, cambialo.

## 4. Scrivere il file e verificare

File: `content/asta/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci, e `temi` (lista di stringhe).

```bash
npm run validate -- asta/<slug>
```
Correggi tutti gli errori e valuta gli avvisi.

## 5. Mostrarlo all'utente

La lista dei temi e il totale.
Link per provarlo in locale: `npm run dev` e poi `http://localhost:5173/#/asta/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/asta/<slug>.json
git commit -m "Nuovo All'asta!: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/asta/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**).
