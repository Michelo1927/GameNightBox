import { useEffect, useRef, useState } from 'react';

// Animazione d'avvio: la scatola-logo cade, trema, il coperchio salta via e i pezzi veri della pagina
// (titolo, schede dei giochi, pulsanti) escono dalla scatola volando ognuno al suo posto.
// Su pagine diverse dalla home esce la pagina intera. Un tocco la salta.
// Chi ha chiesto al sistema meno animazioni non la vede.

/** Pezzi della home che escono dalla scatola, in quest'ordine. */
const PIECES = '.hub-hero .marquee, .hub-hero p, .game-card, .sound-dock';
const OPEN_AT = 1000; // il coperchio salta a 0.9s
const STAGGER = 110;
const FLY = 800;

export function shouldPlayIntro() {
  return !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const STARS = [
  { dx: -38, dy: -48, d: 0 },
  { dx: 36, dy: -52, d: 40 },
  { dx: -56, dy: -18, d: 80 },
  { dx: 58, dy: -22, d: 20 },
  { dx: -14, dy: -66, d: 60 },
  { dx: 16, dy: -62, d: 100 },
  { dx: -46, dy: -40, d: 120 },
  { dx: 48, dy: -40, d: 140 },
];

function Star({ dx, dy, d }: { dx: number; dy: number; d: number }) {
  return (
    <path
      className="intro-star"
      style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${950 + d}ms` } as React.CSSProperties}
      d="M50 34 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z"
    />
  );
}

/**
 * onOpen: la pagina può essere mostrata (i pezzi partono nascosti dentro la scatola).
 * onDone: l'animazione è finita, l'intro si può togliere.
 */
export default function Intro({ onOpen, onDone }: { onOpen: () => void; onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [phase, setPhase] = useState<'' | 'sink' | 'out'>('');
  const [sinkMs, setSinkMs] = useState(0);

  useEffect(() => {
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
        const svg = svgRef.current;
        if (!svg) return finish();

        let pieces = Array.from(document.querySelectorAll<HTMLElement>(PIECES));
        if (!pieces.length) {
          const page = document.querySelector<HTMLElement>('.app-shell > *');
          pieces = page ? [page] : [];
        }
        // Mentre i pezzi escono la scatola scende verso il basso: ogni pezzo parte da dove si trova
        // l'apertura nel momento in cui esce.
        const launch = (el: HTMLElement) => {
          const r = svg.getBoundingClientRect();
          const ox = r.left + r.width / 2;
          const oy = r.top + r.height * 0.44;
          const b = el.getBoundingClientRect();
          const dx = ox - (b.left + b.width / 2);
          const dy = oy - (b.top + b.height / 2);
          anims.push(
            el.animate(
              [
                { transform: `translate(${dx}px, ${dy}px) scale(0.05)`, opacity: 0 },
                // Prima salta in alto fuori dalla scatola, poi plana al suo posto.
                { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 140}px) scale(0.45)`, opacity: 1, offset: 0.4 },
                { transform: 'none', opacity: 1 },
              ],
              { duration: FLY, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
            ),
          );
        };
        // I pezzi che non sono ancora usciti restano nascosti.
        pieces.forEach((el) => (el.style.opacity = '0'));
        pieces.forEach((el, i) =>
          timers.push(
            window.setTimeout(() => {
              el.style.opacity = '';
              launch(el);
            }, i * STAGGER),
          ),
        );
        onOpen();
        const total = Math.max(0, pieces.length - 1) * STAGGER + FLY;
        setSinkMs(total);
        setPhase('sink');
        timers.push(window.setTimeout(() => setPhase('out'), Math.max(0, total - 400)));
        timers.push(window.setTimeout(finish, total + 50));
        cleanup = () => pieces.forEach((el) => (el.style.opacity = ''));
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
    <div
      className={`intro${phase === 'out' ? ' intro-sink intro-out' : phase === 'sink' ? ' intro-sink' : ''}`}
      style={{ '--sink-ms': `${sinkMs}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="intro-bg" />
      <div className="intro-box">
        <div className="intro-shake">
          <svg ref={svgRef} viewBox="0 0 100 100" overflow="visible">
            <defs>
              <linearGradient id="intro-beam-fill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ffcc00" stopOpacity="0.8" />
                <stop offset="1" stopColor="#ffcc00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon className="intro-beam" points="18,45 82,45 100,-50 0,-50" fill="url(#intro-beam-fill)" />
            {STARS.map((s, i) => (
              <Star key={i} {...s} />
            ))}
            <rect x="16" y="44" width="68" height="40" rx="3" fill="#060ce9" />
            <rect x="46" y="44" width="8" height="40" fill="#ffcc00" />
            <text x="31" y="75" className="intro-letter">G</text>
            <text x="69" y="75" className="intro-letter">N</text>
            <g className="intro-lid">
              <rect x="12" y="32" width="76" height="14" rx="3" fill="#2a32ff" />
              <rect x="46" y="32" width="8" height="14" fill="#ffcc00" />
              <path d="M50 32 C40 16 26 22 33 31 Z M50 32 C60 16 74 22 67 31 Z" fill="#ffcc00" />
            </g>
          </svg>
        </div>
        <div className="intro-title">Game Night Box</div>
      </div>
    </div>
  );
}
