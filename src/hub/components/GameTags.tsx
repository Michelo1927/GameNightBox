import { tr } from '../i18n';

/** What a home card says about a game, as a small line icon (24×24); the words show on hover. */
export const GAME_TAGS = {
  // Every game so far is played in teams, so no card shows it yet: it's for when an all-against-all game arrives.
  squadre: {
    label: tr('A squadre', 'Teams'),
    d: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M16 14.2c2.9.3 5 2.5 5 5.8" />
      </>
    ),
  },
  // Every game has a host at the computer, so no card shows it.
  host: {
    label: tr('Serve un host', 'Needs a host'),
    d: (
      <>
        <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
      </>
    ),
  },
  prenotazione: {
    label: tr('Si prenota col pulsante', 'Buzz in to answer'),
    d: (
      <>
        <path d="M5 14a7 7 0 0 1 14 0z" />
        <rect x="3" y="14" width="18" height="4.5" rx="1.5" />
        <path d="M12 2.5v2M5 4.8l1.3 1.3M19 4.8l-1.3 1.3" />
      </>
    ),
  },
  turno: {
    label: tr('A turno', 'Take turns'),
    d: <path d="M19.5 10A8 8 0 0 0 5.6 6.8M4.5 3.5v3.8h3.8M4.5 14a8 8 0 0 0 13.9 3.2M19.5 20.5v-3.8h-3.8" />,
  },
  tempo: {
    label: tr('Contro il tempo', 'Against the clock'),
    d: (
      <>
        <circle cx="12" cy="13.5" r="7.5" />
        <path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6M18.3 6.7l1.6-1.6" />
      </>
    ),
  },
  rubata: {
    label: tr('Si può rubare', 'Steals allowed'),
    d: (
      <path d="M2.5 9.5c3.2-1.6 6.3-1.1 9.5 1 3.2-2.1 6.3-2.6 9.5-1-.3 4.1-2.4 6.5-5.5 6.5-2 0-3.1-1.2-4-2.6-.9 1.4-2 2.6-4 2.6-3.1 0-5.2-2.4-5.5-6.5zM6.5 11.6h2.6M14.9 11.6h2.6" />
    ),
  },
  internet: {
    label: tr('Serve internet', 'Needs internet'),
    d: (
      <>
        <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
        <circle className="dot" cx="12" cy="19.4" r="1.2" />
      </>
    ),
  },
  // Every game has a creator, so no card shows it: kept for a game that only plays ready-made content.
  crea: {
    label: tr('Contenuti da creare', 'Make your own content'),
    d: <path d="M4 20l1-4.6L15.6 4.8a2.1 2.1 0 0 1 3 3L8 18.4zM13.6 6.8l3 3" />,
  },
};

export type GameTag = keyof typeof GAME_TAGS;

/** The tags of a game's home card: icons in the top right corner, each naming itself on hover. */
export default function GameTags({ tags }: { tags: GameTag[] }) {
  return (
    <span className="game-tags">
      {tags.map((t) => (
        <span key={t} className="game-tag" data-tip={GAME_TAGS[t].label} role="img" aria-label={GAME_TAGS[t].label}>
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            {GAME_TAGS[t].d}
          </svg>
        </span>
      ))}
    </span>
  );
}
