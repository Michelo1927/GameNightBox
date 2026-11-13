// The tutorials of the pages shared by every game (components/Tutorial.tsx shows them).
// Jeopardy's own creator has its own, in games/jeopardy/creator/tutorials.tsx.
import type { Tutorial } from './components/Tutorial';
import { tr } from './i18n';

const Q = () => <b className="tour-q">?</b>;

// English steps: same order and targets as the Italian ones below.
const EN_HOME = [
  {
    title: 'Welcome to Game Night Box',
    text: (
      <>
        <p>Team games for a night in: everyone in the same room, in front of the <b>same screen</b> (the TV or a computer).</p>
        <p>One person is the <b>host</b>: reads, gives the points and uses the mouse or keyboard. Everyone else plays in teams.</p>
      </>
    ),
  },
  {
    title: 'Pick a game',
    target: '.game-grid .game-card',
    text: (
      <p>
        Each card is a game. The small icons in the top right say how it's played (taking turns or buzzing in, against the clock,
        whether you can steal…): hover over them to read them. Tap a card to see the games ready to play.
      </p>
    ),
  },
  {
    title: 'Ready-made or your own',
    text: (
      <>
        <p>Every game comes with ready-made games. You can also make your own:</p>
        <ul>
          <li><b>✏️ Create</b>: you write it yourself, even from your phone.</li>
          <li><b>🤖 Create with AI</b>: an AI writes it for you (ChatGPT, Claude, Gemini…), with a copy and paste.</li>
          <li><b>📥 Load</b>: open one a friend sent you (code or link).</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Music and sounds',
    target: '.sound-dock',
    text: <p>Here you turn the background music (🎵) and the sound effects (🔊) on and off, each on its own.</p>,
  },
  {
    title: 'See it again any time',
    target: '.help-fab',
    text: (
      <p>
        The <Q /> button is in every section: tap it and it explains that page again. Next to it in the home, <b>IT / EN</b>{' '}
        changes the language.
      </p>
    ),
  },
];

const EN_GAME = [
  {
    title: 'Choose what to play',
    target: '.entry-list',
    text: (
      <>
        <p>
          Games are in two tabs: <b>From the site</b>, ready to play, and <b>Yours</b>, the ones created or loaded on this device.
          The newest are at the top. Games in another language have a small label (IT / EN).
        </p>
        <p>
          Tap one, type the team names and off you go. If you stop halfway, the game stays saved on this device (“In progress”).
        </p>
      </>
    ),
  },
  {
    title: 'The rules',
    target: '.rules-box',
    text: <p>Tap “How to play” to read the rules before you start: it's worth reading them out loud to everyone.</p>,
  },
  {
    title: '✏️ Create',
    target: '.home-actions > :nth-child(1)',
    text: (
      <p>
        You prepare a game yourself, field by field. It works great on a phone and saves itself as you type: you can close it and
        pick it up whenever you like.
      </p>
    ),
  },
  {
    title: '🤖 Create with AI',
    target: '.home-actions > :nth-child(2)',
    text: (
      <p>
        You say the theme and the app writes the request for the AI you use (ChatGPT, Claude, Gemini…). You paste it in the chat,
        copy the answer and paste it here: in a minute the game is ready.
      </p>
    ),
  },
  {
    title: '📥 Load',
    target: '.home-actions > :nth-child(3)',
    text: <p>If someone sent you a code, a link or a file with a game, open it from here.</p>,
  },
  {
    title: 'Already played? Mark it',
    target: '.entry-row .entry-actions',
    text: (
      <>
        <p>
          With <b>✓</b> you mark a game as already played: it fades and moves to the bottom, so the new ones stay at the top.
          Tap again to put it back with the ones to play.
        </p>
        <p>
          With the pencil you change it: it opens in the creator. If it's one of the site's, you make your own copy and the original
          stays as it is.
        </p>
      </>
    ),
  },
];

const EN_CREATOR = [
  {
    title: 'The creator',
    text: (
      <>
        <p>Here you prepare your own game. It's made for phones, but works on a computer too.</p>
        <p>
          There's nothing to save: <b>everything stays on this device</b> as you type, you can close and come back whenever you like.
        </p>
      </>
    ),
  },
  {
    title: 'Read the tip',
    target: '.creator .cr-tip',
    text: <p>At the top you'll find what this game needs and a few tips to make it a good one.</p>,
  },
  {
    title: 'Fill in the fields',
    target: '.creator .cr-field',
    text: (
      <p>
        Start with the title, then scroll down and fill in the rest. If something isn't right (an empty field, a repeated word…)
        the app tells you: no need to remember the rules.
      </p>
    ),
  },
  {
    title: 'How much is left',
    target: '.creator .cr-bar',
    text: <p>The bar at the bottom fills up as you go. Tap “Still missing…” to see the list of what's left to do.</p>,
  },
  {
    title: '✨ Make the code',
    target: '.creator .cr-bar',
    text: (
      <p>
        When everything is in place, <b>✨ Make the code</b> appears here: the game is saved with yours and you get a link (or a
        code) to send to whoever will host. Or play it right away on this device.
      </p>
    ),
  },
  {
    title: 'Pick up or start over',
    target: '.creator .cr-secondary',
    text: (
      <p>
        <b>📥 Edit from a code</b> reopens a game you already shared, to change it. <b>🗑 Start from scratch</b> deletes the draft.
      </p>
    ),
  },
];

const EN_CLAUDE = [
  {
    title: 'Create with AI',
    text: (
      <>
        <p>
          The AI you already use is fine: <b>ChatGPT</b>, <b>Claude</b>, <b>Gemini</b>… They're free to use, at most you need an account.
        </p>
        <p>The app writes the right request for you: you just copy and paste, in three steps.</p>
      </>
    ),
  },
  {
    title: '1 · What you want',
    target: '.creator .cr-cat:nth-of-type(1)',
    text: <p>Write the theme and choose how long the game should be. You can leave the “optional” fields empty.</p>,
  },
  {
    title: '2 · Ask the AI',
    target: '.creator .cr-cat:nth-of-type(2)',
    text: (
      <p>
        Tap <b>📋 Copy the prompt</b>, then open your AI (the links are there): paste the text in a new chat and send it. The AI
        answers with a block of text between curly braces.
      </p>
    ),
  },
  {
    title: '3 · Paste the answer',
    target: '.creator .cr-cat:nth-of-type(3)',
    text: (
      <>
        <p>
          Copy the <b>whole</b> answer of the AI (there's usually a <b>Copy</b> button under each answer) and paste it here. The app
          checks it and shows you what it read.
        </p>
        <p>If there's a mistake, it prepares the message to send back in the same chat to get it fixed.</p>
      </>
    ),
  },
  {
    title: 'Play or touch up',
    text: (
      <p>
        If everything is fine you can play right away, or open the game in the creator to change something first. Either way it
        stays saved with yours.
      </p>
    ),
  },
];

const EN_SHARE = [
  {
    title: 'The game is ready',
    text: (
      <p>
        It's already saved on this device, with yours. If you play it here, nothing else is needed: tap <b>▶ Play on this device</b>.
      </p>
    ),
  },
  {
    title: 'Send it to the host',
    target: '.cr-share',
    text: (
      <p>
        If you're playing on another screen, send the <b>link</b> (WhatsApp, email…): whoever opens it finds the game ready. If
        it's too long for a message (for example with lots of photos), share it as a <b>file</b>.
      </p>
    ),
  },
  {
    title: 'Or the code',
    target: '.cr-code',
    text: (
      <p>
        The code is the same game written as text: on the other screen open the game, tap <b>📥 Load</b> and paste it.
      </p>
    ),
  },
];

const EN_IMPORT = [
  {
    title: 'Load a game',
    target: '.import-page textarea',
    text: (
      <p>
        Paste here the code or the link you were sent. If you were sent a file, use <b>📂 Open a file</b>.
      </p>
    ),
  },
  {
    title: 'Play or edit',
    text: (
      <p>
        As soon as the app reads it, it shows you the game: <b>▶ Play</b> saves it on this device and off you go, <b>✏️ Edit</b>{' '}
        opens it in the creator.
      </p>
    ),
  },
];

export const HUB_TUTORIAL: Tutorial = {
  id: 'home',
  steps: tr([
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
          Il pulsante <Q /> c'è in ogni sezione: lo tocchi e ti rispiega quella pagina. Accanto, in home, <b>IT / EN</b> cambia la
          lingua.
        </p>
      ),
    },
  ], EN_HOME),
};

export const GAME_TUTORIAL: Tutorial = {
  id: 'gioco',
  steps: tr([
    {
      title: 'Scegli cosa giocare',
      target: '.entry-list',
      text: (
        <>
          <p>
            Le partite sono in due schede: <b>Del sito</b>, pronte da giocare, e <b>Le tue</b>, quelle create o caricate su questo
            dispositivo. In cima ci sono le più nuove; quelle in un'altra lingua hanno un'etichetta (IT / EN).
          </p>
          <p>
            Toccane una, scrivi i nomi delle squadre e si parte. Se chiudi a metà, la partita resta salvata su questo dispositivo
            (“In corso”).
          </p>
        </>
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
      title: 'Già fatta? Segnala',
      target: '.entry-row .entry-actions',
      text: (
        <>
          <p>
            Con <b>✓</b> segni una partita come già fatta: diventa più chiara e scende in fondo, così in cima restano quelle nuove.
            Un altro tocco la rimette fra quelle da fare.
          </p>
          <p>
            Con la matita la cambi: si apre nel creatore. Se è una del sito, ne fai una copia tua e l'originale resta com'è.
          </p>
        </>
      ),
    },
  ], EN_GAME),
};

export const CREATOR_TUTORIAL: Tutorial = {
  id: 'crea',
  steps: tr([
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
  ], EN_CREATOR),
};

export const CLAUDE_TUTORIAL: Tutorial = {
  id: 'claude',
  steps: tr([
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
  ], EN_CLAUDE),
};

export const SHARE_TUTORIAL: Tutorial = {
  id: 'codice',
  steps: tr([
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
  ], EN_SHARE),
};

export const IMPORT_TUTORIAL: Tutorial = {
  id: 'carica',
  steps: tr([
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
  ], EN_IMPORT),
};
