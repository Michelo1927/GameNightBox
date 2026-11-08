import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import { LETTERS, type Passaparola } from './schema';
import { nextOpen, rights, usePassaparola, withRuns, wrongs, type Mark, type PGame, type Run } from './state';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Play({ loaded }: { loaded: Loaded<Passaparola> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = usePassaparola(slug);
  const [running, setRunning] = useState(false);
  const since = useRef(0);
  const [, tick] = useState(0);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);

  // Every team gets its wheel when the game starts (or a team is added later).
  useEffect(() => {
    if (game.teams.some((t) => !game.runs[t.id])) setGame((g) => withRuns(g));
  }, [game.teams, game.runs, setGame]);

  const team = game.teams[game.current];
  const run = team ? game.runs[team.id] : undefined;
  const ruota = run ? data.ruote[run.ruota] : undefined;
  const item = run && ruota ? ruota.items[run.pos] : undefined;
  const left = run ? run.timeLeft - (running ? Date.now() - since.current : 0) : 0;

  // The clock: redraws while running and ends the team's go at zero.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      const now = (run?.timeLeft ?? 0) - (Date.now() - since.current);
      if (now <= 5000 && now > 0 && Math.floor(now / 1000) !== Math.floor((now + 250) / 1000)) sounds.tick();
      if (now <= 0) {
        setRunning(false);
        sounds.timeUp();
        update((r) => ({ ...r, timeLeft: 0 }), 'teamDone');
      }
    }, 250);
    return () => clearInterval(t);
  });

  /** Changes the current team's run, saving the time used so far. */
  function update(fn: (r: Run) => Run, phase: PGame['phase']) {
    if (!team) return;
    const used = running ? Date.now() - since.current : 0;
    since.current = Date.now();
    setGame((g) => {
      const r = g.runs[team.id];
      if (!r) return g;
      const timed = { ...r, timeLeft: Math.max(0, r.timeLeft - used) };
      return { ...g, started: true, phase, runs: { ...g.runs, [team.id]: fn(timed) } };
    });
  }

  const startClock = () => {
    since.current = Date.now();
    setRunning(true);
  };
  const stopClock = (phase: PGame['phase']) => {
    update((r) => r, phase);
    setRunning(false);
  };

  const via = () => {
    if (!run) return;
    update((r) => ({ ...r, pos: nextOpen(r, r.pos, false) }), 'play');
    startClock();
  };
  const reveal = () => {
    sounds.reveal();
    stopClock('revealed');
  };
  /** Marks the letter on screen and moves on (or waits on the answer after a mistake). */
  const mark = (m: Mark) => {
    if (!run) return;
    const letter = LETTERS[run.pos];
    const marked = { ...run, marks: { ...run.marks, [letter]: m } };
    const next = nextOpen(marked, run.pos);
    if (m === 'right') {
      sounds.right();
      if (next < 0) {
        update((r) => ({ ...r, marks: marked.marks }), 'teamDone');
        setRunning(false);
      } else {
        update((r) => ({ ...r, marks: marked.marks, pos: next }), 'play');
        if (!running) startClock();
      }
    } else {
      sounds.wrong();
      update((r) => ({ ...r, marks: marked.marks }), 'wrong');
      setRunning(false);
    }
  };
  const afterWrong = () => {
    if (!run) return;
    const next = nextOpen(run, run.pos);
    if (next < 0) return update((r) => r, 'teamDone');
    update((r) => ({ ...r, pos: next }), 'play');
    startClock();
  };
  const pass = () => {
    if (!run) return;
    const next = nextOpen(run, run.pos);
    if (next >= 0) update((r) => ({ ...r, pos: next }), 'play');
  };
  const pause = () => (running ? stopClock('play') : startClock());
  const nextTeam = () => {
    setRunning(false);
    if (game.current + 1 >= game.teams.length) {
      setGame((g) => ({ ...g, over: true }));
      setRanking('celebrate');
    } else setGame((g) => ({ ...g, current: g.current + 1, phase: 'intro' }));
  };
  /** Host correction: clicking a letter of the wheel on screen cycles none → right → wrong. */
  const cycle = (letter: string) => {
    if (!team) return;
    setGame((g) => {
      const r = g.runs[team.id];
      if (!r) return g;
      const marks = { ...r.marks };
      const now = marks[letter];
      if (!now) marks[letter] = 'right';
      else if (now === 'right') marks[letter] = 'wrong';
      else delete marks[letter];
      return { ...g, runs: { ...g.runs, [team.id]: { ...r, marks } } };
    });
  };
  const safeUndo = () => {
    setRunning(false);
    undo();
  };

  const phase = game.over ? 'over' : game.phase;
  const paused = phase === 'play' && !running;
  useKeys({
    ' ': phase === 'intro' ? via : phase === 'play' ? (paused ? startClock : reveal) : phase === 'wrong' ? afterWrong : undefined,
    Enter: phase === 'intro' ? via : phase === 'play' || phase === 'revealed' ? () => mark('right') : phase === 'wrong' ? afterWrong : phase === 'teamDone' ? nextTeam : undefined,
    x: (phase === 'play' || phase === 'revealed') && (() => mark('wrong')),
    p: phase === 'play' && !paused && pass,
    Escape: phase === 'play' && pause,
  });

  const scores = game.teams.map((t) => ({ ...t, score: rights(game.runs[t.id]) + t.adjust }));

  return (
    <div className="board-page pp-page">
      <PlayHeader
        back="#/passaparola"
        title={data.title}
        undo={safeUndo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/passaparola/${slug}/setup`)}
      >
        {team && !game.over && (
          <span className="pill" style={{ color: team.color }}>
            {team.name} ({game.current + 1} di {game.teams.length})
          </span>
        )}
      </PlayHeader>

      <div className="game-stage">
        {run && ruota && team ? (
          <div className="pp-arena" style={{ ['--team' as string]: team.color } as CSSProperties}>
          <div className="pp-wheel">
            {LETTERS.map((l, i) => {
              const a = (i / LETTERS.length) * 2 * Math.PI - Math.PI / 2;
              const m = run.marks[l];
              const on = i === run.pos && (phase === 'play' || phase === 'revealed' || phase === 'wrong');
              return (
                <button
                  key={l}
                  className={`pp-letter ${m ?? ''} ${on ? 'on' : ''}`}
                  style={{ left: `${50 + 45 * Math.cos(a)}%`, top: `${50 + 45 * Math.sin(a)}%` }}
                  onClick={() => cycle(l)}
                  title="Correggi: nessuna → giusta → sbagliata"
                >
                  {l}
                </button>
              );
            })}
            <div className="pp-center">
              {phase === 'intro' && (
                <>
                  <div className="pp-team" style={{ color: team.color }}>{team.name}</div>
                  <p className="muted">
                    {LETTERS.length} lettere · {fmt(run.timeLeft)} di tempo
                  </p>
                  <button className="btn primary big" onClick={via}>
                    Via! <kbd>Spazio</kbd>
                  </button>
                </>
              )}
              {item && (phase === 'play' || phase === 'revealed' || phase === 'wrong') && (
                <>
                  <div className="pp-kind">
                    {item.type === 'inizia' ? 'Inizia con la' : 'Contiene la'} <b>{item.letter}</b>
                  </div>
                  <p className="pp-question">{item.question}</p>
                  {(phase === 'revealed' || phase === 'wrong') && (
                    <div className={`pp-answer ${phase === 'wrong' ? 'ko' : ''}`}>
                      {item.answer}
                      {item.accept?.length ? <small> (anche: {item.accept.join(', ')})</small> : null}
                    </div>
                  )}
                  {paused && <div className="pp-paused">⏸ In pausa</div>}
                </>
              )}
              {phase === 'teamDone' && (
                <>
                  <div className="pp-team" style={{ color: team.color }}>{team.name}</div>
                  <p className="pp-summary">
                    <span className="flash-ok">{rights(run)} giuste</span> · <span className="flash-ko">{wrongs(run)} sbagliate</span>
                    {run.timeLeft <= 0 && ' · tempo scaduto'}
                  </p>
                  <button className="btn primary big" onClick={nextTeam}>
                    {game.current + 1 < game.teams.length ? 'Prossima squadra' : 'Classifica finale'} <kbd>Invio</kbd>
                  </button>
                </>
              )}
              {phase === 'over' && (
                <button className="btn primary big" onClick={() => setRanking('celebrate')}>
                  🏆 Classifica finale
                </button>
              )}
            </div>
          </div>
          <div className="pp-dial">
            <div className="pp-dial-team">{team.name}</div>
            <div className="pp-count">
              <b>{rights(run)}</b>
              <small>giuste</small>
            </div>
            <div className={`pp-time ${running && left <= 10000 ? 'hurry' : ''}`}>
              <b>{fmt(left)}</b>
              <small>{paused && phase === 'play' ? 'in pausa' : running ? 'tempo' : 'tempo fermo'}</small>
            </div>
          </div>
          </div>
        ) : (
          <p className="muted">Servono più ruote per tutte le squadre: aprine meno dalle opzioni.</p>
        )}

        {(phase === 'play' || phase === 'revealed' || phase === 'wrong') && (
          <div className="host-bar">
            {phase === 'play' && (
              <button className="btn" onClick={paused ? startClock : reveal}>
                {paused ? '▶ Riprendi' : '👁 Svela'} <kbd>Spazio</kbd>
              </button>
            )}
            {phase !== 'wrong' && (
              <>
                <button className="btn ok" onClick={() => mark('right')}>✓ Giusta <kbd>Invio</kbd></button>
                <button className="btn ko" onClick={() => mark('wrong')}>✗ Sbagliata <kbd>X</kbd></button>
              </>
            )}
            {phase === 'play' && (
              <button className="btn primary" onClick={pass} disabled={paused}>
                Passaparola <kbd>P</kbd>
              </button>
            )}
            {phase === 'play' && !paused && (
              <button className="btn ghost" onClick={pause}>⏸ Pausa <kbd>Esc</kbd></button>
            )}
            {phase === 'wrong' && (
              <button className="btn primary" onClick={afterWrong}>Avanti <kbd>Invio</kbd></button>
            )}
          </div>
        )}

        <div className="team-strip">
          {game.teams.map((t, i) => {
            const r = game.runs[t.id];
            const done = i < game.current || game.over;
            return (
              <div key={t.id} className={`team-chip ${i === game.current && !game.over ? 'on' : ''} ${i > game.current && !game.over ? 'off' : ''}`} style={{ borderLeftColor: t.color }}>
                {t.name}
                <span className="score">{rights(r) + t.adjust}</span>
                <span className="muted">{done ? `${wrongs(r)} ✗` : fmt(i === game.current ? left : (r?.timeLeft ?? game.seconds * 1000))}</span>
              </div>
            );
          })}
        </div>
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
