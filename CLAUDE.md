# Game Night Box

Hub di giochi a squadre da serata (React + Vite + TypeScript), pubblicato su GitHub Pages
(https://michelo1927.github.io/GameNightBox/) a ogni push su `main`. Giochi: Jeopardy, Passaparola, Catena, Musichiere, Top Ten, Sbagliato!, In fila!, All'asta!.

- Motore comune in `src/hub/` (non importa mai da `src/games/`); ogni gioco in `src/games/<id>/`, elencato in `src/games/index.ts`.

- Quiz: `quizzes/<slug>/quiz.json` + file media nella stessa cartella. Formato in `src/games/jeopardy/quiz/schema.ts`.
- Per creare un quiz usa la skill `/crea-quiz` (`.claude/skills/crea-quiz/SKILL.md`).
- Dopo ogni modifica a un quiz: `npm run validate -- <slug> --online`.
- Qualsiasi contenuto condiviso come codice (creatore del sito, codici `JQ1.` `PP1.` `CT1.` `MU1.` `TT1.` `SB1.` `IF1.` `AS1.`) si salva nel repo con
  `npm run import -- <file|codice|link>`.
- Passaparola, Catena, Musichiere, Top Ten, Sbagliato!, In fila!, All'asta!: un file `content/<gioco>/<slug>.json`. Formato in `src/games/<gioco>/schema.ts`;
  per crearne uno segui le regole del prompt in `src/games/<gioco>/prompt.ts` (lo stesso che usa la pagina "Crea con Claude").
  Musichiere: cerca i link YouTube veri e controllali con `npm run validate -- musichiere/<slug> --online`.
  Top Ten: solo classifiche vere, verificate con la ricerca web, con la fonte in `source`.
  In fila!: carte già nell'ordine giusto, valori veri verificati con la ricerca web, con la fonte in `source`.
  All'asta!: solo una lista di temi con tante risposte possibili (l'host le conta, non si scrivono).
  Skill: `/crea-passaparola`, `/crea-catena`, `/crea-musichiere`, `/crea-topten`, `/crea-sbagliato`, `/crea-infila`, `/crea-asta` (`.claude/skills/`).
- Build completa: `npm run build` (valida tutti i contenuti, controlla i tipi, compila).
- Progetto e decisioni: `DESIGN.md`. L'utente scrive in italiano: rispondi in italiano.
