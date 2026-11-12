import type { ReactNode } from 'react';

/**
 * A game's icon: a drawing on a 64×64 grid, white with dark details ("d" class), set on the game's coloured disk.
 * Each game draws its own in src/games/<id>/icon.tsx.
 */
export function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg className="glyph" viewBox="0 0 64 64" aria-hidden focusable="false">
      {children}
    </svg>
  );
}

/** The icon on the game's glossy coloured disk (the colour comes from the page's --accent). */
export function IconDisk({ icon, className = '' }: { icon: ReactNode; className?: string }) {
  return (
    <span className={`icon-disk ${className}`} aria-hidden>
      {icon}
    </span>
  );
}
