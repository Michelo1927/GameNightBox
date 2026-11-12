import { Glyph } from '../../hub/components/GameIcon';

/** The wheel of letters around the letter being played. */
export default (
  <Glyph>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * 2 * Math.PI;
      const [cx, cy] = [32 + 26 * Math.sin(a), 32 - 26 * Math.cos(a)];
      return i === 0 ? (
        <circle key={i} className="d" cx={cx} cy={cy} r="5.5" stroke="#fff" strokeWidth="2.5" />
      ) : (
        <circle key={i} className="w" cx={cx} cy={cy} r="4.3" />
      );
    })}
    <text className="t w" x="32" y="45.5" fontSize="34">A</text>
  </Glyph>
);
