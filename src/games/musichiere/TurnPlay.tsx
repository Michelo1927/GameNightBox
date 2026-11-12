import { useEffect, useRef, useState } from 'react';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { useQuietMusic } from '../../hub/music';
import { youtubeId } from '../../hub/media';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import type { Team } from '../../hub/teams';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import { usePlayer } from './player';
import type { Playlist } from './schema';
import { closeRun, isOpen, leaveTurn, nextOpen, runDone, scoreOf, useMusichiere, withRuns, type MGame, type TPhase, type TurnRun } from './state';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Boxes per column in a team's tower: a longer list goes on two columns. */
const ROWS = 10;

/** "A turno": each team plays its own list against its own clock; a song passed comes back after the end of the list. */
export default function TurnPlay({ loaded }: { loaded: Loaded<Playlist> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = useMusichiere(slug);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);
  const [running, setRunning] = useState(false);
  const since = useRef(0);
  const [, tick] = useState(0);
  const p = usePlayer();
  useQuietMusic(); // the songs to guess are the music here

  // Every team gets its list when the game starts (or a team is added later).
  useEffect(() => {
    if (game.teams.some((t) => !game.runs[t.id])) setGame((g) => withRuns(g, data.songs.length));
  }, [game.teams, game.runs, setGame, data.songs.length]);

  const team = game.teams[game.current];
  const run = team ? game.runs[team.id] : undefined;
  const songIndex = run?.songs[run.pos];
  const song = songIndex === undefined ? undefined : data.songs[songIndex];
  const phase = game.phase;
  const left = run ? run.timeLeft - (running ? Date.now() - since.current : 0) : 0;
  const mark = run?.marks[run.pos];

  // The team's song is loaded (paused) when the turn or the song changes.
  const cued = useRef('');
  useEffect(() => {
    if (!p.ready || !song || game.over) return;
    const key = `${game.current}:${run?.pos}:${song.youtube}`;
    if (cued.current === key) return;
    cued.current = key;
    p.cue(youtubeId(song.youtube) ?? '', song.start ?? 0);
  }, [p, song, game.current, run?.pos, game.over]);

  // The final ranking opens by itself when the last song is done.
  const wasOver = useRef(game.over);
  useEffect(() => {
    if (game.over && !wasOver.current) {
      p.pause();
      setRanking('celebrate');
    }
    wasOver.current = game.over;
  }, [game.over, p]);

  /** Changes the playing team's list, saving the time used so far; `then` changes the rest of the game. */
  function save(fn: (r: TurnRun) => TurnRun, next: TPhase, then?: (g: MGame) => MGame) {
    if (!team) return;
    const used = running ? Date.now() - since.current : 0;
    since.current = Date.now();
    setGame((g) => {
      const r = g.runs[team.id];
      if (!r) return g;
      const timed = { ...r, timeLeft: Math.max(0, r.timeLeft - used) };
      const changed: MGame = { ...g, started: true, phase: next, runs: { ...g.runs, [team.id]: fn(timed) } };
      return then ? then(changed) : changed;
    });
  }
  const startClock = () => {
    since.current = Date.now();
    setRunning(true);
  };
  const stopClock = (next: TPhase) => {
    save((r) => r, next);
    setRunning(false);
  };

  // The clock: redraws while running, ticks in the last 5 seconds and closes the team's list at zero.
  // The interval lives as long as the clock runs (the player redraws the page every 200 ms, which would keep resetting
  // a per-render interval before it fires); each tick reads the latest state through the ref.
  const onTick = useRef(() => {});
  onTick.current = () => {
    tick((n) => n + 1);
    const now = (run?.timeLeft ?? 0) - (Date.now() - since.current);
    if (now <= 5000 && now > 0 && Math.floor(now / 1000) !== Math.floor((now + 250) / 1000)) sounds.tick();
    if (now <= 0) {
      setRunning(false);
      sounds.timeUp();
      save(closeRun, 'timeup');
    }
  };
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => onTick.current(), 250);
    return () => clearInterval(t);
  }, [running]);

  /** Starts the song and the team's clock (also after a pause). */
  const via = () => {
    if (!run || !song || !p.ready) return;
    if (phase !== 'play') save((r) => r, 'play');
    p.play();
    startClock();
  };
  const pause = () => {
    p.pause();
    stopClock('play');
  };
  const again = () => {
    p.seek(song?.start ?? 0);
    p.play();
    if (!running) startClock();
  };
  const toggleMusic = () => (p.playing ? p.pause() : p.play());
  /** Shows the title to check the answer: the clock stops, the team can't pass any more. */
  const peek = () => {
    sounds.reveal();
    stopClock('judge');
  };
  const judge = (ok: boolean) => {
    if (!run) return;
    if (ok) sounds.right();
    else sounds.wrong();
    save((r) => ({ ...r, marks: { ...r.marks, [r.pos]: ok ? 'right' : 'wrong' } }), 'shown');
    setRunning(false);
    if (!p.playing) p.play();
  };
  /** The song waits for the next round; the turn goes to the next team. */
  const pass = () => {
    if (!run) return;
    p.pause();
    sounds.tick();
    save((r) => ({ ...r, marks: { ...r.marks, [r.pos]: 'pass' } }), 'ready', leaveTurn);
    setRunning(false);
  };
  /** The video won't play: the team moves on to its next song, without losing time or the turn. */
  const skip = () => {
    if (!run || !team) return;
    p.pause();
    save(
      (r) => {
        const marked = { ...r, marks: { ...r.marks, [r.pos]: 'skip' as const } };
        const next = nextOpen(marked, r.pos);
        return next >= 0 ? { ...marked, pos: next } : marked;
      },
      'ready',
      (g) => (runDone(g.runs[team.id]) ? leaveTurn(g) : g),
    );
    setRunning(false);
  };
  const next = () => {
    p.pause();
    setGame((g) => leaveTurn(g));
  };
  const safeUndo = () => {
    setRunning(false);
    p.pause();
    undo();
  };

  const active = !game.over && !!run;
  const judging = phase === 'play' || phase === 'judge';
  useKeys({
    ' ': active && (phase === 'ready' ? via : phase === 'play' ? (running ? pause : via) : toggleMusic),
    Enter: active && (phase === 'ready' ? via : judging ? () => judge(true) : next),
    x: active && judging && (() => judge(false)),
    p: active && phase === 'play' && pass,
    s: active && phase === 'play' && peek,
    r: active && phase === 'play' && again,
  });

  // After the answer: who plays next (or the end).
  const after = phase === 'shown' || phase === 'timeup' ? leaveTurn(game) : null;
  const nextLabel = !after || after.over ? 'Classifica finale' : after.current === game.current ? 'Prossima canzone' : `Tocca a ${after.teams[after.current]?.name}`;
  const runs = Object.values(game.runs);
  const total = runs.reduce((n, r) => n + r.songs.length, 0);
  const played = runs.reduce((n, r) => n + r.songs.filter((_, k) => !isOpen(r.marks[k])).length, 0);

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const half = Math.ceil(game.teams.length / 2);
  const tower = (t: Team) => {
    const r = game.runs[t.id];
    const on = t.id === team?.id && !game.over;
    const n = r?.songs.length ?? 0;
    const state = game.over ? '' : on ? 'on' : runDone(r) ? 'off' : 'wait';
    return (
      <div key={t.id} className={`mu-col mu-turn ${state}`} style={{ ['--team' as string]: t.color }}>
        <div className="mu-name">{t.name}</div>
        <div className={`mu-clock ${on && running && left <= 10000 ? 'hurry' : ''}`}>{fmt(on ? left : (r?.timeLeft ?? game.seconds * 1000))}</div>
        <div className={`mu-slots mu-list ${n > ROWS ? 'wide' : ''}`} style={{ ['--rows' as string]: Math.min(n, ROWS) }}>
          {r?.songs.map((_, k) => {
            const m = r.marks[k];
            const cur = on && k === r.pos && (phase === 'ready' || judging);
            const label = cur ? k + 1 : m === 'right' ? '✓' : m === 'wrong' ? '✗' : m === 'pass' ? 'pass' : m === 'skip' ? '–' : k + 1;
            return (
              <span key={k} className={`mu-slot ${cur ? 'cur' : (m ?? '')}`}>
                {label}
              </span>
            );
          })}
        </div>
        <div className="mu-score"><AnimatedNumber value={scoreOf(game, t)} /></div>
      </div>
    );
  };

  return (
    <div className="board-page mu-page">
      <PlayHeader
        title={data.title}
        undo={safeUndo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/musichiere/${slug}/setup`)}
      >
        <span className="pill">A turno · {played} di {total} canzoni</span>
      </PlayHeader>
      <div ref={p.host} className="yt-hidden" aria-hidden />

      <div className="game-stage">
        <div className="mu-board">
          <div className="mu-side">{game.teams.slice(0, half).map(tower)}</div>

          <div className="mu-center">
            {game.over ? (
              <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale</button>
            ) : !team || !run ? null : phase === 'shown' || phase === 'timeup' ? (
              <>
                {phase === 'timeup' ? (
                  <div className="buzzed" style={{ background: team.color }}>⏰ Tempo scaduto!</div>
                ) : (
                  <div className={`mu-verdict ${mark}`}>{mark === 'right' ? '✓ Giusta!' : '✗ Sbagliata'}</div>
                )}
                {song && (
                  <div className="mu-reveal">
                    <div className="mu-title">{song.title}</div>
                    <div className="mu-artist">
                      {song.artist}
                      {song.year ? ` · ${song.year}` : ''}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="buzzed" key={game.current} style={{ background: team.color }}>Tocca a {team.name}</div>
                {phase === 'judge' && song ? (
                  <div className="mu-reveal">
                    <div className="mu-title">{song.title}</div>
                    <div className="mu-artist">
                      {song.artist}
                      {song.year ? ` · ${song.year}` : ''}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`mu-disc ${p.playing ? 'on' : ''}`} aria-hidden>
                      <div className="mu-label">{run.pos + 1}</div>
                    </div>
                    <div className="mu-sub">
                      Canzone {run.pos + 1} di {run.songs.length}
                      {mark === 'pass' ? ' · era passata' : ''}
                    </div>
                  </>
                )}
              </>
            )}
            {p.error && active && phase !== 'shown' && phase !== 'timeup' && (
              <p className="cr-error">
                ⚠️ Questo video non parte: {p.error}. Premi <b>Salta</b>: la squadra passa alla sua prossima canzone senza perdere tempo.
              </p>
            )}
            {!p.ready && <p className="muted">Carico il lettore YouTube…</p>}
          </div>

          <div className="mu-side">{game.teams.slice(half).map(tower)}</div>
        </div>

        {active && (
          <div className="host-bar">
            {phase === 'ready' ? (
              <button className="btn primary" onClick={via} disabled={!p.ready}>▶ Via <kbd>Spazio</kbd></button>
            ) : judging ? (
              <>
                <button className="btn ok" onClick={() => judge(true)}>✓ Giusta <kbd>Invio</kbd></button>
                <button className="btn ko" onClick={() => judge(false)}>✗ Sbagliata <kbd>X</kbd></button>
                {phase === 'play' ? (
                  <>
                    <button className="btn primary" onClick={pass}>Passa <kbd>P</kbd></button>
                    <button className="btn" onClick={running ? pause : via}>{running ? '⏸ Pausa' : '▶ Riprendi'} <kbd>Spazio</kbd></button>
                    <button className="btn" onClick={again}>↺ Da capo <kbd>R</kbd></button>
                    <button className="btn ghost" onClick={peek} title="Mostra titolo e artista per controllare la risposta">👁 Svela <kbd>S</kbd></button>
                  </>
                ) : (
                  <button className="btn" onClick={toggleMusic}>{p.playing ? '⏸ Ferma la musica' : '▶ Ascolta'} <kbd>Spazio</kbd></button>
                )}
              </>
            ) : (
              <>
                <button className="btn" onClick={toggleMusic}>{p.playing ? '⏸ Ferma la musica' : '▶ Ascolta'} <kbd>Spazio</kbd></button>
                <button className="btn primary" onClick={next}>{nextLabel} <kbd>Invio</kbd></button>
              </>
            )}
            {p.error && (phase === 'ready' || phase === 'play') && (
              <button className="btn ghost" onClick={skip}>⏭ Salta</button>
            )}
          </div>
        )}
        {active && team && (
          <p className="muted mu-help">
            {phase === 'ready'
              ? `Quando ${team.name} è pronta premi Via: partono la canzone e il suo cronometro.`
              : phase === 'play'
                ? running
                  ? `La canzone va avanti finché ${team.name} non risponde. Svela mostra il titolo e ferma il cronometro, per controllare la risposta.`
                  : 'In pausa: anche il cronometro è fermo.'
                : phase === 'judge'
                  ? 'Cronometro fermo. La risposta era giusta o sbagliata?'
                  : `Il cronometro di ${team.name} è fermo: la musica può andare avanti quanto volete.`}
          </p>
        )}
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
