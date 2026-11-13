import { useState } from 'react';
import { buzzKeyOf, useBuzzer } from '../../hub/buzzer';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import AnimatedNumber from '../../hub/components/AnimatedNumber';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import Timer from '../../hub/components/Timer';
import type { InFilaSet } from './schema';
import { endSequence, fullValue, playedCount, rightIn, scoreOf, startSequence, useInFila, valueOf, type FGame } from './state';
import { KEY, ordinal, tr } from '../../hub/i18n';

type Flash = { ok: boolean; text: string } | null;

export default function Play({ loaded }: { loaded: Loaded<InFilaSet> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = useInFila(slug, data.sequenze[0]);
  const [flash, setFlash] = useState<Flash>(null);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);

  const total = playedCount(data.sequenze.length, game.teams.length);
  const seq = game.over ? undefined : data.sequenze[game.index];
  const cards = seq?.cards ?? [];
  const n = cards.length;
  const teamOf = (id?: string) => game.teams.find((t) => t.id === id);
  // Modulo: teams can be removed in the setup during a game.
  const team = game.teams[game.turn % Math.max(game.teams.length, 1)];
  const buzzed = teamOf(game.buzzed);
  const lastBy = teamOf(game.lastBy);
  // The team saying the order now: the one playing, or the one that booked to steal.
  const ordering = game.phase === 'ordine' ? team : game.phase === 'rubata' ? buzzed : undefined;
  const editing = !!seq && !!ordering;
  const full = game.placed.length === n && game.placed.every((c) => c !== null);
  const booking = !!seq && game.phase === 'rubata' && !game.buzzed;
  const lastSeq = game.index + 1 >= total;
  const others = game.teams.filter((t) => t.id !== team?.id);
  const teamRight = rightIn(game.teamOrder ?? []);

  const save = (fn: (g: FGame) => FGame) => setGame((g) => ({ ...fn(g), started: true }));
  const say = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash((now) => (now === f ? null : now)), 2500);
  };

  const book = (id: string) => {
    sounds.tick();
    save((g) => ({ ...g, buzzed: id }));
  };
  useBuzzer(game.teams, game.buzz, booking, game.locked, book);

  // --- the host puts the cards in the row ---
  const place = (card: number) => {
    if (!editing || game.placed.includes(card)) return;
    sounds.tick();
    save((g) => {
      const at = g.placed.indexOf(null);
      return at < 0 ? g : { ...g, placed: g.placed.map((c, i) => (i === at ? card : c)) };
    });
  };
  const unplace = (slot: number) => {
    if (!editing || game.placed[slot] === null) return;
    save((g) => ({ ...g, placed: g.placed.map((c, i) => (i === slot ? null : c)) }));
  };
  const removeLast = () => {
    const filled = game.placed.flatMap((c, i) => (c === null ? [] : [i]));
    if (filled.length) unplace(filled[filled.length - 1]);
  };
  const clear = () => editing && save((g) => ({ ...g, placed: g.placed.map(() => null) }));

  const check = () => {
    if (!editing || !full || !team || !ordering) return;
    const order = game.placed as number[];
    const right = rightIn(order);
    if (right === n) {
      sounds.right();
      const stolen = game.phase === 'rubata';
      say({ ok: true, text: stolen
          ? tr(`${ordering.name} ruba ${fullValue(n)} punti!`, `${ordering.name} steals ${fullValue(n)} points!`)
          : tr(`Tutto giusto! +${fullValue(n)} a ${team.name}`, `All right! +${fullValue(n)} to ${team.name}`), });
      save((g) => endSequence(stolen ? g : { ...g, teamOrder: order }, ordering.id, fullValue(n), stolen));
      return;
    }
    sounds.wrong();
    if (game.phase === 'ordine') {
      if (!others.length) {
        say({ ok: false, text: tr(`${right} su ${n} al posto giusto`, `${right} of ${n} in the right place`) });
        save((g) => endSequence({ ...g, teamOrder: order }, team.id, valueOf(right, n)));
      } else {
        say({ ok: false, text: tr(`${right} su ${n} al posto giusto: si può rubare!`, `${right} of ${n} in the right place: time to steal!`) });
        save((g) => ({ ...g, phase: 'rubata', teamOrder: order, right, lastBy: team.id, locked: [team.id], buzzed: undefined }));
      }
      return;
    }
    // A steal that isn't all right: the next team can try, from this order.
    const locked = [...game.locked, ordering.id];
    const allOut = others.every((t) => locked.includes(t.id));
    const kept = valueOf(teamRight, n);
    say({
      ok: false,
      text: !allOut
        ? tr(`${right} su ${n} al posto giusto: ${ordering.name} non ruba`, `${right} of ${n} in the right place: ${ordering.name} doesn't steal`)
        : kept
          ? tr(`${right} su ${n}: nessuno ruba, ${kept} punti a ${team.name}`, `${right} of ${n}: nobody steals, ${kept} points to ${team.name}`)
          : tr(`${right} su ${n}: nessuno ruba, niente punti`, `${right} of ${n}: nobody steals, no points`),
    });
    save((g) =>
      allOut
        ? endSequence({ ...g, locked, right, lastBy: ordering.id }, team.id, valueOf(rightIn(g.teamOrder ?? []), n))
        : { ...g, locked, buzzed: undefined, right, lastBy: ordering.id },
    );
  };

  // Nobody tries to steal: the team that played takes the points of its order.
  const noSteal = () => {
    if (!team) return;
    sounds.reveal();
    save((g) => endSequence(g, team.id, valueOf(rightIn(g.teamOrder ?? []), n)));
  };
  const next = () => {
    if (lastSeq) {
      save((g) => ({ ...g, over: true }));
      setRanking('celebrate');
    } else save((g) => startSequence(g, data.sequenze[g.index + 1], g.index + 1));
  };

  useKeys({
    Enter: editing ? full && check : game.phase === 'fine' && !!seq && next,
    Backspace: editing && removeLast,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const winner = teamOf(game.winner);
  const keysLine = game.teams
    .filter((t) => !game.locked.includes(t.id))
    .map((t) => `${t.name}: ${tr('tasto', 'key')} ${buzzKeyOf(game.teams, t.id)}`)
    .join(' · ');
  const lockedNames = game.teams.filter((t) => game.locked.includes(t.id) && t.id !== team?.id).map((t) => t.name);
  const phaseLabel = !seq
    ? tr('Fine', 'The end')
    : game.phase === 'ordine'
      ? tr(`Gioca ${team?.name ?? ''}`, `${team?.name ?? ''} plays`)
      : game.phase === 'rubata'
        ? tr('Si può rubare', 'Steal time')
        : tr('Sequenza finita', 'Sequence over');
  const reveal = game.phase === 'fine';

  return (
    <div className="board-page if-page">
      <PlayHeader
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/infila/${slug}/setup`)}
      >
        <span className="pill" key={game.index}>
          {tr(`Sequenza ${Math.min(game.index + 1, total)} di ${total}`, `Sequence ${Math.min(game.index + 1, total)} of ${total}`)}
        </span>
        {seq && (
          <span className="pill" key={phaseLabel} style={game.phase === 'ordine' ? { color: team?.color } : undefined}>{phaseLabel}</span>
        )}
        {seq && game.seconds > 0 && !reveal && <Timer key={`${game.index}-${game.phase}-${game.buzzed ?? ''}`} seconds={game.seconds} />}
      </PlayHeader>

      <div className="game-stage">
        {seq ? (
          <>
            <div className="if-question" key={`q${game.index}`}>
              <h2>{seq.question}</h2>
              {seq.source && <small>{tr('Fonte', 'Source')}: {seq.source}</small>}
            </div>

            <div className="if-line" style={{ ['--n' as string]: n }} key={`l${game.index}`}>
              <div className="if-ends" aria-hidden>
                <span>◀ {seq.first}</span>
                <span>{seq.last} ▶</span>
              </div>
              <div className="if-row">
                {cards.map((_, k) => {
                  if (reveal) {
                    const said = game.teamOrder?.indexOf(k) ?? -1;
                    const ok = game.stolen || said === k;
                    return (
                      <div key={k} className={`if-slot if-card shown ${ok ? 'ok' : 'ko'}`} style={{ ['--i' as string]: k }}>
                        <span className="if-num">{tr(`${k + 1}°`, ordinal(k + 1))}</span>
                        <b>{cards[k].text}</b>
                        <span className="if-value">{cards[k].value}</span>
                        {!ok && said >= 0 && <small>{tr(`detto ${said + 1}°`, `said ${ordinal(said + 1)}`)}</small>}
                      </div>
                    );
                  }
                  const c = game.placed[k];
                  return c === null || c === undefined ? (
                    <div key={k} className="if-slot empty">
                      <span className="if-num">{tr(`${k + 1}°`, ordinal(k + 1))}</span>
                    </div>
                  ) : (
                    <button
                      key={k}
                      className="if-slot if-card"
                      disabled={!editing}
                      onClick={() => unplace(k)}
                      title={editing ? tr('Togli dalla fila', 'Take out of the row') : undefined}
                    >
                      <span className="if-num">{tr(`${k + 1}°`, ordinal(k + 1))}</span>
                      <b>{cards[c]?.text}</b>
                    </button>
                  );
                })}
              </div>
              {editing && (
                <div className="if-row if-pool">
                  {game.deal.map((c) =>
                    game.placed.includes(c) ? (
                      <span key={c} className="if-ghost" />
                    ) : (
                      <button key={c} className="if-card" onClick={() => place(c)} title={tr('Metti al prossimo posto libero', 'Put in the next free place')}>
                        <b>{cards[c]?.text}</b>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="if-guide">
              {reveal ? (
                <>
                  <b>
                    {winner
                      ? game.stolen
                        ? tr(`🎉 ${winner.name} ruba ${game.won} punti`, `🎉 ${winner.name} steals ${game.won} points`)
                        : `${game.won === fullValue(n) ? tr('🎉 Tutto giusto! ', '🎉 All right! ') : ''}${tr(`${winner.name} prende ${game.won} punti`, `${winner.name} takes ${game.won} points`)}`
                      : tr('Nessuno prende punti', 'Nobody takes points')}
                  </b>
                  <span className="muted">
                    {game.stolen || teamRight === n
                      ? tr('Ecco i valori.', 'Here are the values.')
                      : tr(`${team?.name} aveva ${teamRight} carte su ${n} al posto giusto.`, `${team?.name} had ${teamRight} of ${n} cards in the right place.`)}{' '}
                    {lastSeq ? tr("Era l'ultima sequenza.", 'That was the last sequence.') : tr('Invio per la prossima.', 'Enter for the next one.')}
                  </span>
                </>
              ) : game.phase === 'ordine' && team ? (
                <>
                  <b style={{ color: team.color }}>{team.name}: {tr('in che ordine?', 'in what order?')}</b>
                  <span>
                    {full
                      ? tr('Fila completa: Invio per controllare.', 'Row complete: Enter to check.')
                      : tr("Host: tocca le carte nell'ordine che dicono. Tocca una carta nella fila per toglierla.", 'Host: tap the cards in the order they say. Tap a card in the row to take it out.')}{' '}
                    <span className="muted">{tr(`Tutto giusto: ${fullValue(n)} punti.`, `All right: ${fullValue(n)} points.`)}</span>
                  </span>
                </>
              ) : buzzed ? (
                <>
                  <b style={{ color: buzzed.color }}>🔔 {tr('Ruba', 'Stealing:')} {buzzed.name}</b>
                  <span>
                    {tr(
                      `Cambiate l'ordine come volete: tocca una carta nella fila per toglierla e rimetterla. Se è tutto giusto, ${buzzed.name} prende ${fullValue(n)} punti.`,
                      `Change the order as you like: tap a card in the row to take it out and put it back. If it's all right, ${buzzed.name} takes ${fullValue(n)} points.`,
                    )}
                  </span>
                </>
              ) : (
                <>
                  <b>
                    {lastBy?.name}: <span className="if-count">{tr(`${game.right} su ${n}`, `${game.right} of ${n}`)}</span>{' '}
                    {tr('al posto giusto. Chi ruba?', 'in the right place. Who steals?')}
                  </b>
                  <span>{game.buzz === 'keys' ? keysLine : tr("Alzate la mano: l'host tocca la squadra più veloce (o preme il suo numero).", 'Raise your hands: the host taps the fastest team (or presses its number).')}</span>
                  {lockedNames.length > 0 && <span className="muted">{lockedNames.join(', ')}: {tr('già provato, fuori da questa rubata.', 'already tried, out of this steal.')}</span>}
                </>
              )}
            </div>

            <div className="if-flash">{flash && <span key={flash.text} className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

            <div className="host-bar">
              {editing ? (
                <>
                  <button className="btn ghost" onClick={clear} disabled={game.placed.every((c) => c === null)}>{tr('Svuota la fila', 'Clear the row')}</button>
                  <button className="btn primary" onClick={check} disabled={!full}>✓ {tr('Controlla', 'Check')} {full && <kbd>{KEY.enter}</kbd>}</button>
                </>
              ) : reveal ? (
                <button className="btn primary" onClick={next}>
                  {lastSeq ? tr('🏆 Classifica finale', '🏆 Final scores') : tr('Prossima sequenza', 'Next sequence')} <kbd>{KEY.enter}</kbd>
                </button>
              ) : (
                <button className="btn ghost" onClick={noSteal}>
                  ⏭ {tr('Nessuno ruba', 'Nobody steals')}
                  {teamRight ? tr(`: ${valueOf(teamRight, n)} punti a ${team?.name}`, `: ${valueOf(teamRight, n)} points to ${team?.name}`) : ''}
                </button>
              )}
            </div>
          </>
        ) : (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 {tr('Classifica finale', 'Final scores')}</button>
        )}

        <div className="team-strip">
          {game.teams.map((t, i) => {
            const on = t.id === ordering?.id;
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
