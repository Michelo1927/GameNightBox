// Mini tutorial: a few steps that light up the parts of the page and say what they are for.
// The first time someone opens a page with a tutorial, the app asks once whether they want the tutorials;
// the answer is kept on the device. The "?" button shows the page's tutorial again at any time.
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tr } from '../i18n';

export interface TutorialStep {
  title: string;
  text: ReactNode;
  /** CSS selector of the part of the page to light up; the first visible match. None: the card alone. */
  target?: string;
}

export interface Tutorial {
  /** Remembered once seen, so it starts by itself only the first time. */
  id: string;
  steps: TutorialStep[];
}

// --- What was answered and seen, on this device ---

const KEY = 'game-night:tutorial';
interface Memory {
  /** The answer to "do you want the tutorials?": asked once for the whole site. */
  choice?: 'yes' | 'no';
  seen: string[];
}
function load(): Memory {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Memory>;
    return { choice: m.choice, seen: Array.isArray(m.seen) ? m.seen : [] };
  } catch {
    return { seen: [] };
  }
}
function save(m: Memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* not remembered: it will ask again */
  }
}
const remember = (patch: Partial<Memory>) => save({ ...load(), ...patch });
const markSeen = (id: string) => {
  const m = load();
  if (!m.seen.includes(id)) save({ ...m, seen: [...m.seen, id] });
};

/** The first element matching the selector that is on screen (not hidden). */
function find(selector?: string): HTMLElement | null {
  if (!selector) return null;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) if (el.getClientRects().length) return el;
  return null;
}

/** While the box opening animation plays on the first visit, nothing else starts. */
const introPlaying = () => !!document.querySelector('.app-intro');

// --- The "?" button, which also starts the tutorial by itself the first time ---

interface ButtonProps {
  tutorial: Tutorial;
  /** "fab": fixed in the top right corner (pages without a bar); "pill": inside a creator's header. */
  look?: 'fab' | 'pill';
}

export default function TutorialButton({ tutorial, look = 'pill' }: ButtonProps) {
  const [mode, setMode] = useState<'off' | 'ask' | 'tour'>('off');

  useEffect(() => {
    let timer: number | undefined;
    const check = () => {
      if (introPlaying()) {
        timer = window.setTimeout(check, 400);
        return;
      }
      const m = load();
      if (m.choice === undefined) setMode('ask');
      else if (m.choice === 'yes' && !m.seen.includes(tutorial.id)) setMode('tour');
    };
    // A moment for the page's entrance animation, so the lit parts are where they will stay.
    timer = window.setTimeout(check, 700);
    return () => clearTimeout(timer);
  }, [tutorial.id]);

  const start = () => setMode('tour');
  const close = () => {
    markSeen(tutorial.id);
    setMode('off');
  };

  const button = (
    <button className={`help-${look}`} onClick={start} title={tr('Come funziona (tutorial)', 'How it works (tutorial)')} aria-label={tr('Come funziona: mostra il tutorial', 'How it works: show the tutorial')}>
      ?
    </button>
  );
  return (
    <>
      {look === 'fab' ? createPortal(button, document.body) : button}
      {mode === 'ask' &&
        createPortal(
          <FirstQuestion
            onAnswer={(yes) => {
              remember({ choice: yes ? 'yes' : 'no' });
              if (yes) start();
              else close();
            }}
          />,
          document.body,
        )}
      {mode === 'tour' && createPortal(<Tour steps={tutorial.steps} onClose={close} />, document.body)}
    </>
  );
}

function FirstQuestion({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  useKeys({ Escape: () => onAnswer(false), Enter: () => onAnswer(true) });
  return (
    <div className="ask-backdrop tour-ask">
      <div className="ask" role="dialog" aria-modal aria-labelledby="tour-ask-title">
        <p id="tour-ask-title">{tr('Prima volta qui? Vuoi un mini tutorial che ti mostra come funziona?', 'First time here? Would you like a short tutorial that shows you how it works?')}</p>
        <p className="tour-ask-note">
          {tr(
            <>
              Se dici sì, la prima volta che apri ogni sezione (i giochi, il creatore, "Crea con l'IA"…) ti mostro a cosa servono i
              pulsanti. Puoi rivederlo quando vuoi con il pulsante <b className="tour-q">?</b>
            </>,
            <>
              If you say yes, the first time you open each section (the games, the creator, "Create with AI"…) I'll show you what the
              buttons are for. You can see it again any time with the <b className="tour-q">?</b> button.
            </>,
          )}
        </p>
        <div className="ask-buttons">
          <button className="btn ghost" onClick={() => onAnswer(false)}>{tr('No, grazie', 'No, thanks')}</button>
          <button className="btn primary" autoFocus onClick={() => onAnswer(true)}>{tr('Sì, mostramelo', 'Yes, show me')}</button>
        </div>
      </div>
    </div>
  );
}

/** Keys while a tutorial window is open; caught first, so the page's own keys don't react. */
function useKeys(map: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fn = map[e.key];
      if (!fn) return;
      e.preventDefault();
      e.stopPropagation();
      fn();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
}

// --- The tour: a spotlight on the part of the page, and a card with the explanation ---

type Box = { top: number; left: number; width: number; height: number };
const PAD = 8;

function Tour({ steps, onClose }: { steps: TutorialStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));
  useKeys({ Escape: onClose, ArrowRight: next, Enter: next, ArrowLeft: prev });

  // Bring the part into view, then follow it (scrolling, resizing, a page that moves) until the step changes.
  useLayoutEffect(() => {
    const el = find(step.target);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    let frame = 0;
    const follow = () => {
      const r = el.getBoundingClientRect();
      setBox((b) =>
        b && b.top === r.top && b.left === r.left && b.width === r.width && b.height === r.height
          ? b
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [step.target]);

  // The card goes where it does not cover the lit part: at the bottom, or at the top when the part is low.
  const place = !box ? 'middle' : box.top + box.height / 2 > innerHeight * 0.55 ? 'top' : 'bottom';

  return (
    <div className={`tour ${box ? '' : 'tour-dim'}`} role="dialog" aria-modal aria-labelledby="tour-title">
      {/* Clicks on the page are stopped while the tutorial is open. */}
      <div className="tour-catch" onClick={(e) => e.stopPropagation()} />
      {box && (
        <div
          className="tour-spot"
          style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      )}
      <div className={`tour-card tour-${place}`} key={i}>
        <div className="tour-count">
          {i + 1} {tr('di', 'of')} {steps.length}
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <div className="tour-text">{step.text}</div>
        <div className="tour-dots" aria-hidden>
          {steps.map((_, j) => (
            <span key={j} className={j === i ? 'on' : j < i ? 'done' : ''} />
          ))}
        </div>
        <div className="tour-buttons">
          <button className="btn ghost tour-skip" onClick={onClose}>
            {last ? tr('Chiudi', 'Close') : tr('Salta', 'Skip')}
          </button>
          {i > 0 && (
            <button className="btn ghost" onClick={prev}>
              ‹ {tr('Indietro', 'Back')}
            </button>
          )}
          <button className="btn primary" autoFocus onClick={next}>
            {last ? tr('Fatto ✓', 'Done ✓') : tr('Avanti ›', 'Next ›')}
          </button>
        </div>
      </div>
    </div>
  );
}
