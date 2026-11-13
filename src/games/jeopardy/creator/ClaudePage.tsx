import { useState } from 'react';
import { go } from '../../../hub/nav';
import { saveImported } from '../quiz/imported';
import type { Quiz } from '../quiz/schema';
import { decodeQuiz } from '../quiz/share';
import { copyText, replaceDraft } from './draft';
import { BackPill } from '../../../hub/components/BackButton';
import { AiLinks } from '../../../hub/components/ClaudeCreate';
import TutorialButton from '../../../hub/components/Tutorial';
import { CLAUDE_TUTORIAL } from '../../../hub/tutorials';
import { lang, tr } from '../../../hub/i18n';

// #/claude: builds a ready prompt for any AI chat; the JSON it answers with is pasted back here and played.

interface Form {
  topic: string;
  categories: string;
  audience: string;
  final: boolean;
}

function buildPrompt(f: Form): string {
  if (lang === 'en') return buildPromptEn(f);
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

function buildPromptEn(f: Form): string {
  const what = f.categories.trim()
    ? `Use exactly these 5 categories, with the same names and in the same order: ${f.categories.trim()}.`
    : `Theme: ${f.topic.trim() || 'general knowledge'}. Choose 5 varied and fun categories on this theme yourself.`;
  return `Create a Jeopardy-style quiz in English for a team game night with friends.

${what}
Players: ${f.audience.trim() || 'friends between 20 and 35'}.

RULES
- 5 categories × 5 questions worth 100, 200, 300, 400, 500 points. Difficulty grows within each category.
- Level: high-school general knowledge and pop culture. The quiz must be easier than you think:
  - 100: almost everyone at the table knows it (e.g. "King of the Olympian gods?" → Zeus; "Spider-Man's real name?" → Peter Parker);
  - 200: easy (e.g. "Winged horse of Greek myth?" → Pegasus; "Who painted The Birth of Venus?" → Botticelli);
  - 300: medium (e.g. "King who turned everything into gold?" → Midas; "Kobe Bryant's NBA team?" → Lakers);
  - 400: hard but well known (e.g. "Who killed the Minotaur?" → Theseus; "1903 Nobel for radioactivity?" → Marie Curie);
  - 500: the lesser-known detail of something famous, that makes people say "oh, right!" (e.g. "Animal with three hearts and blue blood?" → Octopus; "Capital of Ecuador?" → Quito).
  Never questions for specialists, obscure exact dates or winners of minor editions.
- Short, unambiguous answers (a name, a number, a word). Check the facts; avoid those that change over time.
- Vary the style; now and then use multiple choice ("choices" field with 4 options; "answer" identical to one of the options).
- "rules": optional, rules everyone sees (e.g. "within ±10% counts"). It must not help guess.
- "hostNote": optional, tolerances for the host (e.g. "accept the surname alone"); it shows only after the answer.
- Text of each question: 200 characters at most.
- No images, audio or video: text only.
${f.final ? '- Add a final question ("final"): a hard but "fair" question, with a category of its own.\n' : ''}
FORMAT
Answer ONLY with a valid JSON code block, with no other text, with this structure:
{
  "lang": "en",
  "title": "Quiz title",
  "description": "A one-line description",
  "categories": [
    {
      "name": "CATEGORY NAME",
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

/** The AI may wrap the JSON in ``` fences or add a sentence: keep only the outermost {...}. */
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
      const q = await decodeQuiz(extractJson(text));
      // Made from the English prompt: an English quiz, even if the AI forgot the field.
      setQuiz(lang === 'en' && !q.lang ? { ...q, lang: 'en' } : q);
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.startsWith(tr('Il quiz', 'The quiz'))
          ? msg
          : tr("Non riesco a leggere la risposta: copia tutto il blocco JSON che ha scritto l'IA.", "I can't read the answer: copy the whole JSON block the AI wrote."),
      );
    }
  };

  return (
    <div className="creator claude-page">
      <header className="cr-header">
        <BackPill label={tr('Esci', 'Exit')} />
        <h1>🤖 {tr("Crea con l'IA", 'Create with AI')}</h1>
        <TutorialButton tutorial={CLAUDE_TUTORIAL} />
      </header>
      <p className="cr-tip">
        {tr(
          "Descrivi il quiz, copia il prompt e incollalo in una chat con l'intelligenza artificiale che usi (ChatGPT, Claude, Gemini…). Poi copia la risposta e incollala qui sotto: puoi giocare subito oppure aprire il quiz nel creatore per sistemare domande e categorie e aggiungere foto o video.",
          'Describe the quiz, copy the prompt and paste it in a chat with the AI you use (ChatGPT, Claude, Gemini…). Then copy the answer and paste it below: you can play right away or open the quiz in the creator to tidy up questions and categories and add photos or videos.',
        )}
      </p>

      <section className="cr-cat">
        <div className="cr-label">1 · {tr('Il quiz', 'The quiz')}</div>
        <label className="cr-field">
          <span className="cr-label">{tr('Tema', 'Theme')}</span>
          <input value={form.topic} onChange={(e) => set({ topic: e.target.value })} placeholder={tr('Es. cena di Natale, anni 90, Harry Potter…', 'E.g. Christmas dinner, the 90s, Harry Potter…')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Oppure le tue 5 categorie (facoltativo)', 'Or your own 5 categories (optional)')}</span>
          <input value={form.categories} onChange={(e) => set({ categories: e.target.value })} placeholder={tr('Es. Musica, Calcio, Cinema, Cucina, Geografia', 'E.g. Music, Football, Movies, Food, Geography')} />
        </label>
        <label className="cr-field">
          <span className="cr-label">{tr('Chi gioca (facoltativo)', 'Who is playing (optional)')}</span>
          <input value={form.audience} onChange={(e) => set({ audience: e.target.value })} placeholder={tr('Es. famiglia con nonni e ragazzi', 'E.g. family with grandparents and teenagers')} />
        </label>
        <label className="cr-check">
          <input type="checkbox" checked={form.final} onChange={(e) => set({ final: e.target.checked })} />
          {tr('Con domanda finale (le squadre scommettono i punti)', 'With a final question (teams bet their points)')}
        </label>
      </section>

      <section className="cr-cat">
        <div className="cr-label">2 · {tr("Chiedi all'IA", 'Ask the AI')}</div>
        <button className="btn primary big" onClick={copy}>{copied ? tr('✓ Prompt copiato', '✓ Prompt copied') : tr('📋 Copia il prompt', '📋 Copy the prompt')}</button>
        <AiLinks />
        <details className="cr-more">
          <summary>{tr('Vedi il prompt', 'See the prompt')}</summary>
          <pre className="prompt-text">{prompt}</pre>
        </details>
      </section>

      <section className="cr-cat">
        <div className="cr-label">3 · {tr('Incolla la risposta', 'Paste the answer')}</div>
        <textarea rows={6} value={answer} onChange={(e) => read(e.target.value)} placeholder={tr("Incolla qui tutto quello che ha risposto l'IA…", 'Paste here everything the AI answered…')} />
        {error && <p className="cr-error">{error}</p>}
        {quiz && (
          <>
            <h2 style={{ margin: 0 }}>{quiz.title}</h2>
            <div className="tags">
              {quiz.categories.map((c) => (
                <span key={c.name}>{c.name}</span>
              ))}
            </div>
            {quiz.final && <p className="muted" style={{ margin: 0 }}>🏆 {tr('Con domanda finale', 'With a final question')}</p>}
            <div className="cr-share">
              <button className="btn primary big" onClick={async () => (await replaceDraft(quiz)) && go('/jeopardy/crea')}>
                ✏️ {tr('Modifica e aggiungi foto', 'Edit and add photos')}
              </button>
              <button className="btn ghost" onClick={() => go(`/jeopardy/${saveImported(quiz)}/setup`)}>▶ {tr('Gioca subito', 'Play now')}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
