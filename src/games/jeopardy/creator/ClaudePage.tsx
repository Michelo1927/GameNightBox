import { useState } from 'react';
import { go } from '../../../hub/nav';
import { saveImported } from '../quiz/imported';
import type { Quiz } from '../quiz/schema';
import { decodeQuiz } from '../quiz/share';
import { copyText, replaceDraft } from './draft';

// #/claude: builds a ready prompt for claude.ai; the JSON it answers with is pasted back here and played.

interface Form {
  topic: string;
  categories: string;
  audience: string;
  final: boolean;
}

function buildPrompt(f: Form): string {
  const what = f.categories.trim()
    ? `Usa esattamente queste 5 categorie, con lo stesso nome e nello stesso ordine: ${f.categories.trim()}.`
    : `Tema: ${f.topic.trim() || 'cultura generale'}. Scegli tu 5 categorie varie e divertenti su questo tema.`;
  return `Crea un quiz in stile Jeopardy in italiano per una serata tra amici a squadre.

${what}
Pubblico: ${f.audience.trim() || 'amici italiani tra i 20 e i 35 anni'}.

REGOLE
- 5 categorie × 5 domande da 100, 200, 300, 400, 500 punti. Difficoltà crescente in ogni categoria.
- Livello: cultura generale da scuola superiore e cultura pop. Il quiz deve essere più facile di quanto pensi:
  - 100: la sa quasi tutto il tavolo (es. "Re dell'Olimpo?" → Zeus; "Vero nome di Spider-Man?" → Peter Parker);
  - 200: facile (es. "Cavallo alato della mitologia?" → Pegaso; "Chi ha dipinto la Nascita di Venere?" → Botticelli);
  - 300: media (es. "Re che trasformava tutto in oro?" → Mida; "Squadra NBA di Kobe Bryant?" → Lakers);
  - 400: difficile ma nota (es. "Chi uccise il Minotauro?" → Teseo; "Nobel 1903 per la radioattività?" → Marie Curie);
  - 500: il dettaglio meno noto di una cosa famosa, che fa dire "ah, giusto!" (es. "Animale con tre cuori e sangue blu?" → Polpo; "Capitale dell'Ecuador?" → Quito).
  Mai domande da specialisti, date precise poco note o vincitori di edizioni minori.
- Risposte brevi e univoche (un nome, un numero, una parola). Verifica i fatti; evita quelli che cambiano nel tempo.
- Varia lo stile; ogni tanto usa la scelta multipla (campo "choices" con 4 opzioni; "answer" identica a una delle opzioni).
- "rules": facoltativo, regole che vedono tutti (es. "valida entro ±10%"). Non deve aiutare a indovinare.
- "hostNote": facoltativo, tolleranze per l'host (es. "accettare anche il solo cognome"); compare solo dopo la risposta.
- Testo di ogni domanda: massimo 200 caratteri.
- Niente immagini, audio o video: solo testo.
${f.final ? '- Aggiungi una domanda finale ("final"): una domanda difficile ma "giusta", con una categoria a sé.\n' : ''}
FORMATO
Rispondi SOLO con un blocco di codice JSON valido, senza altro testo, con questa struttura:
{
  "title": "Titolo del quiz",
  "description": "Una riga di descrizione",
  "categories": [
    {
      "name": "NOME CATEGORIA",
      "questions": [
        { "points": 100, "question": "…", "answer": "…" },
        { "points": 200, "question": "…", "answer": "…", "hostNote": "…" },
        { "points": 300, "question": "…", "answer": "B", "choices": ["A", "B", "C", "D"] },
        { "points": 400, "question": "…", "answer": "…" },
        { "points": 500, "question": "…", "answer": "…" }
      ]
    }
  ]${f.final ? ',\n  "final": { "category": "…", "question": "…", "answer": "…" }' : ''}
}`;
}

/** Claude may wrap the JSON in ``` fences or add a sentence: keep only the outermost {...}. */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export default function ClaudePage() {
  const [form, setForm] = useState<Form>({ topic: '', categories: '', audience: '', final: true });
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState('');
  const prompt = buildPrompt(form);
  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setCopied(false);
  };

  const copy = async () => setCopied(await copyText(prompt));

  const read = async (text: string) => {
    setAnswer(text);
    setError('');
    setQuiz(null);
    if (!text.trim()) return;
    try {
      setQuiz(await decodeQuiz(extractJson(text)));
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.startsWith('Il quiz') ? msg : 'Non riesco a leggere la risposta: copia tutto il blocco JSON che ha scritto Claude.');
    }
  };

  return (
    <div className="creator claude-page">
      <header className="cr-header">
        <a className="back" href="#/jeopardy">←</a>
        <h1>🤖 Crea con Claude</h1>
      </header>
      <p className="cr-tip">
        Descrivi il quiz, copia il prompt e incollalo su <b>claude.ai</b>. Poi copia la risposta di Claude e incollala qui sotto: puoi
        giocare subito oppure aprire il quiz nel creatore per sistemare domande e categorie e aggiungere foto o video.
      </p>

      <section className="cr-cat">
        <div className="cr-label">1 · Il quiz</div>
        <label className="cr-field">
          <span className="cr-label">Tema</span>
          <input value={form.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="Es. cena di Natale, anni 90, Harry Potter…" />
        </label>
        <label className="cr-field">
          <span className="cr-label">Oppure le tue 5 categorie (facoltativo)</span>
          <input value={form.categories} onChange={(e) => set({ categories: e.target.value })} placeholder="Es. Musica, Calcio, Cinema, Cucina, Geografia" />
        </label>
        <label className="cr-field">
          <span className="cr-label">Chi gioca (facoltativo)</span>
          <input value={form.audience} onChange={(e) => set({ audience: e.target.value })} placeholder="Es. famiglia con nonni e ragazzi" />
        </label>
        <label className="cr-check">
          <input type="checkbox" checked={form.final} onChange={(e) => set({ final: e.target.checked })} />
          Con domanda finale (le squadre scommettono i punti)
        </label>
      </section>

      <section className="cr-cat">
        <div className="cr-label">2 · Chiedi a Claude</div>
        <button className="btn primary big" onClick={copy}>{copied ? '✓ Prompt copiato' : '📋 Copia il prompt'}</button>
        <a className="btn ghost" href="https://claude.ai/new" target="_blank" rel="noreferrer">
          Apri claude.ai ↗
        </a>
        <details className="cr-more">
          <summary>Vedi il prompt</summary>
          <pre className="prompt-text">{prompt}</pre>
        </details>
      </section>

      <section className="cr-cat">
        <div className="cr-label">3 · Incolla la risposta</div>
        <textarea rows={6} value={answer} onChange={(e) => read(e.target.value)} placeholder="Incolla qui tutto quello che ha risposto Claude…" />
        {error && <p className="cr-error">{error}</p>}
        {quiz && (
          <>
            <h2 style={{ margin: 0 }}>{quiz.title}</h2>
            <div className="tags">
              {quiz.categories.map((c) => (
                <span key={c.name}>{c.name}</span>
              ))}
            </div>
            {quiz.final && <p className="muted" style={{ margin: 0 }}>🏆 Con domanda finale</p>}
            <div className="cr-share">
              <button className="btn primary big" onClick={async () => (await replaceDraft(quiz)) && go('/crea')}>
                ✏️ Modifica e aggiungi foto
              </button>
              <button className="btn ghost" onClick={() => go(`/q/${saveImported(quiz)}/setup`)}>▶ Gioca subito</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
