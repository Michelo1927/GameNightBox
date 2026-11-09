import { useEffect, useRef, useState } from 'react';
import { buzzKeyOf, useBuzzer } from '../../hub/buzzer';
import type { Loaded } from '../../hub/content';
import { useKeys } from '../../hub/keys';
import { useQuietMusic } from '../../hub/music';
import { youtubeId } from '../../hub/media';
import { go } from '../../hub/nav';
import { sounds } from '../../hub/sounds';
import type { Team } from '../../hub/teams';
import PlayHeader from '../../hub/components/PlayHeader';
import Ranking from '../../hub/components/Ranking';
import { usePlayer } from './player';
import type { Playlist } from './schema';
import { rightsOf, scoreOf, useMusichiere, winnerOf, type MGame } from './state';

export default function Play({ loaded }: { loaded: Loaded<Playlist> }) {
  const { slug, data } = loaded;
  const { game, setGame, undo, canUndo } = useMusichiere(slug);
  const [ranking, setRanking] = useState<null | 'normal' | 'celebrate'>(null);
  const p = usePlayer();
  useQuietMusic(); // the songs to guess are the music here
  // The host revealed the song while a team is waiting to be judged.
  const [peek, setPeek] = useState(false);
  const song = data.songs[game.index];
  const start = song?.start ?? 0;
  const listened = Math.max(0, p.time - start);
  const clipOver = listened >= game.clip;
  const buzzedTeam = game.teams.find((t) => t.id === game.buzzed);
  const winner = winnerOf(game);
  const out = game.locked;
  const canBuzz = !!song && !game.done && !game.buzzed && !game.over && !winner && out.length < game.teams.length;

  // A new song is loaded (paused) when the index changes or the player gets ready.
  const cued = useRef('');
  useEffect(() => {
    if (!p.ready || !song) return;
    const key = `${game.index}:${song.youtube}`;
    if (cued.current === key) return;
    cued.current = key;
    p.cue(youtubeId(song.youtube) ?? '', start);
  }, [p, song, game.index, start]);

  // The clip stops by itself after `clip` seconds (unless the song is over and plays for everyone).
  useEffect(() => {
    if (p.playing && clipOver && !game.done) p.pause();
  }, [p, clipOver, game.done]);

  const save = (fn: (g: MGame) => MGame) => setGame((g) => ({ ...fn(g), started: true }));
  const playClip = () => {
    if (clipOver) p.seek(start);
    p.play();
  };
  const toggle = () => (p.playing ? p.pause() : playClip());
  const again = () => {
    p.seek(start);
    p.play();
  };

  useBuzzer(game.teams, game.buzz, canBuzz, out, (id) => {
    p.pause();
    sounds.tick();
    save((g) => ({ ...g, buzzed: id }));
  });

  useEffect(() => setPeek(false), [game.buzzed]);

  const judge = (ok: boolean) => {
    if (!buzzedTeam) return;
    const id = buzzedTeam.id;
    // Once the title was on screen, the song can't go on for the other teams.
    const shown = peek;
    if (ok) {
      sounds.right();
      save((g) => ({ ...g, marks: { ...g.marks, [id]: [...(g.marks[id] ?? []).filter((m) => m === 'right'), 'right'] }, buzzed: undefined, done: true }));
      p.play();
    } else {
      sounds.wrong();
      const locked = [...game.locked, id];
      // A mistake takes no box: the team only sits out this song.
      const stillIn = shown ? [] : game.teams.filter((t) => !locked.includes(t.id));
      save((g) => ({ ...g, locked, buzzed: undefined, done: stillIn.length === 0 }));
      if (stillIn.length) playClip();
      else p.play();
    }
  };
  const reveal = () => {
    sounds.reveal();
    save((g) => ({ ...g, buzzed: undefined, done: true }));
    if (!p.playing) p.play();
  };
  const next = () => {
    p.pause();
    const nextIndex = game.index + 1;
    if (nextIndex >= data.songs.length || winner) {
      save((g) => ({ ...g, over: true }));
      setRanking('celebrate');
    } else save((g) => ({ ...g, index: nextIndex, locked: [], buzzed: undefined, done: false }));
  };

  useKeys({
    ' ': !game.buzzed && !game.over && toggle,
    Enter: buzzedTeam ? () => judge(true) : game.done ? next : undefined,
    x: !!buzzedTeam && (() => judge(false)),
    // S only after a booking: before it, revealing is "Salta" (button only, so it can't happen by mistake).
    s: !!buzzedTeam && !peek && (() => (sounds.reveal(), setPeek(true))),
    r: !game.buzzed && !game.over && again,
  });

  const scores = game.teams.map((t) => ({ ...t, score: scoreOf(game, t) }));
  const half = Math.ceil(game.teams.length / 2);
  const column = (t: Team, i: number) => {
    const rights = rightsOf(game, t.id);
    const locked = out.includes(t.id) && !game.done;
    return (
      <button
        key={t.id}
        className={`mu-col ${t.id === game.buzzed ? 'on' : ''} ${locked ? 'off' : ''}`}
        style={{ ['--team' as string]: t.color }}
        disabled={!canBuzz || out.includes(t.id)}
        onClick={() => {
          p.pause();
          sounds.tick();
          save((g) => ({ ...g, buzzed: t.id }));
        }}
      >
        <span className="key-hint">{game.buzz === 'keys' ? buzzKeyOf(game.teams, t.id) : i + 1}</span>
        <div className="mu-slots">
          {Array.from({ length: game.slots }, (_, s) => (
            // Filled from the bottom, like a level going up.
            <span key={s} className={`mu-slot ${game.slots - s <= rights ? 'right' : ''}`} />
          ))}
        </div>
        <div className="mu-name">{t.name}</div>
        <div className="mu-score">{scoreOf(game, t)}</div>
      </button>
    );
  };

  return (
    <div className="board-page mu-page">
      <PlayHeader
        back="#/musichiere"
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/musichiere/${slug}/setup`)}
      >
        <span className="pill">
          Canzone {Math.min(game.index + 1, data.songs.length)} di {data.songs.length}
        </span>
      </PlayHeader>
      <div ref={p.host} className="yt-hidden" aria-hidden />

      <div className="game-stage">
        <div className="mu-board">
          <div className="mu-side">{game.teams.slice(0, half).map((t, i) => column(t, i))}</div>

          <div className="mu-center">
            {game.over ? (
              <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 Classifica finale</button>
            ) : game.done && song ? (
              <div className="mu-reveal">
                {winner && (
                  <div className="buzzed" style={{ background: winner.color, marginBottom: 16 }}>
                    🏆 {winner.name} ha riempito la colonna!
                  </div>
                )}
                <div className="mu-title">{song.title}</div>
                <div className="mu-artist">
                  {song.artist}
                  {song.year ? ` · ${song.year}` : ''}
                </div>
              </div>
            ) : buzzedTeam ? (
              <>
                <div className="buzzed" style={{ background: buzzedTeam.color }}>🔔 {buzzedTeam.name}</div>
                {peek && song && (
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
                <div className={`mu-disc ${p.playing ? 'on' : ''}`} aria-hidden>
                  <div className="mu-label">{Math.min(game.index + 1, data.songs.length)}</div>
                </div>
                <div className="mu-bar">
                  <div style={{ width: `${Math.min(1, listened / game.clip) * 100}%` }} />
                </div>
              </>
            )}
            {p.error && !game.done && (
              <p className="cr-error">
                ⚠️ Questo video non parte: {p.error}. Premi <b>Salta</b> e passa alla prossima.
              </p>
            )}
            {!p.ready && <p className="muted">Carico il lettore YouTube…</p>}
          </div>

          <div className="mu-side">{game.teams.slice(half).map((t, i) => column(t, i + half))}</div>
        </div>

        {!game.over && (
          <div className="host-bar">
            {buzzedTeam ? (
              <>
                <button className="btn ok" onClick={() => judge(true)}>✓ Giusta <kbd>Invio</kbd></button>
                <button className="btn ko" onClick={() => judge(false)}>✗ Sbagliata <kbd>X</kbd></button>
                {!peek && (
                  <button className="btn ghost" onClick={() => (sounds.reveal(), setPeek(true))}>👁 Svela <kbd>S</kbd></button>
                )}
              </>
            ) : game.done ? (
              <>
                <button className="btn" onClick={toggle}>{p.playing ? '⏸ Ferma' : '▶ Ascolta'} <kbd>Spazio</kbd></button>
                <button className="btn primary" onClick={next}>
                  {winner || game.index + 1 >= data.songs.length ? 'Classifica finale' : 'Prossima canzone'} <kbd>Invio</kbd>
                </button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={toggle} disabled={!p.ready}>
                  {p.playing ? '⏸ Pausa' : clipOver ? '▶ Riparti' : '▶ Play'} <kbd>Spazio</kbd>
                </button>
                <button className="btn" onClick={again} disabled={!p.ready}>↺ Da capo <kbd>R</kbd></button>
                <button className="btn ghost" onClick={reveal} title="Nessuno la sa: svela titolo e artista">⏭ Salta</button>
              </>
            )}
          </div>
        )}
        {buzzedTeam && !game.over && (
          <p className="muted mu-help">
            {peek
              ? 'Canzone svelata: se è sbagliata, la canzone finisce anche per le altre squadre.'
              : 'Sentita la risposta, premi Svela per vedere titolo e artista, poi Giusta o Sbagliata.'}
          </p>
        )}
        {!game.over && !game.done && !buzzedTeam && (
          <p className="muted mu-help">
            {game.buzz === 'keys'
              ? 'Prenotatevi premendo il tasto della vostra squadra.'
              : "Chi si prenota per primo? L'host preme il numero della squadra o clicca la sua colonna."}
          </p>
        )}
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
