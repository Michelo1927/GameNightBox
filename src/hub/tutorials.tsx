// The tutorials of the pages shared by every game (components/Tutorial.tsx shows them).
// Jeopardy's own creator has its own, in games/jeopardy/creator/tutorials.tsx.
import type { Tutorial } from './components/Tutorial';

const Q = () => <b className="tour-q">?</b>;

export const HUB_TUTORIAL: Tutorial = {
  id: 'home',
  steps: [
    {
      title: 'Benvenuto in Game Night Box',
      text: (
        <>
          <p>Giochi a squadre per la serata: tutti nella stessa stanza, davanti allo <b>stesso schermo</b> (la TV o un computer).</p>
          <p>Una persona fa da <b>host</b>: legge, assegna i punti e usa mouse o tastiera. Gli altri giocano a squadre.</p>
        </>
      ),
    },
    {
      title: 'Scegli un gioco',
      target: '.game-grid .game-card',
      text: (
        <p>
          Ogni scheda è un gioco. Le iconcine in alto a destra dicono come si gioca (a turno o prenotandosi, contro il tempo, se
          si può rubare…): passaci sopra col mouse per leggerle. Toccane una per vedere le partite pronte.
        </p>
      ),
    },
    {
      title: 'Partite pronte o fatte da te',
      text: (
        <>
          <p>In ogni gioco trovi partite già pronte. Puoi anche prepararne di tue:</p>
          <ul>
            <li><b>✏️ Crea</b>: le scrivi tu, anche dal telefono.</li>
            <li><b>🤖 Crea con l'IA</b>: le fai scrivere all'intelligenza artificiale (ChatGPT, Claude, Gemini…), con un copia e incolla.</li>
            <li><b>📥 Carica</b>: apri quella che ti ha mandato un amico (codice o link).</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Musica ed effetti',
      target: '.sound-dock',
      text: <p>Qui accendi e spegni la musica di sottofondo (🎵) e gli effetti sonori (🔊), ognuno per conto suo.</p>,
    },
    {
      title: 'Rivedilo quando vuoi',
      target: '.help-fab',
      text: (
        <p>
          Il pulsante <Q /> c'è in ogni sezione: lo tocchi e ti rispiega quella pagina.
        </p>
      ),
    },
  ],
};

export const GAME_TUTORIAL: Tutorial = {
  id: 'gioco',
  steps: [
    {
      title: 'Scegli cosa giocare',
      target: '.quiz-grid .quiz-card',
      text: (
        <p>
          Ogni scheda è una partita pronta. Toccala, scrivi i nomi delle squadre e si parte. Se chiudi a metà, la partita resta salvata
          su questo dispositivo (“Partita in corso”).
        </p>
      ),
    },
    {
      title: 'Le regole',
      target: '.rules-box',
      text: <p>Tocca “Come si gioca” per leggere le regole prima di iniziare: conviene leggerle ad alta voce a tutti.</p>,
    },
    {
      title: '✏️ Crea',
      target: '.home-actions > :nth-child(1)',
      text: (
        <p>
          Prepari tu una partita, campo per campo. Va benissimo dal telefono e si salva da sola mentre scrivi: puoi chiudere e
          riprendere quando vuoi.
        </p>
      ),
    },
    {
      title: "🤖 Crea con l'IA",
      target: '.home-actions > :nth-child(2)',
      text: (
        <p>
          Dici il tema e l'app prepara la richiesta per l'intelligenza artificiale che usi (ChatGPT, Claude, Gemini…). Tu la incolli nella chat, copi la risposta e la
          incolli qui: in un minuto la partita è pronta.
        </p>
      ),
    },
    {
      title: '📥 Carica',
      target: '.home-actions > :nth-child(3)',
      text: <p>Se qualcuno ti ha mandato un codice, un link o un file con una partita, aprila da qui.</p>,
    },
    {
      title: 'Modifica',
      target: '.quiz-grid .quiz-card .card-actions',
      text: (
        <p>
          Con la matita cambi una partita esistente: si apre nel creatore. Se è una del sito, ne fai una copia tua e l'originale
          resta com'è.
        </p>
      ),
    },
  ],
};

export const CREATOR_TUTORIAL: Tutorial = {
  id: 'crea',
  steps: [
    {
      title: 'Il creatore',
      text: (
        <>
          <p>Qui prepari una partita tua. È fatto per il telefono, ma va bene anche sul computer.</p>
          <p>
            Non c'è da salvare: <b>tutto resta su questo dispositivo</b> mentre scrivi, puoi chiudere e riprendere quando vuoi.
          </p>
        </>
      ),
    },
    {
      title: 'Leggi il suggerimento',
      target: '.creator .cr-tip',
      text: <p>In cima trovi cosa serve per questo gioco e qualche consiglio per farlo bene.</p>,
    },
    {
      title: 'Riempi i campi',
      target: '.creator .cr-field',
      text: (
        <p>
          Inizia dal titolo, poi scendi e compila il resto. Se qualcosa non va bene (un campo vuoto, una parola ripetuta…) l'app te
          lo segnala: non devi ricordarti le regole a memoria.
        </p>
      ),
    },
    {
      title: 'Quanto manca',
      target: '.creator .cr-bar',
      text: (
        <p>
          La barra in basso si riempie mentre completi. Tocca “Mancano ancora…” per vedere l'elenco di cosa resta da fare.
        </p>
      ),
    },
    {
      title: '✨ Genera il codice',
      target: '.creator .cr-bar',
      text: (
        <p>
          Quando è tutto a posto, qui compare <b>✨ Genera il codice</b>: la partita si salva tra le tue e ti dà un link (o un codice)
          da mandare a chi farà da host. Oppure la giochi subito su questo dispositivo.
        </p>
      ),
    },
    {
      title: 'Riprendere o ricominciare',
      target: '.creator .cr-secondary',
      text: (
        <p>
          <b>📥 Modifica da un codice</b> riapre una partita che hai già condiviso, per cambiarla. <b>🗑 Ricomincia da zero</b>{' '}
          cancella la bozza.
        </p>
      ),
    },
  ],
};

export const CLAUDE_TUTORIAL: Tutorial = {
  id: 'claude',
  steps: [
    {
      title: "Crea con l'IA",
      text: (
        <>
          <p>
            Va bene l'intelligenza artificiale che usi già: <b>ChatGPT</b>, <b>Claude</b>, <b>Gemini</b>… Si usano gratis, al massimo serve un account.
          </p>
          <p>Qui l'app scrive per te la richiesta giusta: tu fai solo copia e incolla, in tre passi.</p>
        </>
      ),
    },
    {
      title: '1 · Cosa vuoi',
      target: '.creator .cr-cat:nth-of-type(1)',
      text: <p>Scrivi il tema e scegli quanto deve essere lunga la partita. I campi “facoltativo” puoi lasciarli vuoti.</p>,
    },
    {
      title: "2 · Chiedi all'IA",
      target: '.creator .cr-cat:nth-of-type(2)',
      text: (
        <p>
          Tocca <b>📋 Copia il prompt</b>, poi apri la tua IA (ci sono i link): incolla il testo in una nuova chat e invialo. L'IA risponde con
          un blocco di testo tra parentesi graffe.
        </p>
      ),
    },
    {
      title: '3 · Incolla la risposta',
      target: '.creator .cr-cat:nth-of-type(3)',
      text: (
        <>
          <p>
            Copia <b>tutta</b> la risposta dell'IA (di solito c'è il pulsante <b>Copia</b> sotto ogni risposta) e incollala qui. L'app la controlla
            e ti mostra cosa ha letto.
          </p>
          <p>Se c'è qualche errore ti prepara il messaggio da rimandare nella stessa chat per farlo correggere.</p>
        </>
      ),
    },
    {
      title: 'Gioca o ritocca',
      text: (
        <p>
          Se va tutto bene puoi giocare subito, oppure aprire la partita nel creatore per cambiare qualcosa prima. In tutti e due i
          casi resta salvata tra le tue.
        </p>
      ),
    },
  ],
};

export const SHARE_TUTORIAL: Tutorial = {
  id: 'codice',
  steps: [
    {
      title: 'La partita è pronta',
      text: (
        <p>
          È già salvata su questo dispositivo, tra le tue. Se la giochi qui non serve altro: tocca <b>▶ Gioca su questo dispositivo</b>.
        </p>
      ),
    },
    {
      title: 'Mandala a chi fa da host',
      target: '.cr-share',
      text: (
        <p>
          Se si gioca su un altro schermo, manda il <b>link</b> (WhatsApp, mail…): chi lo apre trova la partita pronta. Se è troppo
          lunga per un messaggio (per esempio con tante foto), condividila come <b>file</b>.
        </p>
      ),
    },
    {
      title: 'Oppure il codice',
      target: '.cr-code',
      text: (
        <p>
          Il codice è la stessa partita scritta come testo: sull'altro schermo si apre il gioco, si tocca <b>📥 Carica</b> e lo si
          incolla.
        </p>
      ),
    },
  ],
};

export const IMPORT_TUTORIAL: Tutorial = {
  id: 'carica',
  steps: [
    {
      title: 'Carica una partita',
      target: '.import-page textarea',
      text: (
        <p>
          Incolla qui il codice o il link che ti hanno mandato. Se ti hanno mandato un file, usa <b>📂 Apri un file</b>.
        </p>
      ),
    },
    {
      title: 'Gioca o modifica',
      text: (
        <p>
          Appena l'app lo legge ti mostra la partita: <b>▶ Gioca</b> la salva su questo dispositivo e si parte, <b>✏️ Modifica</b> la
          apre nel creatore.
        </p>
      ),
    },
  ],
};
