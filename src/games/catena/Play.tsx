import { useEffect, useRef, useState } from 'react';
import { buzzKeyOf, useBuzzer } from '../../hub/buzzer';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import { sameAnswer } from '../../hub/text';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import { CHAIN_LENGTH, CLUES, type CatenaSet } from './schema';
import { finalValue, playable, scoreOf, startChain, startFinal, useCatena, wordLength, wordValue, type CGame } from './state';

type Flash = { ok: boolean; text: string } | null;

function Tiles({ word, shown, solved }: { word: string; shown: number; solved?: boolean }) {
  const chars = [...word.trim().toUpperCase()];
  return (
    <div className={`tiles ${solved ? 'solved' : ''}`}>
      {chars.map((c, i) => (
        <span key={i} className={`tile ${i < shown ? '' : 'hidden'}`}>{i < shown ? c : '·'}</span>
      ))}
    </div>
  );
}

export default function Play({ loaded }: { loaded: Loaded<CatenaSet> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = useCatena(slug, data);
  const [guess, setGuess] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);
  // Explanation shown before the first final word (until the host starts it).
  const [introSeen, setIntroSeen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const finali = data.finali ?? [];
  const n = game.teams.length;

  const chain = game.stage === 'catena' ? data.catene[game.index] : undefined;
  const final = game.stage === 'finale' ? finali[game.index] : undefined;
  const team = game.teams[game.turn % Math.max(n, 1)];
  const buzzedTeam = game.teams.find((t) => t.id === game.buzzed);
  const options = chain ? playable(game) : [];
  const selected = options.includes(game.selected) ? game.selected : options[0];
  const chainDone = !!chain && game.solved.every(Boolean);

  useEffect(() => {
    setGuess('');
    input.current?.focus();
  }, [game.index, game.stage, game.turn, game.selected, game.buzzed]);

  const save = (fn: (g: CGame) => CGame) => setGame((g) => ({ ...fn(g), started: true }));
  const say = (f: Flash) => {
    setFlash(f);
    setTimeout(() => setFlash((now) => (now === f ? null : now)), 2500);
  };

  // --- chain ---
  const solveWord = (ok: boolean) => {
    if (!chain || selected === undefined || !team) return;
    const word = chain.words[selected];
    if (ok) {
      sounds.right();
      const value = wordValue(word, game.shown[selected]);
      say({ ok: true, text: `+${value} a ${team.name}` });
      save((g) => {
        const solved = g.solved.map((s, i) => s || i === selected);
        const shown = g.shown.map((s, i) => (i === selected ? wordLength(word) : s));
        const next = { ...g, solved, shown, points: { ...g.points, [team.id]: (g.points[team.id] ?? 0) + value } };
        const after = playable(next);
        // Stay on the same side of the chain when possible.
        const near = after.find((i) => Math.abs(i - selected) === 1) ?? after[0] ?? 1;
        return { ...next, selected: near };
      });
    } else {
      sounds.wrong();
      say({ ok: false, text: `No! Tocca a ${game.teams[(game.turn + 1) % n]?.name ?? ''}` });
      save((g) => ({
        ...g,
        shown: g.shown.map((s, i) => (i === selected ? Math.min(wordLength(word) - 1, s + 1) : s)),
        turn: (g.turn + 1) % n,
      }));
    }
  };
  const check = () => {
    if (!guess.trim()) return;
    if (chain && selected !== undefined) solveWord(sameAnswer(guess, chain.words[selected]));
    else if (final && buzzedTeam) solveFinal(sameAnswer(guess, final.answer));
  };
  const move = (d: number) => {
    if (!options.length) return;
    const i = options.indexOf(selected ?? options[0]);
    save((g) => ({ ...g, selected: options[(i + d + options.length) % options.length] }));
  };
  const nextRound = () => {
    if (game.stage === 'catena' && game.index + 1 < data.catene.length) save((g) => startChain(g, data, g.index + 1));
    else if (game.stage === 'catena' && finali.length) save((g) => startFinal(g, 0));
    else if (game.stage === 'finale' && game.index + 1 < finali.length) save((g) => startFinal(g, g.index + 1));
    else {
      save((g) => ({ ...g, stage: 'over' }));
      setRanking('celebrate');
    }
  };

  // --- final words ---
  const fresh = !!final && game.index === 0 && game.clues === 1 && !game.locked.length && !game.done && !game.buzzed;
  const intro = fresh && !introSeen;
  const buzzing = !!final && !game.done && !game.buzzed && !intro;
  useBuzzer(game.teams, game.buzz, buzzing, game.locked, (id) => {
    sounds.tick();
    save((g) => ({ ...g, buzzed: id }));
  });
  const solveFinal = (ok: boolean) => {
    if (!final || !buzzedTeam) return;
    if (ok) {
      sounds.right();
      const value = finalValue(game.clues, CLUES);
      say({ ok: true, text: `+${value} a ${buzzedTeam.name}` });
      save((g) => ({ ...g, done: true, buzzed: undefined, foundBy: buzzedTeam.id, points: { ...g.points, [buzzedTeam.id]: (g.points[buzzedTeam.id] ?? 0) + value } }));
    } else {
      sounds.wrong();
      say({ ok: false, text: `${buzzedTeam.name} sbaglia ed è fuori da questa parola` });
      save((g) => {
        const locked = [...g.locked, buzzedTeam.id];
        return { ...g, locked, buzzed: undefined, done: locked.length >= g.teams.length };
      });
    }
  };
  const moreClue = () => save((g) => ({ ...g, clues: Math.min(CLUES, g.clues + 1) }));
  const revealFinal = () => {
    sounds.reveal();
    save((g) => ({ ...g, done: true, buzzed: undefined, foundBy: undefined }));
  };

  useKeys({
    ArrowUp: !!chain && !chainDone && (() => move(-1)),
    ArrowDown: !!chain && !chainDone && (() => move(1)),
    Enter: intro ? () => setIntroSeen(true) : chainDone || (final && game.done) ? nextRound : check,
    ' ': buzzing && game.clues < CLUES && moreClue,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const phaseLabel = chain
    ? `Catena ${game.index + 1} di ${data.catene.length}`
    : final
      ? `Finale ${game.index + 1} di ${finali.length}`
      : 'Fine';
  const lastRound = game.stage === 'finale' ? game.index + 1 >= finali.length : game.index + 1 >= data.catene.length && !finali.length;

  return (
    <div className="board-page ct-page">
      <PlayHeader
        back="#/catena"
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.stage === 'over' ? 'celebrate' : 'normal')}
        onSetup={() => go(`/catena/${slug}/setup`)}
      >
        <span className="pill">{phaseLabel}</span>
        {chain && !chainDone && team && (
          <span className="pill" style={{ color: team.color }}>Tocca a {team.name}</span>
        )}
      </PlayHeader>

      <div className="game-stage">
        {chain && (
          <div className="ct-chain">
            {chain.words.map((w, i) => {
              const solved = game.solved[i];
              const can = options.includes(i) && !chainDone;
              return (
                <div key={i} className="ct-row">
                  <button
                    className={`ct-word ${solved ? 'solved' : ''} ${i === selected && !chainDone ? 'on' : ''} ${can ? 'can' : ''}`}
                    disabled={!can}
                    onClick={() => save((g) => ({ ...g, selected: i }))}
                  >
                    <Tiles word={w} shown={game.shown[i]} />
                    {!solved && <span className="ct-value">{wordValue(w, game.shown[i])}</span>}
                  </button>
                  {chainDone && chain.links?.[i] && i < CHAIN_LENGTH - 1 && <div className="ct-link">↓ {chain.links[i]}</div>}
                </div>
              );
            })}
          </div>
        )}

        {final && intro && (
          <div className="ct-intro">
            <div className="ct-final-tag">🔔 La finale</div>
            <h2>Una parola misteriosa, cinque indizi</h2>
            <ol>
              <li>Compare un indizio alla volta: tutti gli indizi sono legati alla parola misteriosa.</li>
              <li>
                Chi crede di saperla <b>si prenota</b>:{' '}
                {game.buzz === 'keys' ? 'ogni squadra preme il suo tasto.' : "alza la mano e l'host sceglie la squadra più veloce."}
              </li>
              <li>La squadra prenotata dice la risposta. Se sbaglia è fuori per questa parola.</li>
              <li>
                <b>Meno indizi servono, più punti valgono</b>: da {finalValue(1, CLUES)} con un indizio a {finalValue(CLUES, CLUES)} con tutti.
              </li>
            </ol>
            {game.buzz === 'keys' && (
              <div className="ct-keys">
                {game.teams.map((t) => (
                  <span key={t.id} style={{ borderColor: t.color }}>
                    {t.name} <kbd>{buzzKeyOf(game.teams, t.id)}</kbd>
                  </span>
                ))}
              </div>
            )}
            <button className="btn primary big" onClick={() => setIntroSeen(true)}>Mostra il primo indizio <kbd>Invio</kbd></button>
          </div>
        )}

        {final && !intro && (
          <div className="ct-final">
            <div className="ct-final-tag">🔔 Finale · parola {game.index + 1} di {finali.length}</div>
            <div className="ct-clues">
              {final.clues.map((c, i) => {
                const open = i < game.clues || game.done;
                const now = !game.done && i === game.clues - 1;
                return (
                  <div key={i} className={`ct-clue ${open ? '' : 'hidden'} ${now ? 'now' : ''}`}>
                    <small>Indizio {i + 1}</small>
                    <b>{open ? c.toUpperCase() : '?'}</b>
                    <span className="ct-clue-pts">{finalValue(i + 1, CLUES)} punti</span>
                  </div>
                );
              })}
            </div>
            <div className="ct-answer">
              <Tiles word={final.answer} shown={game.done ? wordLength(final.answer) : 1} solved={game.done} />
              {!game.done && <span className="muted">{wordLength(final.answer)} lettere</span>}
            </div>

            <div className="ct-guide">
              {game.done ? (
                <>
                  <b>{game.foundBy ? `🎉 ${game.teams.find((t) => t.id === game.foundBy)?.name} l'ha trovata!` : "Nessuno l'ha trovata"}</b>
                </>
              ) : buzzedTeam ? (
                <>
                  <b style={{ color: buzzedTeam.color }}>🔔 Risponde {buzzedTeam.name}</b>
                  <span>
                    Per {finalValue(game.clues, CLUES)} punti. Host: scrivi la risposta che dicono e premi Invio (oppure ✓ / ✗).
                  </span>
                </>
              ) : (
                <>
                  <b>Chi la sa? Prenotatevi!</b>
                  <span>
                    {game.buzz === 'keys'
                      ? game.teams
                          .filter((t) => !game.locked.includes(t.id))
                          .map((t) => `${t.name}: tasto ${buzzKeyOf(game.teams, t.id)}`)
                          .join(' · ')
                      : "Alzate la mano: l'host tocca la squadra più veloce (o preme il suo numero)."}
                  </span>
                  <span className="muted">
                    {game.locked.length > 0 &&
                      `${game.teams
                        .filter((t) => game.locked.includes(t.id))
                        .map((t) => t.name)
                        .join(', ')} ha sbagliato ed è fuori da questa parola. `}
                    {game.clues < CLUES
                      ? `Nessuno la sa? L'host mostra un altro indizio (vale ${finalValue(game.clues + 1, CLUES)} punti).`
                      : "Era l'ultimo indizio: se nessuno la sa, l'host la svela."}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {game.stage === 'over' && (
          <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale</button>
        )}

        <div className="ct-flash">{flash && <span className={flash.ok ? 'flash-ok' : 'flash-ko'}>{flash.text}</span>}</div>

        {((chain && !chainDone) || (final && buzzedTeam && !game.done)) && (
          <div className="host-bar">
            <div className="guess">
              <input
                ref={input}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Scrivi la risposta della squadra"
                aria-label="Risposta della squadra"
              />
              <button className="btn primary" onClick={check} disabled={!guess.trim()}>Controlla <kbd>Invio</kbd></button>
            </div>
            <button className="btn ok" onClick={() => (chain ? solveWord(true) : solveFinal(true))} title="Se la risposta è giusta senza scriverla">✓ Giusta</button>
            <button className="btn ko" onClick={() => (chain ? solveWord(false) : solveFinal(false))}>✗ Sbagliata</button>
          </div>
        )}
        {final && !intro && !game.done && !buzzedTeam && (
          <div className="host-bar">
            {game.clues < CLUES && (
              <button className="btn primary" onClick={moreClue}>➕ Altro indizio <kbd>Spazio</kbd></button>
            )}
            <button className={`btn ${game.clues >= CLUES ? 'primary' : 'ghost'}`} onClick={revealFinal}>⏭ Nessuno la sa: svela</button>
          </div>
        )}
        {(chainDone || (final && game.done)) && (
          <button className="btn primary big" onClick={nextRound}>
            {lastRound ? 'Classifica finale' : game.stage === 'catena' && game.index + 1 >= data.catene.length ? 'Alla finale' : 'Avanti'} <kbd>Invio</kbd>
          </button>
        )}
        {chain && !chainDone && <p className="muted ct-help">La squadra sceglie una parola accanto a una già scoperta (↑ ↓ o clic), poi risponde.</p>}

        <div className="team-strip">
          {game.teams.map((t, i) => {
            const on = chain ? i === game.turn % n && !chainDone : t.id === game.buzzed;
            const off = final && game.locked.includes(t.id);
            return (
              <button
                key={t.id}
                className={`team-chip ${on ? 'on' : ''} ${off ? 'off' : ''}`}
                style={{ borderLeftColor: t.color }}
                disabled={!buzzing || !!off}
                onClick={() => save((g) => ({ ...g, buzzed: t.id }))}
              >
                {final && <span className="key-hint">{game.buzz === 'keys' ? buzzKeyOf(game.teams, t.id) : i + 1}</span>}
                {t.name}
                <span className="score">{scoreOf(game, t)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
