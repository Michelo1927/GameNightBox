import { Glyph } from '../../hub/components/GameIcon';

/** Two beamed notes. */
export default (
  <Glyph>
    <ellipse className="w" cx="18" cy="47" rx="8.5" ry="6.5" transform="rotate(-20 18 47)" />
    <ellipse className="w" cx="44" cy="41" rx="8.5" ry="6.5" transform="rotate(-20 44 41)" />
    <rect className="w" x="22.5" y="15" width="5" height="32" rx="1" />
    <rect className="w" x="48.5" y="9" width="5" height="32" rx="1" />
    <path className="w" d="M22.5 15 L53.5 8 L53.5 18 L22.5 25 Z" />
  </Glyph>
);
