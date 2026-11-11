import { useEffect, useRef, useState, type CSSProperties } from 'react';

// Animazione d'avvio: la scatola-logo cade sul palco e si schiaccia nell'atterraggio, trema mentre la luce
// filtra da sotto il coperchio, poi il coperchio salta via con un lampo e una pioggia di coriandoli e i pezzi
// veri della pagina (insegna, schede dei giochi, pulsanti) vengono lanciati fuori, ognuno al suo posto.
// Su pagine diverse dalla home esce la pagina intera. Un tocco la salta.
// Chi ha chiesto al sistema meno animazioni non la vede.
// Si vede una volta per sessione (sessionStorage), così un ricaricamento a metà partita non la rifà.

const SEEN_KEY = 'gnb:intro-seen';

/** Pezzi della home che escono dalla scatola, in quest'ordine. */
const PIECES = '.hub-hero .marquee, .hub-hero p, .game-card, .sound-dock';
// I tempi della scatola stanno in intro.css: il coperchio salta a 1.3s, subito dopo partono i pezzi.
const OPEN_AT = 1340;
const STAGGER = 95;
const FLY = 850;
/** L'insegna arriva spenta e si accende con uno sfarfallio, come un neon. */
const NEON = 450;
/** La scatola se ne va poco dopo aver lanciato l'ultimo pezzo. */
const LEAVE = 380;

export function shouldPlayIntro() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

// Coriandoli: sempre gli stessi (numeri pseudo-casuali fissi), nei colori dei quattro giochi.
// Le distanze sono in centesimi della larghezza della scatola.
const BIT_COLORS = ['#ffc928', '#ff3d8b', '#36d6ff', '#ff8a1f', '#ffe27a', '#ffffff'];
const BIT_SHAPES = ['strip', 'dot', 'star'];
const BITS = Array.from({ length: 30 }, (_, i) => {
  const rnd = (k: number) => {
    const x = Math.sin((i + 1) * k) * 43758.5453;
    return x - Math.floor(x);
  };
  const angle = (rnd(12.9898) - 0.5) * 2.2; // ventaglio verso l'alto
  const power = 50 + rnd(78.233) * 75;
  return {
    className: `intro-bit ${BIT_SHAPES[i % BIT_SHAPES.length]}`,
    style: {
      '--dx': (Math.sin(angle) * power * 1.5).toFixed(1),
      '--up': (Math.cos(angle) * power).toFixed(1),
      '--spin': `${Math.round((rnd(37.719) - 0.5) * 1080)}deg`,
      '--d': `${Math.round(rnd(93.989) * 140)}ms`,
      '--t': `${950 + Math.round(rnd(11.31) * 500)}ms`,
      '--c': BIT_COLORS[i % BIT_COLORS.length],
    } as CSSProperties,
  };
});

/**
 * onOpen: la pagina può essere mostrata (i pezzi partono nascosti dentro la scatola).
 * onDone: l'animazione è finita, l'intro si può togliere.
 */
export default function Intro({ onOpen, onDone }: { onOpen: () => void; onDone: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const kickRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage unavailable: it just plays again */
    }
    const timers: number[] = [];
    const anims: Animation[] = [];
    let finished = false;
    let cleanup = () => {};
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.finish());
      cleanup();
      onOpen();
      onDone();
    };

    timers.push(
      window.setTimeout(() => {
        const stage = stageRef.current;
        if (!stage) return finish();

        let pieces = Array.from(document.querySelectorAll<HTMLElement>(PIECES));
        if (!pieces.length) {
          const page = document.querySelector<HTMLElement>('.app-shell > *');
          pieces = page ? [page] : [];
        }
        // L'apertura della scatola: da qui parte ogni pezzo.
        const s = stage.getBoundingClientRect();
        const ox = s.left + s.width / 2;
        const oy = s.top + s.height * 0.42;
        const lift = Math.min(innerHeight * 0.22, 190);

        const launch = (el: HTMLElement, i: number) => {
          const b = el.getBoundingClientRect();
          const dx = ox - (b.left + b.width / 2);
          const dy = oy - (b.top + b.height / 2);
          const tilt = i % 2 ? 9 : -9;
          // Un lancio: schizza in alto rallentando, resta sospeso un attimo, poi plana al suo posto
          // e ci si assesta superandolo appena.
          anims.push(
            el.animate(
              [
                { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(${tilt * 2}deg)`, easing: 'cubic-bezier(0.15, 0.6, 0.3, 1)' },
                {
                  transform: `translate(${dx * 0.55}px, ${dy * 0.55 - lift}px) scale(0.5) rotate(${tilt}deg)`,
                  offset: 0.36,
                  easing: 'cubic-bezier(0.5, 0, 0.25, 1)',
                },
                { transform: 'translate(0px, 0px) scale(1.035) rotate(0deg)', offset: 0.86, easing: 'ease-out' },
                { transform: 'translate(0px, 0px) scale(1) rotate(0deg)' },
              ],
              { duration: FLY },
            ),
            el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140 }),
          );
          if (el.matches('.marquee')) {
            const land = (FLY * 0.82) / (FLY + NEON);
            const at = (k: number) => land + (1 - land) * k;
            const off = 'brightness(0.45) saturate(0.6)';
            anims.push(
              el.animate(
                [
                  { filter: off, offset: 0 },
                  { filter: off, offset: land },
                  { filter: 'brightness(1.3) saturate(1.1)', offset: at(0.12) },
                  { filter: 'brightness(0.6) saturate(0.7)', offset: at(0.24) },
                  { filter: 'brightness(1.25) saturate(1.1)', offset: at(0.42) },
                  { filter: 'brightness(0.8) saturate(0.9)', offset: at(0.54) },
                  { filter: 'brightness(1.15) saturate(1)', offset: at(0.7) },
                  { filter: 'brightness(1) saturate(1)', offset: 1 },
                ],
                { duration: FLY + NEON },
              ),
            );
          }
          // La scatola dà un colpetto a ogni lancio.
          kickRef.current?.animate([{ transform: 'scale(1.07, 0.93)' }, { transform: 'none' }], { duration: 190, easing: 'ease-out' });
        };

        // I pezzi che non sono ancora usciti restano nascosti.
        pieces.forEach((el) => (el.style.opacity = '0'));
        cleanup = () => pieces.forEach((el) => (el.style.opacity = ''));
        pieces.forEach((el, i) =>
          timers.push(
            window.setTimeout(() => {
              el.style.opacity = '';
              launch(el, i);
            }, i * STAGGER),
          ),
        );
        onOpen();
        const lastLaunch = Math.max(0, pieces.length - 1) * STAGGER;
        timers.push(window.setTimeout(() => setLeaving(true), lastLaunch + 220));
        timers.push(window.setTimeout(finish, Math.max(lastLaunch + FLY, FLY + NEON, lastLaunch + 220 + LEAVE) + 50));
      }, OPEN_AT),
    );

    addEventListener('pointerdown', finish, true);
    return () => {
      timers.forEach(clearTimeout);
      cleanup();
      removeEventListener('pointerdown', finish, true);
    };
  }, [onOpen, onDone]);

  return (
    <div className={`intro${leaving ? ' intro-out' : ''}`} aria-hidden="true">
      <div className="intro-spot" />
      <div className="intro-stage" ref={stageRef}>
        <div className="intro-rays" />
        <div className="intro-halo" />
        <div className="intro-shadow" />
        <div className="intro-ring" />
        <div className="intro-drop">
          <div className="intro-rattle" ref={kickRef}>
            <div className="intro-squash">
              <svg viewBox="0 0 100 100" overflow="visible">
                <defs>
                  <linearGradient id="intro-g-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3846ff" />
                    <stop offset="0.45" stopColor="#0b16ea" />
                    <stop offset="1" stopColor="#0509a4" />
                  </linearGradient>
                  <linearGradient id="intro-g-lid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6f79ff" />
                    <stop offset="1" stopColor="#222eff" />
                  </linearGradient>
                  <linearGradient id="intro-g-gold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffe27a" />
                    <stop offset="0.55" stopColor="#ffc928" />
                    <stop offset="1" stopColor="#e9a800" />
                  </linearGradient>
                  <linearGradient id="intro-g-beam" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0" stopColor="#fff3c0" stopOpacity="0.95" />
                    <stop offset="0.35" stopColor="#ffc928" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#ffc928" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="intro-g-glow">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.45" stopColor="#ffe27a" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#ffc928" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <g className="intro-beam">
                  <polygon points="20,45 80,45 114,-75 -14,-75" fill="url(#intro-g-beam)" />
                  <polygon points="33,45 67,45 78,-75 22,-75" fill="url(#intro-g-beam)" />
                </g>
                <rect x="16" y="44" width="68" height="40" rx="3" fill="url(#intro-g-body)" />
                <rect x="46" y="44" width="8" height="40" fill="url(#intro-g-gold)" />
                <rect x="16" y="44" width="68" height="5" fill="#000" opacity="0.28" />
                <text x="31" y="75" className="intro-letter">G</text>
                <text x="69" y="75" className="intro-letter">N</text>
                <ellipse className="intro-gap" cx="50" cy="46" rx="39" ry="5.5" fill="url(#intro-g-glow)" />
                <ellipse className="intro-mouth" cx="50" cy="45" rx="34" ry="7" fill="url(#intro-g-glow)" />
                <g className="intro-lid-x">
                  <g className="intro-lid">
                    <rect x="12" y="32" width="76" height="14" rx="3" fill="url(#intro-g-lid)" />
                    <rect x="13" y="32.6" width="74" height="2.6" rx="1.3" fill="#fff" opacity="0.2" />
                    <rect x="46" y="32" width="8" height="14" fill="url(#intro-g-gold)" />
                    <path d="M50 32 C40 16 26 22 33 31 Z M50 32 C60 16 74 22 67 31 Z" fill="url(#intro-g-gold)" />
                    <circle cx="50" cy="31.2" r="3.2" fill="#ffe27a" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
        <div className="intro-flash" />
        <div className="intro-burst">
          {BITS.map((b, i) => (
            <i key={i} className={b.className} style={b.style}>
              <b />
            </i>
          ))}
        </div>
        <div className="intro-title">Game Night Box</div>
      </div>
    </div>
  );
}
