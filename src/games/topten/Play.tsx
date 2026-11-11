import { useEffect, useRef, useState } from 'react';
import { buzzKeyOf, useBuzzer } from '../../hub/buzzer';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import type { TopTenSet } from './schema';
import { endList, findAnswer, scoreOf, startList, useTopTen, VALUE, type TGame } from './state';

type Flash = { ok: boolean; text: string } | null;

export default function Play({ loaded }: { loaded: Loaded<TopTenSet> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = useTopTen(slug, data.liste[0]);
  const [guess, setGuess] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);
  // Answers uncovered together at the end of a list, in order: they turn one after the other.
  const [burst, setBurst] = useState<number[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const list = game.over ? undefined : data.liste[game.index];
  const answers = list?.answers ?? [];
  const shown = answers.map((_, i) => !!game.shown[i]);
  const hidden = shown.filter((s) => !s).length;
  const teamOf = (id?: string | null) => game.teams.find((t) => t.id === id);
  const control = teamOf(game.control);
  const buzzed = teamOf(game.buzzed);
  const answering = game.phase === 'gioco' ? control : game.phase === 'sfida' || game.phase === 'rubata' ? buzzed : undefined;
  const booking = !!list && (game.phase === 'sfida' || game.phase === 'rubata') && !game.buzzed;
  const lastList = game.index + 1 >= data.liste.length;

  useEffect(() => {
    setGuess('');
    if (answering) input.current?.focus();
  }, [answering, game.index, game.phase, game.strikes]);
  useEffect(() => setBurst([]), [game.index]);

  const save = (fn: (g: TGame) => TGame) => setGame((g) => ({ ...fn(g), started: true }));
  const say = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash((now) => (now === f ? null : now)), 2500);
  };

  const book = (id: string) => {
    sounds.tick();
    save((g) => ({ ...g, buzzed: id }));
  };
  useBuzzer(game.teams, game.buzz, booking, game.locked, book);

  const right = (i: number) => {
    if (!answering || !list) return;
    const id = answering.id;
    sounds.right();
    save((g) => {
      const next: TGame = {
        ...g,
        shown: answers.map((_, j) => !!g.shown[j] || j === i),
        foundBy: answers.map((_, j) => (j === i ? id : (g.foundBy[j] ?? null))),
        pot: g.pot + VALUE,
      };
      const full = next.shown.every(Boolean);
      if (g.phase === 'rubata') return endList(next, id);
      if (g.phase === 'sfida') {
        const playing = { ...next, phase: 'gioco' as const, control: id, buzzed: undefined, locked: [] };
        return full ? endList(playing, id) : playing;
      }
      return full ? endList(next, id) : next;
    });
    if (game.phase === 'rubata') say({ ok: true, text: `${answering.name} ruba ${game.pot + VALUE} punti!` });
    else if (game.phase === 'sfida') say({ ok: true, text: `Sul tabellone! +${VALUE} in palio` });
    else say({ ok: true, text: `+${VALUE} in palio` });
  };

  const wrong = (what?: string) => {
    if (!answering) return;
    const id = answering.id;
    sounds.wrong();
    const others = game.teams.filter((t) => t.id !== game.control);
    if (game.phase === 'sfida') {
      const locked = [...game.locked, id];
      const nobody = locked.length >= game.teams.length;
      say({ ok: false, text: nobody ? 'Nessuno ci ha preso: prenotatevi di nuovo' : `${what ? `«${what}» non c'è. ` : ''}${answering.name} è fuori dalla sfida` });
      save((g) => ({ ...g, buzzed: undefined, locked: nobody ? [] : locked }));
    } else if (game.phase === 'gioco') {
      const strikes = game.strikes + 1;
      const out = strikes >= game.maxStrikes;
      say({ ok: false, text: `${what ? `«${what}» non c'è. ` : ''}${out ? (others.length ? 'Errori finiti: si può rubare!' : 'Errori finiti') : `Errore ${strikes} di ${game.maxStrikes}`}` });
      save((g) => {
        const next = { ...g, strikes };
        if (!out) return next;
        return others.length ? { ...next, phase: 'rubata' as const, locked: [g.control!], buzzed: undefined } : endList(next, g.control);
      });
    } else if (game.phase === 'rubata') {
      const locked = [...game.locked, id];
      const allOut = others.every((t) => locked.includes(t.id));
      say({ ok: false, text: `${what ? `«${what}» non c'è. ` : ''}${allOut ? `I punti restano a ${control?.name ?? ''}` : `${answering.name} non ruba`}` });
      save((g) => (allOut ? endList({ ...g, locked }, g.control) : { ...g, locked, buzzed: undefined }));
    }
  };

  const check = () => {
    const text = guess.trim();
    if (!text || !list || !answering) return;
    const i = findAnswer(list, text);
    setGuess('');
    if (i >= 0 && shown[i]) say({ ok: false, text: `«${answers[i].text}» è già sul tabellone: un'altra!` });
    else if (i >= 0) right(i);
    else wrong(text);
  };

  // Nobody knows any answer: the list ends with no points.
  const giveUp = () => {
    sounds.reveal();
    save((g) => endList(g, undefined));
  };
  // Nobody tries to steal: the points stay with the team that played the list.
  const noSteal = () => {
    sounds.reveal();
    save((g) => endList(g, g.control));
  };
  const revealOne = (i: number) => {
    if (game.phase !== 'fine' || shown[i]) return;
    sounds.reveal();
    save((g) => ({ ...g, shown: answers.map((_, j) => !!g.shown[j] || j === i) }));
  };
  const revealAll = () => {
    sounds.reveal();
    setBurst(answers.map((_, i) => i).filter((i) => !shown[i]));
    save((g) => ({ ...g, shown: answers.map(() => true) }));
  };
  const next = () => {
    if (lastList) {
      save((g) => ({ ...g, over: true }));
      setRanking('celebrate');
    } else save((g) => startList(g, data.liste[g.index + 1], g.index + 1));
  };

  useKeys({
    Enter: answering ? check : game.phase === 'fine' && list ? (hidden ? revealAll : next) : undefined,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const winner = teamOf(game.winner);
  const rows = answers.length > 5 ? Math.ceil(answers.length / 2) : answers.length;
  const lockedNames = game.teams.filter((t) => game.locked.includes(t.id) && t.id !== game.control).map((t) => t.name);
  const keysLine = game.teams
    .filter((t) => !game.locked.includes(t.id))
    .map((t) => `${t.name}: tasto ${buzzKeyOf(game.teams, t.id)}`)
    .join(' · ');
  const phaseLabel = !list
    ? 'Fine'
    : game.phase === 'sfida'
      ? 'Sfida: prenotatevi'
      : game.phase === 'gioco'
        ? `Gioca ${control?.name ?? ''}`
        : game.phase === 'rubata'
          ? 'Si può rubare'
          : 'Lista finita';

  return (
    <div className="board-page tt-page">
      <PlayHeader
        back="#/topten"
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/topten/${slug}/setup`)}
      >
        <span className="pill" key={game.index}>Lista {Math.min(game.index + 1, data.liste.length)} di {data.liste.length}</span>
        {list && (
          <span className="pill" key={phaseLabel} style={game.phase === 'gioco' ? { color: control?.color } : undefined}>{phaseLabel}</span>
        )}
      </PlayHeader>

      <div className="game-stage">
        {list ? (
          <>
            <div className="tt-question" key={`q${game.index}`}>
              <h2>{list.question}</h2>
              {list.source && <small>Fonte: {list.source}</small>}
            </div>

            <div className="tt-main">
              <div className={`tt-board ${answers.length > 5 ? 'two' : ''}`} style={{ ['--rows' as string]: rows }} key={`b${game.index}`}>
                {answers.map((a, i) => {
                  const by = teamOf(game.foundBy[i]);
                  const late = burst.indexOf(i);
                  return (
                    <button
                      key={i}
                      className={`tt-slot ${shown[i] ? 'shown' : ''} ${shown[i] && !by ? 'missed' : ''}`}
                      style={{ ['--i' as string]: i, ['--team' as string]: by?.color ?? 'transparent', ...(late >= 0 ? { ['--late' as string]: late } : {}) }}
                      disabled={game.phase !== 'fine' || shown[i]}
                      onClick={() => revealOne(i)}
                      title={game.phase === 'fine' && !shown[i] ? 'Svela questa risposta' : undefined}
                      aria-label={shown[i] ? `${i + 1}: ${a.text}` : `${i + 1}: coperta`}
                    >
                      <span className="tt-num">{i + 1}</span>
                      <span className="tt-face">
                        {shown[i] ? (
                          <>
                            <b>{a.text}</b>
                            {a.note && <small>{a.note}</small>}
                          </>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="tt-side">
                <div className="tt-pot">
                  <small>{game.phase === 'fine' ? (winner ? `a ${winner.name}` : 'nessuno') : 'In palio'}</small>
                  <AnimatedNumber value={game.pot} />
                </div>
                {game.phase !== 'sfida' && (
                  <div className="tt-strikes" aria-label={`Errori: ${game.strikes} di ${game.maxStrikes}`}>
                    {Array.from({ length: game.maxStrikes }, (_, i) => (
                      <span key={i} className={i < game.strikes ? 'on' : ''}>✕</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="tt-guide">
              {game.phase === 'fine' ? (
                <>
                  <b>{winner ? `🎉 ${winner.name} prende ${game.pot} punti` : 'Nessuno prende punti'}</b>
                  <span className="muted">
                    {hidden ? `Mancano ${hidden} risposte: Invio per svelarle tutte, o tocca quelle da svelare.` : lastList ? 'Era l\'ultima lista.' : 'Pronti per la prossima lista.'}
                  </span>
                </>
              ) : game.phase === 'gioco' && control ? (
                <>
                  <b style={{ color: control.color }}>{control.name} gioca la lista</b>
                  <span>Una risposta alla volta. Con {game.maxStrikes} errori le altre squadre possono rubare i punti in palio.</span>
                </>
              ) : buzzed ? (
                <>
                  <b style={{ color: buzzed.color }}>🔔 Risponde {buzzed.name}</b>
                  <span>
                    {game.phase === 'rubata'
                      ? `Una sola risposta: se è sul tabellone, ${buzzed.name} ruba tutti i punti in palio.`
                      : `Se la risposta è sul tabellone, ${buzzed.name} gioca la lista.`}{' '}
                    Host: scrivi la risposta e premi Invio.
                  </span>
                </>
              ) : (
                <>
                  <b>{game.phase === 'rubata' ? `${control?.name ?? ''} ha finito gli errori: chi ruba?` : 'Chi ne sa una? Prenotatevi!'}</b>
                  <span>{game.buzz === 'keys' ? keysLine : "Alzate la mano: l'host tocca la squadra più veloce (o preme il suo numero)."}</span>
                  {lockedNames.length > 0 && <span className="muted">{lockedNames.join(', ')}: già sbagliato, fuori da questo turno.</span>}
                </>
              )}
            </div>

            <div className="tt-flash">{flash && <span key={flash.text} className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

            {answering ? (
              <div className="host-bar">
                <div className="guess">
                  <input
                    ref={input}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder={`Risposta di ${answering.name}`}
                    aria-label="Risposta della squadra"
                  />
                  <button className="btn primary" onClick={check} disabled={!guess.trim()}>Controlla <kbd>Invio</kbd></button>
                </div>
                <button className="btn ko" onClick={() => wrong()} title="Non rispondono o la risposta non c'è">✗ Sbagliata</button>
              </div>
            ) : game.phase === 'fine' ? (
              <div className="host-bar">
                {hidden > 0 && <button className="btn primary" onClick={revealAll}>👁 Svela le altre {!!hidden && <kbd>Invio</kbd>}</button>}
                <button className={`btn ${hidden ? 'ghost' : 'primary'}`} onClick={next}>
                  {lastList ? '🏆 Classifica finale' : 'Prossima lista'} {!hidden && <kbd>Invio</kbd>}
                </button>
              </div>
            ) : (
              <div className="host-bar">
                {game.phase === 'sfida' ? (
                  <button className="btn ghost" onClick={giveUp} title="Nessuno ne sa una: svela la lista senza punti">⏭ Nessuno la sa: salta</button>
                ) : (
                  <button className="btn ghost" onClick={noSteal}>⏭ Nessuno ruba: punti a {control?.name}</button>
                )}
              </div>
            )}
          </>
        ) : (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale</button>
        )}

        <div className="team-strip">
          {game.teams.map((t, i) => {
            const on = t.id === answering?.id;
            const off = booking && game.locked.includes(t.id);
            return (
              <button
                key={t.id}
                className={`team-chip ${on ? 'on' : ''} ${off ? 'off' : ''}`}
                style={{ borderLeftColor: t.color }}
                disabled={!booking || game.locked.includes(t.id)}
                onClick={() => book(t.id)}
              >
                {booking && !game.locked.includes(t.id) && <span className="key-hint">{game.buzz === 'keys' ? buzzKeyOf(game.teams, t.id) : i + 1}</span>}
                {t.name}
                <span className="score"><AnimatedNumber value={scoreOf(game, t)} /></span>
              </button>
            );
          })}
        </div>
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
