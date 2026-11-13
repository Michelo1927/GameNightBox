import { useState, type ReactNode } from 'react';
import type { Team } from '../teams';
import OrderWheel from './OrderWheel';
import TeamList from './TeamList';
import BackButton from './BackButton';
import { ask } from '../ask';
import { tr } from '../i18n';

interface Props {
  back: string;
  backLabel: string;
  title: string;
  description?: string;
  teams: Team[];
  setTeams: (update: (teams: Team[]) => Team[]) => void;
  maxTeams?: number;
  /** A game is in progress: "Continua" instead of "Inizia", and no order wheel. */
  started: boolean;
  onPlay: () => void;
  onRestart: () => void;
  /** Why the game can't start yet (e.g. not enough wheels for the teams). */
  blocked?: string;
  /** Whether the order wheel decides who starts (not where every team plays the same thing at once). Default: yes. */
  wheel?: boolean;
  /** The game's own options. */
  children?: ReactNode;
}

/** Teams + options + start, shared by the games. A new game with several teams starts with the order wheel. */
export default function SetupPage({ back, backLabel, title, description, teams, setTeams, maxTeams, started, onPlay, onRestart, blocked, wheel: withWheel = true, children }: Props) {
  const [wheel, setWheel] = useState(false);
  const start = () => (withWheel && !started && teams.length > 1 ? setWheel(true) : onPlay());

  return (
    <div className={`page setup theme-${back.replace(/^#\//, '').split('/')[0]}`}>
      <BackButton label={backLabel.replace(/^←\s*/, '')} />
      <h1 className="title">{title}</h1>
      {description && <p className="muted">{description}</p>}

      <h2>{tr('Squadre', 'Teams')}</h2>
      {withWheel && <p className="muted">{tr("L'ordine lo decide la ruota quando inizi la partita.", 'The wheel decides the order when you start the game.')}</p>}
      <TeamList teams={teams} onChange={setTeams} max={maxTeams} />

      {children && (
        <>
          <h2>{tr('Opzioni', 'Options')}</h2>
          <div className="options">{children}</div>
        </>
      )}

      {blocked && <p className="cr-error">{blocked}</p>}
      <div className="setup-actions">
        <button className="btn primary big" onClick={start} disabled={teams.length === 0 || !!blocked}>
          {started ? tr('Continua la partita', 'Continue the game') : tr('Inizia la partita', 'Start the game')}
        </button>
        {started && (
          <button className="btn ghost" onClick={async () => (await ask(tr('Ricominciare da capo? I punti si azzerano.', 'Start over? The points go back to zero.'), tr('Ricomincia', 'Start over'))) && onRestart()}>
            {tr('Nuova partita (azzera punti)', 'New game (reset points)')}
          </button>
        )}
      </div>

      {wheel && (
        <OrderWheel
          teams={teams}
          onDone={(order) => {
            setTeams(() => order);
            onPlay();
          }}
          onSkip={onPlay}
          onClose={() => setWheel(false)}
        />
      )}
    </div>
  );
}

/** A row of choices for an option (e.g. seconds per team). */
export function Choice<V extends string | number>({ label, value, options, onChange }: { label: ReactNode; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="option">
      <span>{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={String(o.value)} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
