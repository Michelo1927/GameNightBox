// Jeopardy's own tutorials: its list of quizzes and its creator work differently from the other games'.
import type { Tutorial } from '../../../hub/components/Tutorial';
import { GAME_TUTORIAL } from '../../../hub/tutorials';
import { tr } from '../../../hub/i18n';

// English steps: same order and targets as the Italian ones.
const EN_HOME_LAST = {
  title: 'Played, edit, archive',
  target: '.entry-row .entry-actions',
  text: (
    <>
      <p>
        With <b>✓</b> you mark a quiz as already played: it fades and moves to the bottom. Tap again to put it back with the ones
        to play.
      </p>
      <p>
        <b>📦</b> takes it off this screen (you'll find it at the bottom, in the archive). Quizzes you loaded or created also have the{' '}
        <b>pencil</b>, which reopens them in the creator.
      </p>
    </>
  ),
};

const EN_BOARD = [
  {
    title: 'Create a quiz',
    text: (
      <>
        <p>
          A quiz is a board of <b>5 categories</b> with <b>5 questions</b> each, from 100 points (very easy) to 500 (for experts).
        </p>
        <p>It saves itself on this device as you type: you can close it and pick it up whenever you like.</p>
      </>
    ),
  },
  {
    title: 'Title',
    target: '.creator .cr-field',
    text: <p>Give the quiz a name (e.g. “Christmas dinner”): it's what shows in the list of quizzes.</p>,
  },
  {
    title: 'The categories',
    target: '.creator .cr-cat-name',
    text: <p>Write the name of each category in the blue bar, for example “Movies” or “The 90s”.</p>,
  },
  {
    title: 'The questions',
    target: '.creator .cr-chips',
    text: (
      <p>
        Tap a value to write that question. When it's complete the <b>+</b> becomes <b>✓</b>. Inside you'll also find arrows to go
        to the next question without coming back here.
      </p>
    ),
  },
  {
    title: 'Final question',
    target: '.creator .cr-final',
    text: <p>Optional: a question at the end on which each team bets its points.</p>,
  },
  {
    title: 'How much is left',
    target: '.creator .cr-bar',
    text: (
      <p>
        The bar at the bottom says how many questions you've written and takes you to the next one missing. When everything is
        ready, <b>✨ Make the code</b> appears, to play it or send it to whoever will host.
      </p>
    ),
  },
  {
    title: 'Pick up or start over',
    target: '.creator .cr-secondary',
    text: (
      <p>
        <b>📥 Edit a quiz from a code</b> reopens a quiz you already shared, to change it. <b>🗑 Start from scratch</b> deletes the
        draft.
      </p>
    ),
  },
];

const EN_QUESTION = [
  {
    title: 'A question',
    target: '.creator .cr-tip',
    text: <p>At the top are the category and the points; below, how hard this question should be.</p>,
  },
  {
    title: 'Question and photo',
    target: '.creator .cr-field',
    text: (
      <p>
        Write the question. Below you can add a <b>photo</b> or a <b>YouTube video</b>: if there's a photo, the question can even
        stay empty (“Who is it?”).
      </p>
    ),
  },
  {
    title: 'Multiple choice',
    target: '.creator .cr-check',
    text: <p>Tick here to give 4 options (A, B, C, D); then tap the dot next to the right one.</p>,
  },
  {
    title: 'More options',
    target: '.creator .cr-more',
    text: (
      <p>
        Optional: rules to read with the question, a note only the host sees after the answer, a photo to show with the answer.
      </p>
    ),
  },
  {
    title: 'Next and preview',
    target: '.creator .cr-bar',
    text: (
      <p>
        <b>👁 Preview</b> shows the question as it will look on the TV. <b>Next ›</b> goes to the next one: there's nothing to save.
      </p>
    ),
  },
];

export const HOME_TUTORIAL: Tutorial = {
  id: 'gioco-jeopardy',
  steps: [
    // The steps of every game's list, without the rules (Jeopardy has none there) and the row's buttons (different here).
    ...GAME_TUTORIAL.steps.filter((s) => s.target !== '.entry-row .entry-actions' && s.target !== '.rules-box'),
    tr({
      title: 'Già fatto, modifica, archivia',
      target: '.entry-row .entry-actions',
      text: (
        <>
          <p>
            Con <b>✓</b> segni un quiz come già fatto: diventa più chiaro e scende in fondo. Un altro tocco lo rimette fra quelli da
            fare.
          </p>
          <p>
            <b>📦</b> lo toglie da questa schermata (lo ritrovi in fondo, nell'archivio). Sui quiz caricati o creati da te c'è anche
            la <b>matita</b>, che lo riapre nel creatore.
          </p>
        </>
      ),
    }, EN_HOME_LAST),
  ],
};

export const BOARD_TUTORIAL: Tutorial = {
  id: 'crea-jeopardy',
  steps: tr([
    {
      title: 'Crea un quiz',
      text: (
        <>
          <p>
            Un quiz è un tabellone di <b>5 categorie</b> con <b>5 domande</b> ciascuna, da 100 punti (facilissima) a 500 (da esperti).
          </p>
          <p>Si salva da solo su questo dispositivo mentre scrivi: puoi chiudere e riprendere quando vuoi.</p>
        </>
      ),
    },
    {
      title: 'Titolo',
      target: '.creator .cr-field',
      text: <p>Dai un nome al quiz (es. “Cena di Natale”): è quello che si vede nella lista dei quiz.</p>,
    },
    {
      title: 'Le categorie',
      target: '.creator .cr-cat-name',
      text: <p>Scrivi il nome di ogni categoria nella barra blu, per esempio “Cinema” o “Anni 90”.</p>,
    },
    {
      title: 'Le domande',
      target: '.creator .cr-chips',
      text: (
        <p>
          Tocca un punteggio per scrivere quella domanda. Quando è completa il <b>+</b> diventa <b>✓</b>. Dentro trovi anche le frecce
          per passare alla domanda successiva senza tornare qui.
        </p>
      ),
    },
    {
      title: 'Domanda finale',
      target: '.creator .cr-final',
      text: <p>Facoltativa: una domanda alla fine su cui ogni squadra scommette i suoi punti.</p>,
    },
    {
      title: 'Quanto manca',
      target: '.creator .cr-bar',
      text: (
        <p>
          La barra in basso dice quante domande hai scritto e ti porta alla prossima che manca. Quando è tutto pronto compare{' '}
          <b>✨ Genera il codice</b>, per giocarlo o mandarlo a chi farà da host.
        </p>
      ),
    },
    {
      title: 'Riprendere o ricominciare',
      target: '.creator .cr-secondary',
      text: (
        <p>
          <b>📥 Modifica un quiz da codice</b> riapre un quiz già condiviso, per cambiarlo. <b>🗑 Ricomincia da zero</b> cancella la
          bozza.
        </p>
      ),
    },
  ], EN_BOARD),
};

export const QUESTION_TUTORIAL: Tutorial = {
  id: 'crea-jeopardy-domanda',
  steps: tr([
    {
      title: 'Una domanda',
      target: '.creator .cr-tip',
      text: <p>In alto ci sono la categoria e i punti; qui sotto quanto deve essere difficile questa domanda.</p>,
    },
    {
      title: 'Domanda e foto',
      target: '.creator .cr-field',
      text: (
        <p>
          Scrivi la domanda. Sotto puoi aggiungere una <b>foto</b> o un <b>video di YouTube</b>: se c'è la foto, la domanda può anche
          restare vuota (“Chi è?”).
        </p>
      ),
    },
    {
      title: 'Risposta multipla',
      target: '.creator .cr-check',
      text: <p>Spunta qui per dare 4 opzioni (A, B, C, D); poi tocca il pallino accanto a quella giusta.</p>,
    },
    {
      title: 'Altre opzioni',
      target: '.creator .cr-more',
      text: (
        <p>
          Facoltative: regole da leggere con la domanda, una nota che vede solo l'host dopo la risposta, una foto da mostrare con la
          risposta.
        </p>
      ),
    },
    {
      title: 'Avanti e anteprima',
      target: '.creator .cr-bar',
      text: (
        <p>
          <b>👁 Anteprima</b> mostra la domanda come la vedranno sulla TV. <b>Avanti ›</b> passa alla prossima: non c'è da salvare.
        </p>
      ),
    },
  ], EN_QUESTION),
};
