import { Glyph } from '../../hub/components/GameIcon';

/** Two cards, the front one with an arrow pointing back: you answer the card behind. */
export default (
  <Glyph>
    <rect className="w" x="8" y="10" width="30" height="40" rx="6" opacity="0.55" />
    <rect className="w" x="24" y="16" width="32" height="40" rx="6" />
    <path className="ds" d="M48 36 H32 M38 29 L31 36 L38 43" strokeWidth="5.5" />
  </Glyph>
);
