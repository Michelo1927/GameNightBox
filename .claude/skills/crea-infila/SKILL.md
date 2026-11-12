---
name: crea-infila
description: Crea una nuova partita di In fila! (sequenze di 4-8 carte da rimettere in ordine, per data, altezza, popolazione, distanza..., con valori veri e la fonte) nel formato di questo progetto, e la pubblica su GitHub Pages. Usala quando l'utente chiede di creare, generare o preparare un In fila!, delle sequenze o delle cose da mettere in ordine, anche indicando solo un tema.
argument-hint: "[tema: <tema>] [sequenze: N] [carte: 4-8]"
---

# Crea un In fila!

Crei una partita di **In fila!** per le serate a squadre dell'utente: ogni sequenza è una domanda
(es. "Quando sono successe queste cose?") con 4-8 carte mescolate. La squadra di turno dice l'ordine
completo, da un capo all'altro della fila (es. dal più vecchio al più recente); se sbaglia, le altre possono
rubare. Alla fine sotto ogni carta compare il suo **valore** (es. "1989"), che dimostra l'ordine: per questo
i valori devono essere **veri**.

## 1. Capire la richiesta

| Cosa | Default se non indicato |
|---|---|
| Tema | vario: storia, invenzioni, film e canzoni, geografia, natura, sport, record |
| Numero di sequenze | 8 (le squadre ne giocano una a testa a turno: con 2-4 squadre, meglio un multiplo) |
| Carte per sequenza | 5 (da 4 a 8) |
| Titolo | proponilo tu |

Fai al massimo **una** domanda di chiarimento, e solo se manca qualcosa di essenziale. Altrimenti procedi.

## 2. Leggere formato e regole

- `src/games/infila/schema.ts`: tipi e validazione (fonte di verità del formato).
- `src/games/infila/prompt.ts`: **le regole per scegliere e scrivere le sequenze** (le stesse della pagina
  "Crea con Claude"). Seguile tutte.
- `content/infila/*.json`: per **non ripetere** sequenze già usate.

## 3. Scegliere e verificare le sequenze

- Criterio **misurabile** per ogni sequenza: anno, data, altezza, lunghezza, superficie, abitanti, velocità,
  peso, durata, distanza, prezzo... Niente criteri di gusto. Varia i criteri tra le sequenze (non tutte date).
- **Usa la ricerca web per ogni valore** e scrivi in `source` da dove viene (es. "Wikipedia", "ISTAT, 2024").
  Se un valore non si trova o è conteso (es. altezze che cambiano con le misure), cambia carta.
- Valori **ben distanziati** e senza pareggi: l'ordine deve essere indiscutibile. Se il dato è approssimato,
  dillo nella fonte ("arrotondati").
- Mescola carte note a tutti e carte su cui ragionare.

## 4. Scrivere

- Le carte vanno **già nell'ordine giusto**: la prima è quella del capo `first`, l'ultima quella del capo `last`.
- `first` / `last`: le etichette dei due capi ("Il più vecchio" / "Il più recente", "La più bassa" / "La più alta").
- `text`: la carta, breve (2-6 parole), senza il valore dentro.
- `value`: breve, con la stessa unità per tutte le carte della sequenza ("1998", "8.849 m", "2,75 milioni",
  "44 a.C."). L'app legge i numeri e avvisa se non vanno tutti in su o tutti in giù: è il controllo
  sull'errore più facile, le carte in ordine sbagliato.

## 5. Scrivere il file e verificare

File: `content/infila/<slug>.json` (slug minuscolo con trattini, senza accenti; non sovrascrivere),
indentato con 2 spazi, con `title`, `description` (una riga), `author` se lo conosci.

```bash
npm run validate -- infila/<slug>
```
Correggi tutti gli errori e valuta gli avvisi (un avviso sull'ordine è quasi sempre un errore vero).

## 6. Mostrarlo all'utente

Per ogni sequenza: la domanda, i due capi, la fonte e le carte in ordine con il valore.
Link per provarla in locale: `npm run dev` e poi `http://localhost:5173/#/infila/<slug>/setup`.

## 7. Pubblicare (solo dopo l'ok dell'utente)

```bash
git add content/infila/<slug>.json
git commit -m "Nuovo In fila!: <titolo>"
git push
```
Il sito si aggiorna in circa 1 minuto: `https://michelo1927.github.io/GameNightBox/#/infila/<slug>/setup`
(se si vede la versione vecchia: **Ctrl + F5**). Il repository è pubblico: chi conosce il link può leggere le risposte.
