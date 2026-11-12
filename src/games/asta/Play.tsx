import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import type { AstaSet } from './schema';
import { dealRound, finish, inAuction, leave, raise, scoreOf, skipTheme, someoneWon, themesLeft, useAsta, type Round } from './state';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const MAX_BID = 99;

export default function Play({ loaded }: { loaded: Loaded<AstaSet> }) {
  const { slug, data } = loaded;
  const total = data.temi.length;
  const { game, setGame, undo, canUndo } = useAsta(slug, total, true);
  const [running, setRunning] = useState(false);
  const since = useRef(0);
  const [, tick] = useState(0);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);

  const r = game.round;
  const byId = (id: string | null | undefined) => game.teams.find((t) => t.id === id);
  // The offer the host is getting ready (↑ ↓), always above the highest one.
  const [draft, setDraft] = useState((r?.bid ?? 0) + 1);
  useEffect(() => setDraft((r?.bid ?? 0) + 1), [r?.bid, r?.theme]);

  const left = r ? r.timeLeft - (running ? Date.now() - since.current : 0) : game.seconds * 1000;
  const playing = r?.phase === 'run';
  const holder = byId(r?.holder);
  const prev = byId(r?.prev);
  const active = inAuction(game);
  // The team on turn (if the setup removed it, the first one still in the auction).
  const turn = byId(r?.turn) ?? active.find((t) => t.id !== r?.holder);

  /** Changes the round, saving the time used so far while the clock runs. */
  function update(fn: (r: Round) => Round) {
    const used = running ? Date.now() - since.current : 0;
    since.current = Date.now();
    setGame((g) => (g.round ? { ...g, round: fn({ ...g.round, timeLeft: Math.max(0, g.round.timeLeft - used) }) } : g));
  }

  // The clock: redraws while running, ticks in the last 5 seconds, ends the run at zero.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      const now = (r?.timeLeft ?? 0) - (Date.now() - since.current);
      if (now <= 5000 && now > 0 && Math.floor(now / 1000) !== Math.floor((now + 100) / 1000)) sounds.tick();
      if (now <= 0) {
        setRunning(false);
        sounds.timeUp();
        sounds.wrong();
        setGame((g) => finish(g, 'timeout', 0));
      }
    }, 100);
    return () => clearInterval(t);
  });

  const startClock = () => {
    since.current = Date.now();
    setRunning(true);
  };

  // --- auction ---
  const step = (d: number) => r?.phase === 'auction' && setDraft((n) => Math.min(MAX_BID, Math.max(r.bid + 1, n + d)));
  const offer = () => {
    if (r?.phase !== 'auction' || draft <= r.bid) return;
    sounds.reveal();
    setGame((g) => raise(g, draft));
  };
  const pass = () => {
    if (r?.phase !== 'auction' || !r.holder) return;
    sounds.pass();
    setGame((g) => leave(g));
  };
  const skip = () => r?.phase === 'auction' && themesLeft(game, total) > 0 && setGame((g) => skipTheme(g, total));

  // --- run ---
  const via = () => {
    if (r?.phase !== 'sold') return;
    // The time is the one in the setup now (it may have changed since the theme was dealt).
    setGame((g) => (g.round ? { ...g, started: true, round: { ...g.round, phase: 'run', said: 0, timeLeft: g.seconds * 1000 } } : g));
    startClock();
  };
  const right = () => {
    if (!playing || !running || !r) return;
    const said = r.said + 1;
    if (said >= r.bid) {
      sounds.right();
      setRunning(false);
      const time = Math.max(0, left);
      setGame((g) => (g.round ? finish({ ...g, round: { ...g.round, said } }, 'made', time) : g));
    } else {
      sounds.reveal();
      update((x) => ({ ...x, said }));
    }
  };
  const pause = () => {
    if (!playing) return;
    if (running) {
      update((x) => x);
      setRunning(false);
    } else startClock();
  };
  const giveUp = () => {
    if (!playing) return;
    setRunning(false);
    sounds.wrong();
    const time = Math.max(0, left);
    setGame((g) => finish(g, 'giveup', time));
  };

  // --- next theme ---
  const next = () => {
    if (r?.phase !== 'done') return;
    if (someoneWon(game) || themesLeft(game, total) <= 0) {
      setGame((g) => ({ ...g, round: null, over: true }));
      setRanking('celebrate');
    } else setGame((g) => dealRound(g, total));
  };
  const safeUndo = () => {
    setRunning(false);
    undo();
  };

  useKeys({
    ArrowUp: r?.phase === 'auction' && (() => step(1)),
    ArrowDown: r?.phase === 'auction' && (() => step(-1)),
    l: r?.phase === 'auction' && pass,
    Enter: game.over
      ? () => setRanking('celebrate')
      : r?.phase === 'auction'
        ? offer
        : r?.phase === 'sold'
          ? via
          : r?.phase === 'run'
            ? right
            : r?.phase === 'done'
              ? next
              : undefined,
    ' ': playing && pause,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const theme = r ? data.temi[r.theme] : '';
  const lastTheme = themesLeft(game, total) <= 0;
  const ends = someoneWon(game) || lastTheme;

  return (
    <div className="board-page as-page">
      <PlayHeader
        title={data.title}
        undo={safeUndo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/asta/${slug}/setup`)}
      >
        {!game.over && r && (
          <span className="pill" key={`${r.theme}-${r.phase === 'auction' ? 'a' : 'b'}`} style={holder && r.phase !== 'auction' ? { color: holder.color } : undefined}>
            {r.phase === 'auction' || !holder ? `Tema ${game.dealt} · vince chi arriva a ${game.toWin}` : `${holder.name} · ${r.bid} ${r.bid === 1 ? 'risposta' : 'risposte'}`}
          </span>
        )}
      </PlayHeader>

      <div className={`game-stage ${playing ? 'as-run' : ''}`}>
        {game.over || !r ? (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale <kbd>Invio</kbd></button>
        ) : (
          <>
            <div className="as-theme" key={r.theme}>
              <span className="as-tag">Il tema</span>
              <h2>{theme}</h2>
            </div>

            {r.phase === 'auction' && turn && (
              <>
                <div className="as-bid">
                  <button className="as-step" onClick={() => step(-1)} disabled={draft <= r.bid + 1} title="Offerta più bassa (↓)">
                    −<kbd>↓</kbd>
                  </button>
                  <div className="as-bid-box" style={{ '--team': turn.color } as CSSProperties}>
                    <small>{turn.name} offre…</small>
                    <b key={draft}>{draft}</b>
                    <span>
                      {holder ? (
                        <>
                          Offerta più alta: <em>{r.bid}</em> di <em>{holder.name}</em>
                        </>
                      ) : (
                        <>
                          Apre <em>{turn.name}</em>: deve fare un'offerta
                        </>
                      )}
                    </span>
                  </div>
                  <button className="as-step" onClick={() => step(1)} disabled={draft >= MAX_BID} title="Offerta più alta (↑)">
                    +<kbd>↑</kbd>
                  </button>
                </div>
                <div className="host-bar">
                  <button className="btn primary big" onClick={offer}>🙋 Offrono {draft} <kbd>Invio</kbd></button>
                  <button className="btn big" onClick={pass} disabled={!r.holder} title={r.holder ? undefined : 'Chi apre deve fare un\'offerta'}>
                    🏳️ Lasciano <kbd>L</kbd>
                  </button>
                  {!lastTheme && <button className="btn ghost" onClick={skip}>🔀 Cambia tema</button>}
                </div>
                <p className="host-hint">
                  Host: <b>↑ ↓</b> per la cifra che dicono, <b>Invio</b> per confermarla, <b>L</b> se lasciano. L'asta finisce quando gli altri hanno
                  lasciato tutti.
                </p>
              </>
            )}

            {r.phase === 'sold' && holder && (
              <>
                <div className="as-bid">
                  <div className="as-bid-box sold" style={{ '--team': holder.color } as CSSProperties}>
                    <small>🔨 Aggiudicato a {holder.name}</small>
                    <b>{r.bid}</b>
                    <span>{prev ? <>Se non ce la fanno, 1 punto a <em>{prev.name}</em></> : 'Nessuno ha rilanciato: se non ce la fanno, nessun punto'}</span>
                  </div>
                </div>
                <div className="host-bar">
                  <button className="btn primary big" onClick={via}>▶ Via! Parte il tempo ({game.seconds}s) <kbd>Invio</kbd></button>
                </div>
                <p className="host-hint">Quando {holder.name} è pronta. Poi l'host preme <b>Invio</b> per ogni risposta giusta.</p>
              </>
            )}

            {r.phase === 'run' && holder && (
              <>
                <div className="as-banner" style={{ '--team': holder.color } as CSSProperties}>Tocca a {holder.name}</div>
                <div className={`as-big ${running ? '' : 'paused'}`}>
                  <div className={`as-panel as-clock ${running && left <= 10000 ? 'hurry' : ''}`}>
                    <small>Tempo</small>
                    <b>{fmt(left)}</b>
                  </div>
                  <div className="as-panel as-count">
                    <small>Risposte</small>
                    <b>
                      <span key={r.said} className="n">{r.said}</span>
                      <i> / {r.bid}</i>
                    </b>
                    <div className="as-pips">
                      {Array.from({ length: r.bid }, (_, i) => (
                        <span key={i} className={i < r.said ? 'on' : ''} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="host-bar">
                  <button className="btn ok big" onClick={right} disabled={!running}>✓ Giusta <kbd>Invio</kbd></button>
                  <button className={`btn ${running ? '' : 'primary'}`} onClick={pause}>{running ? '⏸ Pausa' : '▶ Riprendi'} <kbd>Spazio</kbd></button>
                  <button className="btn ko" onClick={giveUp}>🏳️ Si arrendono</button>
                </div>
                <p className="host-hint">Ripetute o non valide: non premete niente. Un clic di troppo si toglie con <b>Annulla</b> (Ctrl+Z).</p>
              </>
            )}

            {r.phase === 'done' && holder && (
              <div className="as-done">
                {r.end === 'made' ? (
                  <>
                    <h2>🎉 {holder.name} ce l'ha fatta!</h2>
                    <p>
                      {r.bid} {r.bid === 1 ? 'risposta' : 'risposte'} su {r.bid}, con <b>{Math.ceil(r.timeLeft / 1000)} secondi</b> di anticipo.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>{r.end === 'giveup' ? '🏳️ Si sono arresi' : '⏱ Tempo scaduto'}</h2>
                    <p>
                      {holder.name}: <b>{r.said} su {r.bid}</b>.
                    </p>
                  </>
                )}
                <div className="as-point" style={{ color: byId(r.scored)?.color ?? 'var(--muted)' }}>
                  {byId(r.scored) ? `+1 punto a ${byId(r.scored)!.name}` : 'Nessun punto'}
                </div>
                {r.end !== 'made' && (
                  <p className="muted">{prev ? `Il punto va a chi aveva fatto l'offerta prima di ${holder.name}.` : `Nessuno aveva rilanciato sull'offerta di ${holder.name}.`}</p>
                )}
                <button className="btn primary big" onClick={next}>
                  {ends ? '🏆 Classifica finale' : 'Prossimo tema'} <kbd>Invio</kbd>
                </button>
              </div>
            )}
          </>
        )}

        <div className="team-strip">
          {game.teams.map((t) => {
            const isOut = r?.phase === 'auction' && r.out.includes(t.id);
            const onTurn = r?.phase === 'auction' && turn?.id === t.id;
            const playing = !!r && r.phase !== 'auction' && r.holder === t.id;
            return (
              <div key={t.id} className={`team-chip ${onTurn || playing ? 'on' : ''} ${isOut ? 'off' : ''}`} style={{ borderLeftColor: t.color }}>
                {t.name}
                {onTurn && <span className="as-state turn">tocca a voi</span>}
                {r?.phase === 'auction' && r.holder === t.id && <span className="as-state top">{r.bid}</span>}
                {isOut && <span className="as-state">ha lasciato</span>}
                {r?.phase === 'done' && r.scored === t.id && <span className="as-state plus">+1</span>}
                <span className="score">
                  <AnimatedNumber value={scoreOf(game, t)} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
