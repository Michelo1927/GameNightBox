import { Glyph } from '../../hub/components/GameIcon';

/** The board: a grid of tiles, one turned to its question. */
export default (
  <Glyph>
    {[5, 24, 43].flatMap((y) =>
      [5, 24, 43].map((x) => <rect key={`${x}-${y}`} className={x === 24 && y === 24 ? 'd' : 'w'} x={x} y={y} width="16" height="16" rx="3.5" />),
    )}
    <text className="t w" x="32" y="39.5" fontSize="19">?</text>
  </Glyph>
);
