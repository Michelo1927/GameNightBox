// Jeopardy's own tutorials: its list of quizzes and its creator work differently from the other games'.
import type { Tutorial } from '../../../hub/components/Tutorial';
import { GAME_TUTORIAL } from '../../../hub/tutorials';

export const HOME_TUTORIAL: Tutorial = {
  id: 'gioco-jeopardy',
  steps: [
    ...GAME_TUTORIAL.steps.filter((s) => s.title !== 'Modifica' && s.title !== 'Le regole'),
    {
      title: 'Modifica e archivia',
      target: '.quiz-grid .quiz-card .card-actions',
      text: (
        <p>
          <b>📦 Archivia</b> toglie un quiz da questa schermata (lo ritrovi in fondo, nell'archivio). Sui quiz caricati o creati da te
          c'è anche <b>✏️ Modifica</b>, che lo riapre nel creatore.
        </p>
      ),
    },
  ],
};

export const BOARD_TUTORIAL: Tutorial = {
  id: 'crea-jeopardy',
  steps: [
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
  ],
};

export const QUESTION_TUTORIAL: Tutorial = {
  id: 'crea-jeopardy-domanda',
  steps: [
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
  ],
};
