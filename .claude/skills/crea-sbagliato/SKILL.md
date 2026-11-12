---
name: crea-sbagliato
description: Crea un nuovo mazzo di domande per Sbagliato! (domande facilissime con due risposte, a cui le squadre devono dare quella sbagliata, a raffica contro il tempo) nel formato di questo progetto, e lo pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare uno Sbagliato!, delle domande a risposta sbagliata o "al contrario", anche indicando solo un tema.
argument-hint: "[tema: <tema>] [domande: N]"
---

# Crea uno Sbagliato!

Crei un mazzo di domande per **Sbagliato!**: ogni domanda ha due risposte, una vera e una falsa
(es. "È più alto un albero o un fiore?"). Le squadre, a turno e contro il tempo, devono dire **quella
sbagliata** a tutte le domande della loro lista (di solito 22) di fila; se dicono quella vera ripartono dalla prima
domanda della stessa lista. L'host preme la risposta
detta e l'app sa qual è quella vera.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | vario: cose di tutti i giorni, natura, animali, cibo, geografia facile, numeri, colori |
| Numero di domande | 100 (minimo 10; ogni squadra ne usa 22 tutte sue, quindi sotto le 66 con 3 squadre alcune si ripetono) |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/sbagliato/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/sbagliato/prompt.ts`: **le regole per scrivere le domande** (le stesse della pagina
  "Crea con l'IA"). Seguile tutte.
- `content/sbagliato/*.json`: per **non ripetere** domande già usate.

## 3. Scrivere

- `answer` è la risposta **vera** (da non dire), `other` quella **falsa** (da dire). Non invertirle: è l'errore più facile.
- La risposta vera deve essere ovvia per chiunque e indiscutibile: niente trabocchetti, niente "dipende".
- Domande brevi (si leggono in 2 secondi), con le due risposte scritte nella domanda; risposte di 1-3 parole.
- Varia tipo di domanda e posizione della risposta vera nella domanda (a volte prima, a volte seconda).
- Rileggi tutto controllando, per ogni domanda, che `answer` sia davvero quella vera.

## 4. Scrivere il file e verificare

File: `content/sbagliato/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- sbagliato/<slug>
```
Correggi tutti gli errori e valuta gli avvisi.

## 5. Mostrarlo all'utente

Qualche domanda d'esempio con la risposta da dire, e il totale.
Link per provarlo in locale: `npm run dev` e poi `http://localhost:5173/#/sbagliato/<slug>/setup`.

## 6. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/sbagliato/<slug>.json
git commit -m "Nuovo Sbagliato!: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/sbagliato/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**).
