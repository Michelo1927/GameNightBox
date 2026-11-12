import { Glyph } from '../../hub/components/GameIcon';

/** The auctioneer's gavel coming down on its block. */
export default (
  <Glyph>
    <rect className="w" x="2" y="50" width="34" height="9" rx="3.5" />
    <g transform="rotate(-40 32 30)">
      <rect className="w" x="27" y="26" width="8" height="34" rx="4" />
      <rect className="w" x="11" y="8" width="40" height="20" rx="5" />
      <rect className="d" x="16" y="8" width="4" height="20" />
      <rect className="d" x="42" y="8" width="4" height="20" />
    </g>
  </Glyph>
);
