# Game Night Box

🇮🇹 [Italiano](README.md) · 🇬🇧 English

A hub of party games for everyone in the same room, in front of the same screen.
Site: https://michelo1927.github.io/GameNightBox/

The site is in **Italian and English**. The first time it follows your browser's language; you can switch it with
the **IT / EN** button at the top left of the home page.

| Game | In short |
|---|---|
| 🏆 **Jeopardy** | A 5×5 board of questions worth 100 to 500 points, surprise squares, a final question |
| 🔤 **Alphabet Wheel** | A wheel per team with one clue per letter, against the clock (26 letters in English, 21 in Italian) |
| 🔗 **Word Chain** | Words linked two by two, found letter by letter, with a buzz-in final |
| 🎵 **Name the Song** | Songs from YouTube: buzzing in (the first team to fill its column wins) or taking turns, each team with its own list and clock |
| 🔟 **Top Ten** | Real rankings to guess: whoever wins the face-off plays the list, with too many mistakes the others steal the points |
| ❌ **Wrong Answer!** | Rapid-fire super easy questions: you must say the wrong answer, many times in a row, against the clock |
| ↔️ **In Order!** | Shuffled cards to put back in order (dates, heights, distances...): get it wrong and the points get stolen |
| 🔨 **Going Once!** | A theme comes up and the teams bid on how many answers they can say: whoever wins the auction must say them all before time runs out |

Every game can be created in three ways:
- **✏️ Create**: by hand from your phone, saved as you type; at the end **✨ Make the code** gives a code and a link
  to send to the host, who opens it or pastes it in **📥 Load**. With ✏️ on a game you can edit it.
- **🤖 Create with AI**: choose the theme, copy the prompt into your AI (ChatGPT, Claude, Gemini…), paste the answer and play
  (or open it in the creator to tidy it up). With the site in English, the AI writes the content in English.
- With Claude Code: `/crea-quiz`, `/crea-passaparola`, `/crea-catena`, `/crea-musichiere`, `/crea-topten`, `/crea-sbagliato`, `/crea-infila`, `/crea-asta`
  (these skills are in Italian).

A code you received is saved to the site with `npm run import -- <file|code|link>` (then commit and push). Full rules are in the
"How to play" box of each game. The site's content lives in `quizzes/` (Jeopardy) and `content/<game>/` (the others).

Every game page shows all the content: the games in the site's language come first, the others have an IT or EN label.
Content in English has `"lang": "en"` in its JSON; without it, it's Italian.

## Jeopardy

A Jeopardy-style quiz to play in teams with friends: 5 categories × 5 questions (100 → 500).
Right answer = +points, wrong answer = −points. Whoever made the quiz is the host.

Questions can have **images, audio, video and YouTube** (also "audio only" to guess songs),
**multiple choice**, **rules** shown to everyone and **host notes** (shown only after the answer).

## Playing

1. Open the site, choose **Jeopardy** and then a quiz. You can take the ones you no longer need off the list with **📦 Move to the archive**:
   they go to the Archive section at the bottom of the page, where **📤 Put back in the list** brings them back
   (the archive only applies to the device you use it on).
2. Create the teams (name and colour). In **Options** choose the timer length and how many special squares of each kind to use (0 to 5, one of each by default).
   With **Start the game** the **🎡 wheel** appears: each spin picks the team that plays first, then the second, and so on
   (or skip it and keep the order of the list, which you change with ▲ ▼).
3. Click a square, then:
   - **Space**: shows or hides the answer;
   - **T** (or the ⏱ button): starts the timer; pressing again restarts it, ▾ picks another length, ✕ stops it;
   - **✓ / ✗** under each team: adds or removes the square's points (click again to undo);
   - **Esc**: back to the board.
4. To fix a score by hand (special rules, mistakes): **click the score** and type the
   exact value (e.g. `350`), or `+120` / `-30` to add or remove points; Enter confirms,
   Esc cancels. The **− / +** buttons under the scores remove or add 50 points.
5. **↶ Undo** (or **Ctrl+Z**) goes back one action: a ✓/✗, a closed square, a correction.
6. The **⏱** button is also on the board (T key), to time anything you like during the game.
7. The **⋯** menu has full screen (or the **F** key), sounds, teams and Start over.

**✨ Special squares:** some hidden squares reveal themselves
when the team whose turn it is opens them:
- **🥷 Heist**: if the team answers right, it steals the points from a team of its choice (+ to itself, − to the other).
  The victim is picked from a drop-down menu; leaving "Nobody, from the bank" steals nothing. A wrong answer loses the points as usual. You can only steal from a team that has at least those points; if nobody has them,
  the points come from the bank.
- **🎯 Pass It On**: after reading the question, the team can pass it to another. If that team gets it right it takes
  the points; if it gets it wrong it loses nothing and the points go to the team that passed it.
- **🎁 Wild Card**: first a surprise card is turned (a stroke of luck, taxes, a party for
  everyone, Robin Hood, swapping scores with the team ahead, a gift to the last team), then the team
  still answers the square's question: the card's points and the answer's points add up.

**🏆 Final question:** played when every team has had the same number of turns.
- If there are squares left over (e.g. 2 teams: 12 each, 1 left over), **the last square left is the
  final question**; any other leftover squares are played first, for everyone
  (e.g. 7 teams: 3 each, 3 for everyone, 1 final).
- If nothing is left over (e.g. 5 teams: 5 each), the quiz's own final question is played, if it has one.

Only the category is shown; each team writes on a sheet how much it bets (from 0 to its own
score) and the host enters the bets. Then question, answer and ✓/✗ for each team.
At the end the winner's screen starts. The teams page says how the game will end.

**Turns:** teams take turns, in the order drawn by the wheel (or the order of the team list). The team whose turn it is
(highlighted) picks a square and answers; once the question is closed, it's the next team's turn.
Every team gets the same number of questions: the ones left over at the end are **for everyone**, and
the last one is the final question. Reopening a question already played doesn't move the turn on.

The game is saved in the browser: reloading the page loses nothing.

## Creating a quiz from your phone (for friends too)

On the site tap **✏️ Create a quiz**: you fill in one question at a time, with photos from your gallery,
image links, YouTube videos (also "audio only" for songs) and multiple-choice answers.
The draft saves itself on the phone. When you make the code, the finished quiz also stays in
your list on this device (with ✏️ to reopen it), and the next **✏️ Create a quiz**
starts from an empty quiz. A quiz left half-done is still there as you left it.

At the end **✨ Make the code** produces a text (`JQ1.…`) and a link to send to the host:
- opening the **link** loads the quiz so you can play straight away;
- or, on the site, **📥 Load a quiz** and paste the code (or open the `.txt` file).

Photos make the code much longer: if it's too long for a message, the site offers to
share it as a file. Loaded quizzes are only saved on that device; to make one
permanent on the site:

```bash
npm run import -- code.txt      # or the code or the link directly
```

The script creates `quizzes/<name>/`, extracting the photos into files; then commit and push.

## Creating a quiz with AI (from the site)

On the site tap **🤖 Create with AI**: write the theme (or the 5 categories), copy the prompt and paste it
into your AI (ChatGPT, Claude, Gemini…). Then paste the answer here: you can play straight away, or
press **✏️ Edit and add photos** to open it in the creator and tidy up questions, categories and media.
It works from a phone too and there's nothing to install (the questions are text only).

## Creating a quiz with Claude Code

Open the project folder with Claude Code and use the `/crea-quiz` skill (it works in Italian):

```
/crea-quiz tema: cena di Natale con la famiglia
/crea-quiz categorie: Musica anni 80, Pokémon, Geografia, Cucina, Film Disney
/crea-quiz tema: Halloween  pubblico: amici 25-30 anni  media: tante canzoni
```

- With **tema** (theme), Claude chooses the 5 categories and writes the 25 questions.
- With **categorie** (categories), Claude uses your categories and only writes the questions.

The questions are sorted by difficulty (100 easy → 500 hard). Claude can add free images
from Wikimedia and songs from YouTube ("audio only"), checks the links, shows you the board and,
when you approve, publishes it.

## Creating a quiz with the editor

```bash
npm run dev
```

Open http://localhost:5173/editor.html (or the **🛠 Editor (local)** button on the Jeopardy page). The editor is in Italian.

- Create a new quiz or open an existing one: the board appears; click a square to edit it.
- For each question you can set text, answer, multiple choice, rules, host note and media
  (of the question and of the answer): **drag a file**, choose it or paste it with Ctrl+V.
  For YouTube paste the link and, if needed, set start, end and "audio only".
- Categories are renamed directly on the board; ◀ ▶ move them and 🗑 deletes them.
- **Ctrl+S** saves `quiz.json` and the media into the quiz folder. **👁 Anteprima** (preview) shows the question
  as players will see it; **▶ Prova** (try) opens the saved quiz.
- To publish: commit and push (or ask Claude to do it).

The editor only exists locally: the published site contains only the games.

## Creating a quiz by hand

Each quiz is a folder in `quizzes/` with a `quiz.json` file and its media:

```
quizzes/halloween/
├─ quiz.json
├─ pumpkin.jpg
└─ song.mp3
```

The full format is described in [DESIGN.md](DESIGN.md#formato-del-quiz-quizjson) (in Italian); as an example
there's [quizzes/esempio/quiz.json](quizzes/esempio/quiz.json). For a quiz in English, add `"lang": "en"`.

Before publishing, check the quiz with:

```bash
npm run validate                    # every quiz
npm run validate -- <slug> --online # one quiz, also checking the YouTube links
```

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # validates the quizzes + builds into dist/
```

The site is a hub of games: the shared engine (teams, scores, timer, sounds, media, languages) lives in `src/hub/`,
each game in `src/games/<id>/`, listed in `src/games/index.ts`. Jeopardy is in `src/games/jeopardy/`.
Texts sit next to the code in pairs, `tr('Avanti', 'Next')` (`src/hub/i18n.ts`): a missing translation is a type error.

Every push to `main` publishes the site to GitHub Pages automatically (`.github/workflows/deploy.yml`).
