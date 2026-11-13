import { MAX_TEAMS, newTeam, TEAM_COLORS, type Team } from '../teams';
import { tr } from '../i18n';

interface Props {
  teams: Team[];
  /** Receives a function from the current teams to the new ones (like a React state updater). */
  onChange: (update: (teams: Team[]) => Team[]) => void;
  /** Most teams allowed (default MAX_TEAMS). */
  max?: number;
}

/** Team editor shared by the games: name, color, order, add and remove. */
export default function TeamList({ teams, onChange, max = MAX_TEAMS }: Props) {
  const update = (id: string, patch: Partial<Team>) => onChange((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange((ts) => ts.filter((t) => t.id !== id));
  const add = () => onChange((ts) => [...ts, newTeam(ts.length)]);
  const move = (i: number, d: number) =>
    onChange((ts) => {
      const next = [...ts];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  return (
    <>
      <div className="team-list">
        {teams.map((t, i) => (
          <div className="team-row" key={t.id} style={{ borderColor: t.color }}>
            <span className="team-order">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={tr('Sposta su', 'Move up')}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === teams.length - 1} aria-label={tr('Sposta giù', 'Move down')}>▼</button>
            </span>
            <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} aria-label={tr('Nome squadra', 'Team name')} />
            <div className="swatches">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  className={`swatch ${c === t.color ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => update(t.id, { color: c })}
                  aria-label={`${tr('Colore', 'Color')} ${c}`}
                />
              ))}
            </div>
            <button className="btn ghost" onClick={() => remove(t.id)} disabled={teams.length <= 1}>
              {tr('Rimuovi', 'Remove')}
            </button>
          </div>
        ))}
      </div>
      <div className="setup-row">
        {teams.length < max && (
          <button className="btn ghost" onClick={add}>
            + {tr('Aggiungi squadra', 'Add team')}
          </button>
        )}
      </div>
    </>
  );
}
