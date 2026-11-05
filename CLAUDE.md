# JeopardyQuiz

Gioco a squadre stile Jeopardy (React + Vite + TypeScript), pubblicato su GitHub Pages
(https://michelo1927.github.io/JeopardyQuiz/) a ogni push su `main`.

- Quiz: `quizzes/<slug>/quiz.json` + file media nella stessa cartella. Formato in `src/quiz/schema.ts`.
- Per creare un quiz usa la skill `/crea-quiz` (`.claude/skills/crea-quiz/SKILL.md`).
- Dopo ogni modifica a un quiz: `npm run validate -- <slug> --online`.
- Un quiz condiviso come codice (pagina "Crea un quiz" del sito) si salva nel repo con `npm run import -- <file|codice|link>`.
- Build completa: `npm run build` (valida i quiz, controlla i tipi, compila).
- Progetto e decisioni: `DESIGN.md`. L'utente scrive in italiano: rispondi in italiano.
