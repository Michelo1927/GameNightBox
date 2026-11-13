import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import type { SbagliatoSet } from './schema';
import { deal, newRun, scoreOf, trueOnLeft, useSbagliato, type Run, type SGame } from './state';
import { KEY, tr } from '../../hub/i18n';

type Flash = { ok: boolean; text: string } | null;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Play({ loaded }: { loaded: Loaded<SbagliatoSet> }) {
  const { slug, data } = loaded;
  const total = data.domande.length;
  const { game, setGame, undo, canUndo } = useSbagliato(slug, total);
  const [running, setRunning] = useState(false);
  const since = useRef(0);
  // When the question on screen appeared: drives the host's "too slow" bar.
  const askedAt = useRef(Date.now());
  const [, tick] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);

  const team = game.teams[game.current];
  const run = team ? game.runs[team.id] : undefined;
  // The team's own list, from the first question: a slip sends it back there.
  const qIndex = run?.list[run.step];
  const q = qIndex !== undefined ? data.domande[qIndex] : undefined;
  const leftTrue = trueOnLeft(run?.step ?? 0, qIndex ?? 0);
  const left = run ? run.timeLeft - (running ? Date.now() - since.current : 0) : game.seconds * 1000;
  const playing = game.phase === 'play' && !!run && !run.end;
  const lastTeam = game.current + 1 >= game.teams.length;

  const say = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash((now) => (now === f ? null : now)), 1800);
  };

  /** Changes the current team's go, saving the time used so far. */
  function update(fn: (r: Run) => Run, phase: SGame['phase']) {
    if (!team) return;
    const used = running ? Date.now() - since.current : 0;
    since.current = Date.now();
    askedAt.current = Date.now();
    setGame((g) => {
      const r = g.runs[team.id];
      if (!r) return g;
      const timed = { ...r, timeLeft: Math.max(0, r.timeLeft - used) };
      return { ...g, started: true, phase, runs: { ...g.runs, [team.id]: fn(timed) } };
    });
  }

  // The clock: redraws while running (also the "too slow" bar) and ends the go at zero.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      const now = (run?.timeLeft ?? 0) - (Date.now() - since.current);
      if (now <= 5000 && now > 0 && Math.floor(now / 1000) !== Math.floor((now + 100) / 1000)) sounds.tick();
      if (now <= 0) {
        setRunning(false);
        sounds.timeUp();
        update((r) => ({ ...r, timeLeft: 0, end: 'timeout' }), 'teamDone');
      }
    }, 100);
    return () => clearInterval(t);
  });

  const startClock = () => {
    since.current = Date.now();
    askedAt.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    if (running) {
      update((r) => r, 'play');
      setRunning(false);
    } else startClock();
  };

  const via = () => {
    if (!team) return;
    setGame((g) => {
      const r = g.runs[team.id];
      // A go that never really started takes the current options (they may have changed in the setup).
      if (r && (r.asked || r.end)) return { ...g, phase: 'play' };
      // The team's questions come off the shared deck only once: a go restarted from the intro keeps them.
      const dealt = r?.list.length === g.steps ? { g, list: r.list } : deal(g, total);
      return { ...dealt.g, started: true, phase: 'play', runs: { ...g.runs, [team.id]: newRun(g.seconds, dealt.list) } };
    });
    startClock();
  };

  /** The host pressed the answer the team said. */
  const answer = (saidTrue: boolean) => {
    if (!playing || !running || !run || !q) return;
    if (saidTrue) return slip(tr(`Era vera: ${q.answer}! Si riparte dalla prima`, `That was true: ${q.answer}! Back to the first`));
    const step = run.step + 1;
    if (step >= game.steps) {
      sounds.right();
      setRunning(false);
      update((r) => ({ ...r, step, best: Math.max(r.best, step), asked: r.asked + 1, end: 'finished' }), 'teamDone');
    } else {
      sounds.reveal();
      update((r) => ({ ...r, step, best: Math.max(r.best, step), asked: r.asked + 1 }), 'play');
    }
  };
  const slip = (text: string) => {
    if (!playing || !run) return;
    sounds.wrong();
    say({ ok: false, text });
    update((r) => ({ ...r, step: 0, asked: r.asked + 1, slips: r.slips + 1 }), 'play');
  };
  const slow = () => running && slip(tr('Troppo lento! Si riparte dalla prima', 'Too slow! Back to the first'));

  const nextTeam = () => {
    setRunning(false);
    if (lastTeam) {
      setGame((g) => ({ ...g, over: true }));
      setRanking('celebrate');
    } else setGame((g) => ({ ...g, current: g.current + 1, phase: 'intro' }));
  };
  const safeUndo = () => {
    setRunning(false);
    undo();
  };

  useKeys({
    ArrowLeft: playing && running && (() => answer(leftTrue)),
    ArrowRight: playing && running && (() => answer(!leftTrue)),
    x: playing && running && slow,
    ' ': playing && pause,
    Enter: game.over ? () => setRanking('celebrate') : game.phase === 'intro' ? via : game.phase === 'teamDone' ? nextTeam : undefined,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const hintFrac = playing && running && game.hint ? Math.min(1, (Date.now() - askedAt.current) / (game.hint * 1000)) : 0;
  const options = q ? (leftTrue ? [q.answer, q.other] : [q.other, q.answer]) : [];

  return (
    <div className="board-page sb-page">
      <PlayHeader
        title={data.title}
        undo={safeUndo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/sbagliato/${slug}/setup`)}
      >
        {team && !game.over && (
          <span className="pill" key={team.id} style={{ color: team.color }}>
            {tr(`Tocca a ${team.name} · ${game.current + 1} di ${game.teams.length}`, `${team.name}'s turn · ${game.current + 1} of ${game.teams.length}`)}
          </span>
        )}
      </PlayHeader>

      <div className="game-stage">
        {game.over ? (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 {tr('Classifica finale', 'Final scores')} <kbd>{KEY.enter}</kbd></button>
        ) : game.phase === 'intro' && team ? (
          <div className="sb-intro" key={team.id}>
            <div className="sb-tag">{tr('Tocca a', 'Your turn')}</div>
            <h2 style={{ color: team.color }}>{team.name}</h2>
            {tr(
              <>
                <ol>
                  <li>Arrivano domande a raffica, ognuna con due risposte: <b>dite quella SBAGLIATA</b>.</li>
                  <li>
                    Avete <b>{game.steps} domande</b> da sbagliare tutte di fila in {fmt(game.seconds * 1000)}.
                  </li>
                  <li>Se dite la risposta vera, o ci mettete troppo, si riparte <b>dalla prima domanda</b>: sono sempre le stesse, nello stesso ordine. Il tempo intanto continua a scorrere.</li>
                </ol>
                <p className="muted">Host: premete ← o → per la risposta che dicono, X se sono troppo lenti, Spazio per la pausa.</p>
              </>,
              <>
                <ol>
                  <li>Questions come in a rapid-fire stream, each with two answers: <b>say the WRONG one</b>.</li>
                  <li>
                    You have <b>{game.steps} questions</b> to get all wrong in a row in {fmt(game.seconds * 1000)}.
                  </li>
                  <li>If you say the true answer, or take too long, you start again <b>from the first question</b>: they're always the same, in the same order. Meanwhile the clock keeps running.</li>
                </ol>
                <p className="muted">Host: press ← or → for the answer they say, X if they're too slow, Space to pause.</p>
              </>,
            )}
            <button className="btn primary big" onClick={via}>{tr('Via!', 'Go!')} <kbd>{KEY.enter}</kbd></button>
          </div>
        ) : run ? (
          <>
            <div className="sb-top">
              <div className={`sb-clock ${running && left <= 10000 ? 'hurry' : ''}`}>{fmt(left)}</div>
              <div className={`sb-path${game.steps > 12 ? ' long' : ''}`} style={{ ['--steps' as string]: game.steps, ['--half' as string]: Math.ceil(game.steps / 2) } as CSSProperties}>
                {Array.from({ length: game.steps }, (_, i) => (
                  <span key={i} className={`${i < run.step ? 'on' : ''} ${i === run.best - 1 && run.best > run.step ? 'best' : ''}`}>{i + 1}</span>
                ))}
              </div>
            </div>

            {game.phase === 'teamDone' ? (
              <div className="sb-done">
                {run.end === 'finished' ? (
                  <>
                    <h2>🎉 {team?.name} {tr("ce l'ha fatta!", 'made it!')}</h2>
                    <p>
                      {tr(
                        <>
                          {game.steps} risposte sbagliate di fila, con <b>{Math.ceil(run.timeLeft / 1000)} secondi</b> di anticipo.
                        </>,
                        <>
                          {game.steps} wrong answers in a row, with <b>{Math.ceil(run.timeLeft / 1000)} seconds</b> to spare.
                        </>,
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>⏱ {tr('Tempo scaduto', "Time's up")}</h2>
                    <p>
                      {tr('Serie migliore', 'Best run')}: <b>{tr(`${run.best} di ${game.steps}`, `${run.best} of ${game.steps}`)}</b>.
                    </p>
                  </>
                )}
                <p className="muted">
                  {tr(
                    `${run.asked} risposte, ${run.slips} ${run.slips === 1 ? 'ripartenza' : 'ripartenze'}`,
                    `${run.asked} answers, ${run.slips} ${run.slips === 1 ? 'restart' : 'restarts'}`,
                  )}{' '}
                  · {team ? scoreOf(game, team) - team.adjust : 0} {tr('punti', 'points')}
                </p>
                <button className="btn primary big" onClick={nextTeam}>
                  {lastTeam
                    ? tr('🏆 Classifica finale', '🏆 Final scores')
                    : tr(`Tocca a ${game.teams[game.current + 1]?.name}`, `Over to ${game.teams[game.current + 1]?.name}`)}{' '}
                  <kbd>{KEY.enter}</kbd>
                </button>
              </div>
            ) : q ? (
              <div className={`sb-play ${running ? '' : 'paused'}`}>
                <div className="sb-question" key={run.asked}>{q.question}</div>
                <div className="sb-options" key={`o${run.asked}`}>
                  {options.map((text, i) => (
                    <button key={i} className="sb-option" disabled={!running} onClick={() => answer(i === 0 ? leftTrue : !leftTrue)}>
                      <kbd>{i === 0 ? '←' : '→'}</kbd>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
                <div className={`sb-hint ${hintFrac >= 1 ? 'late' : ''}`}>
                  {game.hint > 0 && <div style={{ width: `${hintFrac * 100}%` }} />}
                </div>
                {!running && <div className="sb-pause">⏸ {tr('In pausa', 'Paused')}</div>}
              </div>
            ) : null}

            <div className="sb-flash">{flash && <span key={flash.text + run.asked} className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

            {playing && (
              <div className="host-bar">
                <button className={`btn ${running ? '' : 'primary'}`} onClick={pause}>{running ? tr('⏸ Pausa', '⏸ Pause') : tr('▶ Riprendi', '▶ Resume')} <kbd>{KEY.space}</kbd></button>
                <button className="btn ko" onClick={slow} disabled={!running}>⏱ {tr('Troppo lento', 'Too slow')} <kbd>X</kbd></button>
              </div>
            )}
          </>
        ) : null}

        <div className="team-strip">
          {game.teams.map((t, i) => {
            const r = game.runs[t.id];
            return (
              <div key={t.id} className={`team-chip ${i === game.current && !game.over ? 'on' : ''}`} style={{ borderLeftColor: t.color }}>
                {t.name}
                {r?.end && <small className="muted">{r.end === 'finished' ? '✓' : `${r.best}/${game.steps}`}</small>}
                <span className="score"><AnimatedNumber value={scoreOf(game, t)} /></span>
              </div>
            );
          })}
        </div>
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
