import { useEffect } from 'react';
import type { Team } from '../teams';
import { activeFor, finishCurrent, pageOf, sameTeams, setTournament, useTournament } from '../tournament';
import { go } from '../nav';
import { tr } from '../i18n';

const fresh = (teams: Team[]) => teams.map((t) => ({ ...t, adjust: 0 }));

interface SetupArgs {
  game: string;
  slug: string;
  title: string;
  teams: Team[];
  setTeams: (update: (teams: Team[]) => Team[]) => void;
  /** The game on this content is already under way. */
  started: boolean;
  /** Starts the game over (points to zero), keeping the options. */
  restart: () => void;
}

/**
 * On a game's setup page: when the tournament is playing this game, the game gets the tournament's teams (and starts
 * over the first time this content is opened for the tournament). Returns whether the page is a tournament game and
 * what to call when it starts.
 */
export function useTournamentSetup({ game, slug, title, teams, setTeams, started, restart }: SetupArgs) {
  const t = useTournament();
  const cur = activeFor(t, game, slug);

  useEffect(() => {
    if (!t || !cur) return;
    if (cur.slug !== slug) {
      // First time this content is opened for the tournament: a clean game with the tournament's teams.
      if (started) restart();
      setTeams(() => fresh(t.teams));
      setTournament((tt) => (tt.current ? { ...tt, current: { ...tt.current, slug, title } } : tt));
      return;
    }
    if (!sameTeams(teams, t.teams)) return setTeams(() => fresh(t.teams));
    // Names and colours changed on the tournament page.
    const changed = teams.some((x) => {
      const y = t.teams.find((z) => z.id === x.id);
      return y && (y.name !== x.name || y.color !== x.color);
    });
    if (changed) setTeams((ts) => ts.map((x) => {
      const y = t.teams.find((z) => z.id === x.id);
      return y ? { ...x, name: y.name, color: y.color } : x;
    }));
  });

  return {
    active: !!cur,
    markStarted: () => {
      if (cur) setTournament((tt) => (tt.current ? { ...tt, current: { ...tt.current, slug, title, started: true } } : tt));
    },
  };
}

/** In place of the team editor on a tournament game's setup page: the teams are the tournament's. */
export function TournamentTeams({ teams }: { teams: Team[] }) {
  return (
    <>
      <div className="trn-note">
        🏆 {tr('Partita del torneo: le squadre sono quelle del torneo.', "Tournament game: the teams are the tournament's.")}{' '}
        <a href="#/torneo">{tr('Torna al torneo', 'Back to the tournament')}</a>
      </div>
      <div className="trn-teams">
        {teams.map((t) => (
          <span key={t.id} className="trn-team" style={{ borderColor: t.color }}>
            <i style={{ background: t.color }} />
            {t.name}
          </span>
        ))}
      </div>
    </>
  );
}

/** On a game's page (its contents), when the tournament's wheel has just picked it: choose what to play. */
export function TournamentPick({ game, name }: { game: string; name: string }) {
  const t = useTournament();
  if (!activeFor(t, game)) return null;
  return (
    <div className="trn-note trn-pick">
      🏆 {tr(`Torneo: scegli con che cosa giocare a ${name}`, `Tournament: choose what to play in ${name}`)}{' '}
      <a href="#/torneo">{tr('Torna al torneo', 'Back to the tournament')}</a>
    </div>
  );
}

/** In the final ranking of a tournament game: gives the tournament points and goes back to the tournament. */
export function TournamentFinish({ teams }: { teams: (Team & { score: number })[] }) {
  const t = useTournament();
  const { game, slug } = pageOf();
  const cur = activeFor(t, game, slug);
  if (!cur?.started) return null;
  return (
    <button
      className="btn primary big trn-finish"
      onClick={() => {
        finishCurrent(Object.fromEntries(teams.map((x) => [x.id, x.score])));
        go('/torneo');
      }}
    >
      🏆 {tr('Torna al torneo e assegna i punti', 'Back to the tournament and give the points')}
    </button>
  );
}
