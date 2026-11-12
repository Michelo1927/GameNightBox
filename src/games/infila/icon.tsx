import { Glyph } from '../../hub/components/GameIcon';

/** Cards put in order, from the shortest to the tallest. */
export default (
  <Glyph>
    {[20, 31, 42].map((h, i) => (
      <g key={i}>
        <rect className="w" x={7 + i * 18} y={54 - h} width="14" height={h} rx="3" />
        <text className="t d" x={14 + i * 18} y={54 - h + 12} fontSize="10">{i + 1}</text>
      </g>
    ))}
  </Glyph>
);
