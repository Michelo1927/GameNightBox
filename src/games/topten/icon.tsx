import { Glyph } from '../../hub/components/GameIcon';

/** A ranking: numbered rows, longest first. */
export default (
  <Glyph>
    {[30, 23, 16].map((len, i) => (
      <g key={i}>
        <circle className="w" cx="14" cy={14 + i * 18} r="8" />
        <text className="t d" x="14" y={19 + i * 18} fontSize="13">{i + 1}</text>
        <rect className="w" x="26" y={9 + i * 18} width={len} height="10" rx="5" />
      </g>
    ))}
  </Glyph>
);
