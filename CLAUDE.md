# Game Night Box

Hub di giochi a squadre da serata (React + Vite + TypeScript), pubblicato su GitHub Pages
(https://michelo1927.github.io/GameNightBox/) a ogni push su `main`. Per ora c'è un gioco: il Jeopardy.

- Motore comune in `src/hub/` (non importa mai da `src/games/`); ogni gioco in `src/games/<id>/`, elencato in `src/games/index.ts`.

- Quiz: `quizzes/<slug>/quiz.json` + file media nella stessa cartella. Formato in `src/games/jeopardy/quiz/schema.ts`.
- Per creare un quiz usa la skill `/crea-quiz` (`.claude/skills/crea-quiz/SKILL.md`).
- Dopo ogni modifica a un quiz: `npm run validate -- <slug> --online`.
- Un quiz condiviso come codice (pagina "Crea un quiz" del sito) si salva nel repo con `npm run import -- <file|codice|link>`.
- Build completa: `npm run build` (valida i quiz, controlla i tipi, compila).
- Progetto e decisioni: `DESIGN.md`. L'utente scrive in italiano: rispondi in italiano.
