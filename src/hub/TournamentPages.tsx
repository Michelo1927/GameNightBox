import { useEffect, useState } from 'react';
import type { Game } from './games';
import { go } from './nav';
import { ask } from './ask';
import { sounds } from './sounds';
import { newTeam, type Team } from './teams';
import { isOver, pointsScale, remaining, setTournament, standings, useTournament, type Tournament } from './tournament';
import BackButton from './components/BackButton';
import { IconDisk } from './components/GameIcon';
import Ranking from './components/Ranking';
import TeamList from './components/TeamList';
import { useSpinWheel, WheelFace } from './components/SpinWheel';
import { KEY, tr } from './i18n';
import './tournament.css';

// Pages of the tournament: #/torneo (the tournament under way) and #/torneo/nuovo (a new one).

/** Most times the same game can go in the wheel. */
const MAX_REPEATS = 5;

const scaleText = (n: number) => tr(`A ogni gioco, con ${n} squadre: ${pointsScale(n).join(' · ')} punti`, `Every game, with ${n} teams: ${pointsScale(n).join(' · ')} points`);
const progressOf = (t: Tournament) => Math.min(t.played.length + 1, t.games.length);

/** The card on the hub's home page. */
export function TournamentCard() {
  const t = useTournament();
  const going = t && !isOver(t);
  return (
    <div className="trn-card">
      <span className="trn-cup" aria-hidden>🏆</span>
      <span className="trn-card-text">
        <b>{tr('Torneo', 'Tournament')}</b>
        <span className="muted">{tr('Più giochi, stesse squadre, una classifica unica', 'Several games, the same teams, one ranking')}</span>
      </span>
      {t && (
        <a className="btn ghost" href="#/torneo">
          {going
            ? tr(`Riprendi · gioco ${progressOf(t)} di ${t.games.length}`, `Resume · game ${progressOf(t)} of ${t.games.length}`)
            : tr('Ultimo torneo', 'Last tournament')}
        </a>
      )}
      <a className="btn primary" href="#/torneo/nuovo">{tr('Nuovo torneo', 'New tournament')}</a>
    </div>
  );
}

export function TournamentRoute({ games, view }: { games: Game[]; view?: string }) {
  if (view === 'nuovo') return <NewTournament games={games} />;
  return <TournamentPage games={games} />;
}

function NewTournament({ games }: { games: Game[] }) {
  const old = useTournament();
  const [teams, setTeams] = useState<Team[]>(() => (old ? old.teams.map((t) => ({ ...t, adjust: 0 })) : [newTeam(0), newTeam(1)]));
  /** How many times each game goes in the wheel (0 = not in the tournament). */
  const [counts, setCounts] = useState<Record<string, number>>({});
  const countOf = (id: string) => counts[id] ?? 0;
  const setCount = (id: string, n: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(MAX_REPEATS, n)) }));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const allOn = games.every((g) => countOf(g.id) > 0);
  const missing =
    teams.length < 2
      ? tr('Servono almeno 2 squadre', 'At least 2 teams are needed')
      : total < 2
        ? tr('Scegli almeno 2 giochi', 'Choose at least 2 games')
        : '';

  const start = async () => {
    if (missing) return;
    if (old && !isOver(old) && old.played.length + (old.current ? 1 : 0) > 0) {
      const ok = await ask(tr('C\'è un torneo in corso: iniziarne uno nuovo lo cancella. Continuare?', 'A tournament is under way: starting a new one deletes it. Go on?'), tr('Nuovo torneo', 'New tournament'));
      if (!ok) return;
    }
    setTournament({
      teams: teams.map((t) => ({ ...t, adjust: 0 })),
      // In the order of the home page, not the order they were tapped; a game chosen more times is there more times.
      games: games.flatMap((g) => Array<string>(countOf(g.id)).fill(g.id)),
      played: [],
      created: Date.now(),
    });
    go('/torneo');
  };

  return (
    <div className="page setup trn-page">
      <BackButton label={tr('Tutti i giochi', 'All games')} />
      <h1 className="title">🏆 {tr('Nuovo torneo', 'New tournament')}</h1>
      <p className="muted">
        {tr(
          'Le squadre restano le stesse per tutto il torneo. A ogni gioco la ruota sceglie il prossimo tra quelli rimasti, e la classifica del gioco dà i punti del torneo.',
          'The teams stay the same for the whole tournament. Each time the wheel picks the next game among those left, and the game’s ranking gives the tournament points.',
        )}
      </p>

      <h2>{tr('Squadre', 'Teams')}</h2>
      <TeamList teams={teams} onChange={(fn) => setTeams(fn)} />

      <h2>
        {tr('Giochi', 'Games')} <span className="muted trn-count">{tr(`${total} partite`, `${total} games`)}</span>
      </h2>
      <p className="muted">{tr('Tocca un gioco per metterlo nella ruota; con + lo metti più volte (ogni volta una partita a sé, anche con un altro contenuto).', 'Tap a game to put it in the wheel; with + it goes in more times (each time a game of its own, with any content).')}</p>
      <div className="trn-games">
        {games.map((g) => {
          const n = countOf(g.id);
          return (
            <div key={g.id} className={`trn-game theme-${g.id} ${n ? 'on' : ''}`}>
              <button className="trn-game-main" onClick={() => setCount(g.id, n ? 0 : 1)} aria-pressed={n > 0}>
                <IconDisk icon={g.icon} />
                <span>{g.name}</span>
                {!n && <span className="trn-check" aria-hidden />}
              </button>
              {n > 0 && (
                <span className="trn-stepper">
                  <button onClick={() => setCount(g.id, n - 1)} aria-label={tr(`Una partita in meno di ${g.name}`, `One game less of ${g.name}`)}>−</button>
                  <b>×{n}</b>
                  <button onClick={() => setCount(g.id, n + 1)} disabled={n >= MAX_REPEATS} aria-label={tr(`Una partita in più di ${g.name}`, `One more game of ${g.name}`)}>+</button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="trn-actions">
        <button className="btn ghost" onClick={() => setCounts(allOn ? {} : Object.fromEntries(games.map((g) => [g.id, Math.max(1, countOf(g.id))])))}>
          {allOn ? tr('Togli tutti', 'Clear all') : tr('Scegli tutti', 'Choose all')}
        </button>
      </div>

      {teams.length >= 2 && <p className="muted">🏅 {scaleText(teams.length)} {tr('(chi è a pari merito prende gli stessi punti).', '(teams tied share the points).')}</p>}
      {missing && <p className="cr-error">{missing}</p>}
      <div className="setup-actions">
        <button className="btn primary big" onClick={start} disabled={!!missing}>
          {tr('Inizia il torneo', 'Start the tournament')}
        </button>
      </div>
    </div>
  );
}

function TournamentPage({ games }: { games: Game[] }) {
  const t = useTournament();
  const [ranking, setRanking] = useState(false);
  const [names, setNames] = useState(false);
  if (!t)
    return (
      <div className="page setup trn-page">
        <BackButton label={tr('Tutti i giochi', 'All games')} />
        <h1 className="title">🏆 {tr('Torneo', 'Tournament')}</h1>
        <p className="muted">{tr('Non c’è nessun torneo su questo dispositivo.', 'There is no tournament on this device.')}</p>
        <a className="btn primary big" href="#/torneo/nuovo">{tr('Nuovo torneo', 'New tournament')}</a>
      </div>
    );

  const byId = (id: string) => games.find((g) => g.id === id);
  const over = isOver(t);
  const table = standings(t).sort((a, b) => b.score - a.score);
  const place = (score: number) => table.filter((x) => x.score > score).length;
  const nameOf = (id: string) => t.teams.find((x) => x.id === id);

  const end = async () => {
    if (await ask(tr('Finire il torneo adesso? I giochi non ancora finiti restano fuori.', 'End the tournament now? The games not finished yet are left out.'), tr('Finisci', 'End'))) {
      setTournament((x) => ({ ...x, ended: true, current: undefined }));
      setRanking(true);
    }
  };

  return (
    <div className="page setup trn-page">
      <BackButton label={tr('Tutti i giochi', 'All games')} />
      <h1 className="title">🏆 {tr('Torneo', 'Tournament')}</h1>
      <p className="muted">
        {over
          ? tr('Torneo finito', 'Tournament over')
          : tr(`Gioco ${progressOf(t)} di ${t.games.length} · ${scaleText(t.teams.length)}`, `Game ${progressOf(t)} of ${t.games.length} · ${scaleText(t.teams.length)}`)}
      </p>

      <div className="trn-grid">
        <section>
          <h2>{tr('Classifica', 'Ranking')}</h2>
          <ol className="trn-table">
            {table.map((x) => (
              <li key={x.id} style={{ borderColor: x.color }}>
                <span className="trn-pos">{place(x.score) + 1}</span>
                <i style={{ background: x.color }} />
                <span className="trn-name">{x.name}</span>
                <b>{x.score}</b>
              </li>
            ))}
          </ol>

          <h2>{tr('Giochi', 'Games')}</h2>
          <ul className="trn-list">
            {t.played.map((p, i) => {
              const best = Math.max(...Object.values(p.points));
              const winners = Object.entries(p.points).filter(([, v]) => v === best).map(([id]) => nameOf(id)?.name).filter(Boolean);
              return (
                <li key={i} className={`theme-${p.game}`}>
                  <span className="trn-state ok">✓</span>
                  <span className="trn-what">
                    <b>{byId(p.game)?.name ?? p.game}</b> <span className="muted">· {p.title}</span>
                  </span>
                  <span className="muted">{tr(`vince ${winners.join(' e ')}`, `${winners.join(' and ')} won`)}</span>
                </li>
              );
            })}
            {t.current && !over && (
              <li className={`theme-${t.current.game} now`}>
                <span className="trn-state">▶</span>
                <span className="trn-what">
                  <b>{byId(t.current.game)?.name}</b> {t.current.title && <span className="muted">· {t.current.title}</span>}
                </span>
                <span className="muted">{t.current.started ? tr('in corso', 'being played') : tr('tocca a questo', 'up next')}</span>
              </li>
            )}
            {!over &&
              remaining(t).map((id, i) => (
                <li key={`${id}-${i}`} className={`theme-${id}`}>
                  <span className="trn-state">○</span>
                  <span className="trn-what">
                    <b>{byId(id)?.name ?? id}</b>
                  </span>
                  <span className="muted">{tr('nella ruota', 'in the wheel')}</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="trn-next">
          {over ? (
            <Final t={t} onRanking={() => setRanking(true)} />
          ) : t.current ? (
            <CurrentGame t={t} game={byId(t.current.game)} />
          ) : (
            <NextWheel t={t} games={games} />
          )}
        </section>
      </div>

      <div className="trn-footer">
        <button className="btn ghost" onClick={() => setNames((n) => !n)}>🎨 {tr('Nomi e colori', 'Names and colours')}</button>
        {!over && <button className="btn ghost" onClick={end}>🏁 {tr('Finisci il torneo', 'End the tournament')}</button>}
        <a className="btn ghost" href="#/torneo/nuovo">＋ {tr('Nuovo torneo', 'New tournament')}</a>
      </div>
      {names && <TeamList fixed teams={t.teams} onChange={(fn) => setTournament((x) => ({ ...x, teams: fn(x.teams) }))} />}

      {ranking && <Ranking teams={standings(t)} celebrate={over} onClose={() => setRanking(false)} />}
    </div>
  );
}

function CurrentGame({ t, game }: { t: Tournament; game?: Game }) {
  const c = t.current!;
  const back = () => setTournament((x) => ({ ...x, current: undefined }));
  return (
    <div className={`trn-current theme-${c.game}`}>
      <span className="trn-tag">{c.started ? tr('Si sta giocando', 'Being played') : tr('Tocca a', 'Up next')}</span>
      {game && <IconDisk className="trn-big-icon" icon={game.icon} />}
      <h2>{game?.name ?? c.game}</h2>
      {c.title && <p className="muted">{c.title}</p>}
      {c.started ? (
        <button className="btn primary big" onClick={() => go(`/torneo/${c.game}/${encodeURIComponent(c.slug!)}/play`)}>▶ {tr('Riprendi la partita', 'Resume the game')}</button>
      ) : c.slug ? (
        <>
          <button className="btn primary big" onClick={() => go(`/torneo/${c.game}/${encodeURIComponent(c.slug!)}/setup`)}>{tr('Continua', 'Continue')}</button>
          <button className="btn ghost" onClick={() => go(`/torneo/${c.game}`)}>{tr('Scegli un altro contenuto', 'Choose something else')}</button>
        </>
      ) : (
        <button className="btn primary big" onClick={() => go(`/torneo/${c.game}`)}>{tr('Scegli con che cosa giocare', 'Choose what to play')}</button>
      )}
      {!c.started && (
        <button className="btn ghost" onClick={back}>
          ↩ {tr('Rimetti nella ruota', 'Put it back in the wheel')}
        </button>
      )}
      {c.started && <p className="muted trn-hint">{tr('Alla fine del gioco, dalla classifica finale: "Torna al torneo".', 'At the end of the game, from the final ranking: "Back to the tournament".')}</p>}
    </div>
  );
}

function NextWheel({ t, games }: { t: Tournament; games: Game[] }) {
  const left = remaining(t);
  // A game in the wheel more times has more slices (with their own ids).
  const slices = left.map((id, i) => ({ id: `${id}-${i}`, game: id, label: games.find((g) => g.id === id)?.name ?? id, color: 'var(--accent)', className: `theme-${id}` }));
  const [picked, setPicked] = useState<string>();
  const wheel = useSpinWheel(slices, (s) => {
    setPicked(s.id);
    sounds.right();
    setTimeout(() => setTournament((x) => ({ ...x, current: { game: s.game } })), 1600);
  });
  const spin = () => !picked && wheel.spin();

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      // Not while typing a team's name (the "Nomi e colori" list is on the same page).
      if ((e.target as HTMLElement).closest?.('input, textarea, select, button, a')) return;
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        spin();
      }
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  });

  const pickedGame = slices.find((s) => s.id === picked)?.game;
  const name = games.find((g) => g.id === pickedGame)?.name;
  return (
    <div className="trn-wheel">
      <h2>{left.length === 1 ? tr('Ultimo gioco', 'Last game') : tr('Prossimo gioco', 'Next game')}</h2>
      <WheelFace slices={slices} spin={wheel} picked={picked} />
      <p className="wheel-status">
        {picked ? (
          <>
            {tr('Si gioca a', "Let's play")} <b className={`theme-${pickedGame} trn-picked`}>{name}</b>!
          </>
        ) : (
          tr('Gira la ruota per scoprire il prossimo gioco.', 'Spin the wheel to find out the next game.')
        )}
      </p>
      <button className="btn primary big" onClick={spin} disabled={wheel.spinning || !!picked}>
        {wheel.spinning ? tr('Gira…', 'Spinning…') : tr('Gira la ruota', 'Spin the wheel')} <kbd>{KEY.space}</kbd>
      </button>
    </div>
  );
}

function Final({ t, onRanking }: { t: Tournament; onRanking: () => void }) {
  const table = standings(t);
  const best = Math.max(...table.map((x) => x.score));
  const winners = table.filter((x) => x.score === best);
  return (
    <div className="trn-current trn-final">
      <span className="trn-tag">{winners.length > 1 ? tr('Pareggio!', "It's a tie!") : tr('Vince il torneo', 'Tournament winner')}</span>
      <h2>
        {winners.map((w, i) => (
          <span key={w.id} style={{ color: w.color }}>
            {i > 0 && ' & '}
            {w.name}
          </span>
        ))}
      </h2>
      <p className="muted">{tr(`${best} punti in ${t.played.length} giochi`, `${best} points in ${t.played.length} games`)}</p>
      <button className="btn primary big" onClick={onRanking}>🏆 {tr('Classifica finale', 'Final ranking')}</button>
      <a className="btn ghost" href="#/torneo/nuovo">{tr('Nuovo torneo', 'New tournament')}</a>
    </div>
  );
}
