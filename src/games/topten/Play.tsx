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
import { KEY, tr } from '../../hub/i18n';

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
    if (game.phase === 'rubata') say({ ok: true, text: tr(`${answering.name} ruba ${game.pot + VALUE} punti!`, `${answering.name} steals ${game.pot + VALUE} points!`) });
    else if (game.phase === 'sfida') say({ ok: true, text: tr(`Sul tabellone! +${VALUE} in palio`, `On the board! +${VALUE} in the pot`) });
    else say({ ok: true, text: tr(`+${VALUE} in palio`, `+${VALUE} in the pot`) });
  };

  const notThere = (what?: string) => (what ? tr(`«${what}» non c'è. `, `“${what}” isn't there. `) : '');
  const wrong = (what?: string) => {
    if (!answering) return;
    const id = answering.id;
    sounds.wrong();
    const others = game.teams.filter((t) => t.id !== game.control);
    if (game.phase === 'sfida') {
      const locked = [...game.locked, id];
      const nobody = locked.length >= game.teams.length;
      say({ ok: false, text: nobody
          ? tr('Nessuno ci ha preso: prenotatevi di nuovo', 'Nobody got it: buzz in again')
          : `${notThere(what)}${tr(`${answering.name} è fuori dalla sfida`, `${answering.name} is out of the face-off`)}` });
      save((g) => ({ ...g, buzzed: undefined, locked: nobody ? [] : locked }));
    } else if (game.phase === 'gioco') {
      const strikes = game.strikes + 1;
      const out = strikes >= game.maxStrikes;
      say({ ok: false, text: `${notThere(what)}${out ? (others.length ? tr('Errori finiti: si può rubare!', 'Out of mistakes: time to steal!') : tr('Errori finiti', 'Out of mistakes')) : tr(`Errore ${strikes} di ${game.maxStrikes}`, `Mistake ${strikes} of ${game.maxStrikes}`)}` });
      save((g) => {
        const next = { ...g, strikes };
        if (!out) return next;
        return others.length ? { ...next, phase: 'rubata' as const, locked: [g.control!], buzzed: undefined } : endList(next, g.control);
      });
    } else if (game.phase === 'rubata') {
      const locked = [...game.locked, id];
      const allOut = others.every((t) => locked.includes(t.id));
      say({ ok: false, text: `${notThere(what)}${allOut ? tr(`I punti restano a ${control?.name ?? ''}`, `The points stay with ${control?.name ?? ''}`) : tr(`${answering.name} non ruba`, `${answering.name} doesn't steal`)}` });
      save((g) => (allOut ? endList({ ...g, locked }, g.control) : { ...g, locked, buzzed: undefined }));
    }
  };

  const check = () => {
    const text = guess.trim();
    if (!text || !list || !answering) return;
    const i = findAnswer(list, text);
    setGuess('');
    if (i >= 0 && shown[i]) say({ ok: false, text: tr(`«${answers[i].text}» è già sul tabellone: un'altra!`, `“${answers[i].text}” is already on the board: another one!`) });
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
    .map((t) => `${t.name}: ${tr('tasto', 'key')} ${buzzKeyOf(game.teams, t.id)}`)
    .join(' · ');
  const phaseLabel = !list
    ? tr('Fine', 'The end')
    : game.phase === 'sfida'
      ? tr('Sfida: prenotatevi', 'Face-off: buzz in')
      : game.phase === 'gioco'
        ? tr(`Gioca ${control?.name ?? ''}`, `${control?.name ?? ''} plays`)
        : game.phase === 'rubata'
          ? tr('Si può rubare', 'Steal time')
          : tr('Lista finita', 'List over');

  return (
    <div className="board-page tt-page">
      <PlayHeader
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/topten/${slug}/setup`)}
      >
        <span className="pill" key={game.index}>
          {tr(`Lista ${Math.min(game.index + 1, data.liste.length)} di ${data.liste.length}`, `List ${Math.min(game.index + 1, data.liste.length)} of ${data.liste.length}`)}
        </span>
        {list && (
          <span className="pill" key={phaseLabel} style={game.phase === 'gioco' ? { color: control?.color } : undefined}>{phaseLabel}</span>
        )}
      </PlayHeader>

      <div className="game-stage">
        {list ? (
          <>
            <div className="tt-question" key={`q${game.index}`}>
              <h2>{list.question}</h2>
              {list.source && <small>{tr('Fonte', 'Source')}: {list.source}</small>}
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
                      title={game.phase === 'fine' && !shown[i] ? tr('Svela questa risposta', 'Reveal this answer') : undefined}
                      aria-label={shown[i] ? `${i + 1}: ${a.text}` : `${i + 1}: ${tr('coperta', 'covered')}`}
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
                  <small>{game.phase === 'fine' ? (winner ? tr(`a ${winner.name}`, `to ${winner.name}`) : tr('nessuno', 'nobody')) : tr('In palio', 'In the pot')}</small>
                  <AnimatedNumber value={game.pot} />
                </div>
                {game.phase !== 'sfida' && (
                  <div className="tt-strikes" aria-label={tr(`Errori: ${game.strikes} di ${game.maxStrikes}`, `Mistakes: ${game.strikes} of ${game.maxStrikes}`)}>
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
                  <b>{winner ? tr(`🎉 ${winner.name} prende ${game.pot} punti`, `🎉 ${winner.name} takes ${game.pot} points`) : tr('Nessuno prende punti', 'Nobody takes points')}</b>
                  <span className="muted">
                    {hidden
                      ? tr(
                          `Mancano ${hidden} risposte: Invio per svelarle tutte, o tocca quelle da svelare.`,
                          `${hidden} answers missing: Enter to reveal them all, or tap the ones to reveal.`,
                        )
                      : lastList
                        ? tr("Era l'ultima lista.", 'That was the last list.')
                        : tr('Pronti per la prossima lista.', 'Ready for the next list.')}
                  </span>
                </>
              ) : game.phase === 'gioco' && control ? (
                <>
                  <b style={{ color: control.color }}>{tr(`${control.name} gioca la lista`, `${control.name} plays the list`)}</b>
                  <span>
                    {tr(
                      `Una risposta alla volta. Con ${game.maxStrikes} errori le altre squadre possono rubare i punti in palio.`,
                      `One answer at a time. With ${game.maxStrikes} mistakes the other teams can steal the pot.`,
                    )}
                  </span>
                </>
              ) : buzzed ? (
                <>
                  <b style={{ color: buzzed.color }}>🔔 {tr('Risponde', 'Answering:')} {buzzed.name}</b>
                  <span>
                    {game.phase === 'rubata'
                      ? tr(
                          `Una sola risposta: se è sul tabellone, ${buzzed.name} ruba tutti i punti in palio.`,
                          `One answer only: if it's on the board, ${buzzed.name} steals the whole pot.`,
                        )
                      : tr(`Se la risposta è sul tabellone, ${buzzed.name} gioca la lista.`, `If the answer is on the board, ${buzzed.name} plays the list.`)}{' '}
                    {tr('Host: scrivi la risposta e premi Invio.', 'Host: type the answer and press Enter.')}
                  </span>
                </>
              ) : (
                <>
                  <b>{game.phase === 'rubata'
                      ? tr(`${control?.name ?? ''} ha finito gli errori: chi ruba?`, `${control?.name ?? ''} is out of mistakes: who steals?`)
                      : tr('Chi ne sa una? Prenotatevi!', 'Who knows one? Buzz in!')}</b>
                  <span>{game.buzz === 'keys' ? keysLine : tr("Alzate la mano: l'host tocca la squadra più veloce (o preme il suo numero).", 'Raise your hands: the host taps the fastest team (or presses its number).')}</span>
                  {lockedNames.length > 0 && <span className="muted">{lockedNames.join(', ')}: {tr('già sbagliato, fuori da questo turno.', 'already wrong, out of this round.')}</span>}
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
                    placeholder={tr(`Risposta di ${answering.name}`, `${answering.name}'s answer`)}
                    aria-label={tr('Risposta della squadra', "The team's answer")}
                  />
                  <button className="btn primary" onClick={check} disabled={!guess.trim()}>{tr('Controlla', 'Check')} <kbd>{KEY.enter}</kbd></button>
                </div>
                <button className="btn ko" onClick={() => wrong()} title={tr("Non rispondono o la risposta non c'è", "No answer, or the answer isn't there")}>✗ {tr('Sbagliata', 'Wrong')}</button>
              </div>
            ) : game.phase === 'fine' ? (
              <div className="host-bar">
                {hidden > 0 && <button className="btn primary" onClick={revealAll}>👁 {tr('Svela le altre', 'Reveal the rest')} {!!hidden && <kbd>{KEY.enter}</kbd>}</button>}
                <button className={`btn ${hidden ? 'ghost' : 'primary'}`} onClick={next}>
                  {lastList ? tr('🏆 Classifica finale', '🏆 Final scores') : tr('Prossima lista', 'Next list')} {!hidden && <kbd>{KEY.enter}</kbd>}
                </button>
              </div>
            ) : (
              <div className="host-bar">
                {game.phase === 'sfida' ? (
                  <button className="btn ghost" onClick={giveUp} title={tr('Nessuno ne sa una: svela la lista senza punti', 'Nobody knows one: reveal the list with no points')}>
                    ⏭ {tr('Nessuno la sa: salta', 'Nobody knows: skip')}
                  </button>
                ) : (
                  <button className="btn ghost" onClick={noSteal}>⏭ {tr('Nessuno ruba: punti a', 'Nobody steals: points to')} {control?.name}</button>
                )}
              </div>
            )}
          </>
        ) : (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 {tr('Classifica finale', 'Final scores')}</button>
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
