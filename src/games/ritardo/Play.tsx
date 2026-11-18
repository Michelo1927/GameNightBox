import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import type { RitardoSet } from './schema';
import { deal, newRun, scoreOf, useRitardo, type Run, type RGame } from './state';
import { KEY, tr } from '../../hub/i18n';

type Flash = { ok: boolean; text: string } | null;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function Play({ loaded }: { loaded: Loaded<RitardoSet> }) {
  const { slug, data } = loaded;
  const total = data.domande.length;
  const { game, setGame, undo, canUndo } = useRitardo(slug, total);
  const [running, setRunning] = useState(false);
  const since = useRef(0);
  // When the question on screen appeared: drives the per-question timer.
  const askedAt = useRef(Date.now());
  const [, tick] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const [peek, setPeek] = useState(false);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);

  const team = game.teams[game.current];
  const run = team ? game.runs[team.id] : undefined;
  const steps = run?.list.length ?? game.steps;
  const finish = steps + 1;
  const step = run?.step ?? 0;
  // The question on screen (none after the last one: only its answer is left to say).
  const q = run && step < steps ? data.domande[run.list[step]] : undefined;
  // What the team must say now: the password, then the answer to the question before.
  const expected = run ? (step === 0 ? run.password : data.domande[run.list[step - 1]]?.answer ?? '') : '';
  const left = run ? run.timeLeft - (running ? Date.now() - since.current : 0) : game.seconds * 1000;
  const playing = game.phase === 'play' && !!run && !run.end;
  const lastTeam = game.current + 1 >= game.teams.length;

  const say = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash((now) => (now === f ? null : now)), 2200);
  };

  /** Changes the current team's go, saving the time used so far. */
  function update(fn: (r: Run) => Run, phase: RGame['phase']) {
    if (!team) return;
    const used = running ? Date.now() - since.current : 0;
    since.current = Date.now();
    askedAt.current = Date.now();
    setPeek(false);
    setGame((g) => {
      const r = g.runs[team.id];
      if (!r) return g;
      const timed = { ...r, timeLeft: Math.max(0, r.timeLeft - used) };
      return { ...g, started: true, phase, runs: { ...g.runs, [team.id]: fn(timed) } };
    });
  }

  // The clock: redraws while running, ends the go at zero and calls a question that took too long.
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
      } else if (game.perQuestion && Date.now() - askedAt.current >= game.perQuestion * 1000) {
        slip(tr(`Troppo lenti! Era «${expected}». Si riparte dalla prima`, `Too slow! It was "${expected}". Back to the first`));
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
      // A go that already started just goes back on screen.
      if (r && (r.asked || r.end)) return { ...g, phase: 'play' };
      // The team's questions come off the shared deck only once: a go restarted from the intro keeps them.
      if (r?.list.length === g.steps && r.password) return { ...g, started: true, phase: 'play', runs: { ...g.runs, [team.id]: newRun(g.seconds, r.list, r.password) } };
      const dealt = deal(g, total);
      return { ...dealt.g, started: true, phase: 'play', runs: { ...g.runs, [team.id]: newRun(g.seconds, dealt.list, dealt.password) } };
    });
    startClock();
  };

  /** The host heard the right answer. */
  const right = () => {
    if (!playing || !running || !run) return;
    const next = run.step + 1;
    if (next >= finish) {
      sounds.right();
      setRunning(false);
      update((r) => ({ ...r, step: next, best: Math.max(r.best, next), asked: r.asked + 1, end: 'finished' }), 'teamDone');
    } else {
      sounds.reveal();
      update((r) => ({ ...r, step: next, best: Math.max(r.best, next), asked: r.asked + 1 }), 'play');
    }
  };
  const slip = (text: string) => {
    if (!playing || !run) return;
    sounds.wrong();
    say({ ok: false, text });
    update((r) => ({ ...r, step: 0, asked: r.asked + 1, slips: r.slips + 1 }), 'play');
  };
  const wrong = () => running && slip(tr(`Era «${expected}»! Si riparte dalla prima`, `It was "${expected}"! Back to the first`));

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
    ArrowRight: playing && running && right,
    ArrowLeft: playing && running && wrong,
    x: playing && running && wrong,
    r: playing && (() => setPeek((p) => !p)),
    ' ': playing && pause,
    Enter: game.over ? () => setRanking('celebrate') : game.phase === 'intro' ? via : game.phase === 'teamDone' ? nextTeam : undefined,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const qFrac = playing && running && game.perQuestion ? Math.min(1, (Date.now() - askedAt.current) / (game.perQuestion * 1000)) : 0;
  // The furthest question the team saw: the best run plus the one on screen after it.
  const reached = (r: Run) => Math.min(r.best + 1, r.list.length);

  return (
    <div className="board-page ri-page">
      <PlayHeader
        title={data.title}
        undo={safeUndo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/ritardo/${slug}/setup`)}
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
          <div className="ri-intro" key={team.id}>
            <div className="ri-tag">{tr('Tocca a', 'Your turn')}</div>
            <h2 style={{ color: team.color }}>{team.name}</h2>
            {tr(
              <ol>
                <li>Arriva una domanda alla volta, ma rispondete <b>in ritardo di una</b>: per passare alla domanda dopo dite la risposta di quella <b>prima</b>.</li>
                <li>Sulla prima domanda si dice la <b>parola d'ordine</b>, che vedrete appena si parte. Dopo l'ultima domanda resta da dire la sua risposta.</li>
                <li>
                  Avete <b>{game.steps} domande</b> e {fmt(game.seconds * 1000)}
                  {game.perQuestion ? <>, al massimo <b>{game.perQuestion} secondi</b> per risposta</> : null}. Se sbagliate si riparte <b>dalla prima</b>: sono sempre le stesse, nello stesso ordine, e il tempo continua a scorrere.
                </li>
              </ol>,
              <ol>
                <li>One question at a time, but you answer <b>one behind</b>: to move on, say the answer to the <b>previous</b> question.</li>
                <li>On the first question you say the <b>password</b>, shown as soon as you start. After the last question, its answer is still to be said.</li>
                <li>
                  You have <b>{game.steps} questions</b> and {fmt(game.seconds * 1000)}
                  {game.perQuestion ? <>, at most <b>{game.perQuestion} seconds</b> per answer</> : null}. A mistake sends you back <b>to the first</b>: they're always the same, in the same order, and the clock keeps running.
                </li>
              </ol>,
            )}
            <p className="muted">
              {tr(
                'Host: → se la risposta è giusta, ← (o X) se è sbagliata, R per vedere la risposta attesa, Spazio per la pausa.',
                'Host: → if the answer is right, ← (or X) if it is wrong, R to see the expected answer, Space to pause.',
              )}
            </p>
            <button className="btn primary big" onClick={via}>{tr('Via!', 'Go!')} <kbd>{KEY.enter}</kbd></button>
          </div>
        ) : run ? (
          <>
            <div className="ri-top">
              <div className={`ri-clock ${running && left <= 10000 ? 'hurry' : ''}`}>{fmt(left)}</div>
              <div className={`ri-path${finish > 13 ? ' long' : ''}`} style={{ ['--steps' as string]: finish, ['--half' as string]: Math.ceil(finish / 2) } as CSSProperties}>
                {Array.from({ length: finish }, (_, i) => (
                  <span key={i} className={`${i < step ? 'on' : ''} ${i === step && playing ? 'now' : ''} ${i === run.best - 1 && run.best > step ? 'best' : ''}`}>
                    {i === 0 ? '🔑' : i}
                  </span>
                ))}
              </div>
            </div>

            {game.phase === 'teamDone' ? (
              <div className="ri-done">
                {run.end === 'finished' ? (
                  <>
                    <h2>🎉 {team?.name} {tr("ce l'ha fatta!", 'made it!')}</h2>
                    <p>
                      {tr(
                        <>
                          Tutte le {steps} domande, con <b>{Math.ceil(run.timeLeft / 1000)} secondi</b> di anticipo.
                        </>,
                        <>
                          All {steps} questions, with <b>{Math.ceil(run.timeLeft / 1000)} seconds</b> to spare.
                        </>,
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h2>⏱ {tr('Tempo scaduto', "Time's up")}</h2>
                    <p>
                      {tr('Arrivati fino alla domanda', 'Got as far as question')} <b>{tr(`${reached(run)} di ${steps}`, `${reached(run)} of ${steps}`)}</b>
                      {run.best >= steps ? tr(' (mancava solo l\'ultima risposta)', ' (only the last answer was missing)') : ''}.
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
            ) : (
              <div className={`ri-play ${running ? '' : 'paused'}`}>
                {step === 0 ? (
                  <div className="ri-say" key={`p${run.asked}`}>
                    {tr('Parola d\'ordine', 'Password')}: <b>{run.password}</b>
                  </div>
                ) : (
                  <div className="ri-say" key={`s${run.asked}`}>
                    {tr('Dite la risposta della domanda', 'Say the answer to question')} <b>{step}</b>
                  </div>
                )}
                {q ? (
                  <div className="ri-question" key={run.asked}>
                    <small>{tr(`Domanda ${step + 1}`, `Question ${step + 1}`)}</small>
                    {q.question}
                  </div>
                ) : (
                  <div className="ri-question ri-last" key={run.asked}>
                    🏁 {tr('Ultima risposta!', 'Last answer!')}
                  </div>
                )}
                <div className={`ri-qtime ${qFrac >= 0.75 ? 'late' : ''}`}>{game.perQuestion > 0 && <div style={{ width: `${(1 - qFrac) * 100}%` }} />}</div>
                {/* The answer is in the page only while shown: a blurred text can flash sharp for a moment (transitions, a hover left on a touch screen). */}
                <button className={`ri-peek ${peek ? 'on' : ''}`} onClick={() => setPeek((p) => !p)} title={tr('Solo per l\'host (R)', 'Host only (R)')}>
                  <span>{tr('Risposta attesa', 'Expected answer')}</span>
                  <b key={`${peek}${run.asked}`}>{peek ? expected : '••••••'}</b>
                  <kbd>R</kbd>
                </button>
                {!running && <div className="ri-pause">⏸ {tr('In pausa', 'Paused')}</div>}
              </div>
            )}

            <div className="ri-flash">{flash && <span key={flash.text + run.asked} className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

            {playing && (
              <div className="host-bar">
                <button className="btn ko" onClick={wrong} disabled={!running}>✗ {tr('Sbagliata', 'Wrong')} <kbd>←</kbd></button>
                <button className={`btn ${running ? '' : 'primary'}`} onClick={pause}>{running ? tr('⏸ Pausa', '⏸ Pause') : tr('▶ Riprendi', '▶ Resume')} <kbd>{KEY.space}</kbd></button>
                <button className="btn ok" onClick={right} disabled={!running}>✓ {tr('Giusta', 'Right')} <kbd>→</kbd></button>
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
                {r?.end && <small className="muted">{r.end === 'finished' ? '✓' : `${reached(r)}/${r.list.length}`}</small>}
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
