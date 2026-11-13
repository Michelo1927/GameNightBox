import { useEffect, useRef, useState } from 'react';
import { buzzKeyOf, useBuzzer } from '../../hub/buzzer';
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
import { loadGame, rightsOf, scoreOf, useMusichiere, winnerOf, type MGame } from './state';
import TurnPlay from './TurnPlay';
import { KEY, tr } from '../../hub/i18n';

/** The mode is chosen in the setup, so it can't change while this page is open. */
export default function Play({ loaded }: { loaded: Loaded<Playlist> }) {
  return loadGame(loaded.slug)?.mode === 'turni' ? <TurnPlay loaded={loaded} /> : <BuzzPlay loaded={loaded} />;
}

/** "A prenotazione": every team on the same song, the first to book answers. */
function BuzzPlay({ loaded }: { loaded: Loaded<Playlist> }) {
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
        <div className="mu-score"><AnimatedNumber value={scoreOf(game, t)} /></div>
      </button>
    );
  };

  return (
    <div className="board-page mu-page">
      <PlayHeader
        title={data.title}
        undo={undo}
        canUndo={canUndo}
        onRanking={() => setRanking(game.over ? 'celebrate' : 'normal')}
        onSetup={() => go(`/musichiere/${slug}/setup`)}
      >
        <span className="pill" key={game.index}>
          {tr(`Canzone ${Math.min(game.index + 1, data.songs.length)} di ${data.songs.length}`, `Song ${Math.min(game.index + 1, data.songs.length)} of ${data.songs.length}`)}
        </span>
      </PlayHeader>
      <div ref={p.host} className="yt-hidden" aria-hidden />

      <div className="game-stage">
        <div className="mu-board">
          <div className="mu-side">{game.teams.slice(0, half).map((t, i) => column(t, i))}</div>

          <div className="mu-center">
            {game.over ? (
              <button className="btn primary big" onClick={() => setRanking('celebrate')}>🏆 {tr('Classifica finale', 'Final scores')}</button>
            ) : game.done && song ? (
              <div className="mu-reveal">
                {winner && (
                  <div className="buzzed" style={{ background: winner.color, marginBottom: 16 }}>
                    🏆 {winner.name} {tr('ha riempito la colonna!', 'filled the column!')}
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
                {tr(
                  <>⚠️ Questo video non parte: {p.error}. Premi <b>Salta</b> e passa alla prossima.</>,
                  <>⚠️ This video won't start: {p.error}. Press <b>Skip</b> and go to the next one.</>,
                )}
              </p>
            )}
            {!p.ready && <p className="muted">{tr('Carico il lettore YouTube…', 'Loading the YouTube player…')}</p>}
          </div>

          <div className="mu-side">{game.teams.slice(half).map((t, i) => column(t, i + half))}</div>
        </div>

        {!game.over && (
          <div className="host-bar">
            {buzzedTeam ? (
              <>
                <button className="btn ok" onClick={() => judge(true)}>✓ {tr('Giusta', 'Right')} <kbd>{KEY.enter}</kbd></button>
                <button className="btn ko" onClick={() => judge(false)}>✗ {tr('Sbagliata', 'Wrong')} <kbd>X</kbd></button>
                {!peek && (
                  <button className="btn ghost" onClick={() => (sounds.reveal(), setPeek(true))}>👁 {tr('Svela', 'Reveal')} <kbd>S</kbd></button>
                )}
              </>
            ) : game.done ? (
              <>
                <button className="btn" onClick={toggle}>{p.playing ? tr('⏸ Ferma', '⏸ Stop') : tr('▶ Ascolta', '▶ Listen')} <kbd>{KEY.space}</kbd></button>
                <button className="btn primary" onClick={next}>
                  {winner || game.index + 1 >= data.songs.length ? tr('Classifica finale', 'Final scores') : tr('Prossima canzone', 'Next song')} <kbd>{KEY.enter}</kbd>
                </button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={toggle} disabled={!p.ready}>
                  {p.playing ? tr('⏸ Pausa', '⏸ Pause') : clipOver ? tr('▶ Riparti', '▶ Play again') : '▶ Play'} <kbd>{KEY.space}</kbd>
                </button>
                <button className="btn" onClick={again} disabled={!p.ready}>↺ {tr('Da capo', 'From the start')} <kbd>R</kbd></button>
                <button className="btn ghost" onClick={reveal} title={tr('Nessuno la sa: svela titolo e artista', 'Nobody knows: reveal title and artist')}>⏭ {tr('Salta', 'Skip')}</button>
              </>
            )}
          </div>
        )}
        {buzzedTeam && !game.over && (
          <p className="muted mu-help">
            {peek
              ? tr('Canzone svelata: se è sbagliata, la canzone finisce anche per le altre squadre.', "Song revealed: if it's wrong, the song is over for the other teams too.")
              : tr('Sentita la risposta, premi Svela per vedere titolo e artista, poi Giusta o Sbagliata.', 'Once you hear the answer, press Reveal to see title and artist, then Right or Wrong.')}
          </p>
        )}
        {!game.over && !game.done && !buzzedTeam && (
          <p className="muted mu-help">
            {game.buzz === 'keys'
              ? tr('Prenotatevi premendo il tasto della vostra squadra.', "Buzz in by pressing your team's key.")
              : tr("Chi si prenota per primo? L'host preme il numero della squadra o clicca la sua colonna.", "Who buzzes in first? The host presses the team's number or clicks its column.")}
          </p>
        )}
      </div>

      {ranking && <Ranking teams={scores} celebrate={ranking === 'celebrate'} onClose={() => setRanking(null)} />}
    </div>
  );
}
