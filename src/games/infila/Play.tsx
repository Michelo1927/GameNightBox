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
      say({ ok: true, text: stolen ? `${ordering.name} ruba ${fullValue(n)} punti!` : `Tutto giusto! +${fullValue(n)} a ${team.name}` });
      save((g) => endSequence(stolen ? g : { ...g, teamOrder: order }, ordering.id, fullValue(n), stolen));
      return;
    }
    sounds.wrong();
    if (game.phase === 'ordine') {
      if (!others.length) {
        say({ ok: false, text: `${right} su ${n} al posto giusto` });
        save((g) => endSequence({ ...g, teamOrder: order }, team.id, valueOf(right, n)));
      } else {
        say({ ok: false, text: `${right} su ${n} al posto giusto: si può rubare!` });
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
        ? `${right} su ${n} al posto giusto: ${ordering.name} non ruba`
        : kept
          ? `${right} su ${n}: nessuno ruba, ${kept} punti a ${team.name}`
          : `${right} su ${n}: nessuno ruba, niente punti`,
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
    .map((t) => `${t.name}: tasto ${buzzKeyOf(game.teams, t.id)}`)
    .join(' · ');
  const lockedNames = game.teams.filter((t) => game.locked.includes(t.id) && t.id !== team?.id).map((t) => t.name);
  const phaseLabel = !seq ? 'Fine' : game.phase === 'ordine' ? `Gioca ${team?.name ?? ''}` : game.phase === 'rubata' ? 'Si può rubare' : 'Sequenza finita';
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
        <span className="pill" key={game.index}>Sequenza {Math.min(game.index + 1, total)} di {total}</span>
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
              {seq.source && <small>Fonte: {seq.source}</small>}
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
                        <span className="if-num">{k + 1}°</span>
                        <b>{cards[k].text}</b>
                        <span className="if-value">{cards[k].value}</span>
                        {!ok && said >= 0 && <small>detto {said + 1}°</small>}
                      </div>
                    );
                  }
                  const c = game.placed[k];
                  return c === null || c === undefined ? (
                    <div key={k} className="if-slot empty">
                      <span className="if-num">{k + 1}°</span>
                    </div>
                  ) : (
                    <button
                      key={k}
                      className="if-slot if-card"
                      disabled={!editing}
                      onClick={() => unplace(k)}
                      title={editing ? 'Togli dalla fila' : undefined}
                    >
                      <span className="if-num">{k + 1}°</span>
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
                      <button key={c} className="if-card" onClick={() => place(c)} title="Metti al prossimo posto libero">
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
                        ? `🎉 ${winner.name} ruba ${game.won} punti`
                        : `${game.won === fullValue(n) ? '🎉 Tutto giusto! ' : ''}${winner.name} prende ${game.won} punti`
                      : 'Nessuno prende punti'}
                  </b>
                  <span className="muted">
                    {game.stolen || teamRight === n ? 'Ecco i valori.' : `${team?.name} aveva ${teamRight} carte su ${n} al posto giusto.`}{' '}
                    {lastSeq ? "Era l'ultima sequenza." : 'Invio per la prossima.'}
                  </span>
                </>
              ) : game.phase === 'ordine' && team ? (
                <>
                  <b style={{ color: team.color }}>{team.name}: in che ordine?</b>
                  <span>
                    {full
                      ? 'Fila completa: Invio per controllare.'
                      : 'Host: tocca le carte nell\'ordine che dicono. Tocca una carta nella fila per toglierla.'}{' '}
                    <span className="muted">Tutto giusto: {fullValue(n)} punti.</span>
                  </span>
                </>
              ) : buzzed ? (
                <>
                  <b style={{ color: buzzed.color }}>🔔 Ruba {buzzed.name}</b>
                  <span>
                    Cambiate l'ordine come volete: tocca una carta nella fila per toglierla e rimetterla. Se è tutto giusto, {buzzed.name} prende{' '}
                    {fullValue(n)} punti.
                  </span>
                </>
              ) : (
                <>
                  <b>
                    {lastBy?.name}: <span className="if-count">{game.right} su {n}</span> al posto giusto. Chi ruba?
                  </b>
                  <span>{game.buzz === 'keys' ? keysLine : "Alzate la mano: l'host tocca la squadra più veloce (o preme il suo numero)."}</span>
                  {lockedNames.length > 0 && <span className="muted">{lockedNames.join(', ')}: già provato, fuori da questa rubata.</span>}
                </>
              )}
            </div>

            <div className="if-flash">{flash && <span key={flash.text} className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

            <div className="host-bar">
              {editing ? (
                <>
                  <button className="btn ghost" onClick={clear} disabled={game.placed.every((c) => c === null)}>Svuota la fila</button>
                  <button className="btn primary" onClick={check} disabled={!full}>✓ Controlla {full && <kbd>Invio</kbd>}</button>
                </>
              ) : reveal ? (
                <button className="btn primary" onClick={next}>
                  {lastSeq ? '🏆 Classifica finale' : 'Prossima sequenza'} <kbd>Invio</kbd>
                </button>
              ) : (
                <button className="btn ghost" onClick={noSteal}>
                  ⏭ Nessuno ruba{teamRight ? `: ${valueOf(teamRight, n)} punti a ${team?.name}` : ''}
                </button>
              )}
            </div>
          </>
        ) : (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale</button>
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
