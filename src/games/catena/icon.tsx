import { Glyph } from '../../hub/components/GameIcon';

/** Two links of a chain, one through the other. */
export default (
  <Glyph>
    <g transform="rotate(-45 32 32)">
      <rect className="ws" x="1" y="22" width="36" height="20" rx="10" strokeWidth="7" />
      <rect className="ds" x="27" y="22" width="36" height="20" rx="10" strokeWidth="7" />
      <path className="ws" d="M27 22 A10 10 0 0 1 37 32" strokeWidth="7" />
    </g>
  </Glyph>
);
