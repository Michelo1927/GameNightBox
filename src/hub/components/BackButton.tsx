import { createPortal } from 'react-dom';
import type { MouseEvent } from 'react';
import { parentOf, useHash } from '../nav';

interface Props {
  /** Where it goes: the folder above the page (hub/nav.ts), unless given. */
  href?: string;
  /** Where it goes ("Tutti i giochi") or what it does ("Esci"): written next to the arrow. */
  label: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

/**
 * Back button in the top left corner of the screen, for the pages without a bar.
 * It is rendered in <body>, outside the page: the page's entrance animation moves the page, and a fixed
 * element inside a moving one would move with it (it showed up mid-page and then jumped to the corner).
 */
export default function BackButton({ href, label }: Props) {
  const up = parentOf(useHash()) ?? '#/';
  return createPortal(
    <a className="back-fab" href={href ?? up} aria-label={label}>
      <Arrow />
      <span>{label}</span>
    </a>,
    document.body,
  );
}

/** The same button at the start of a bar (game screens, creators). */
export function BackPill({ href, label, onClick }: Props) {
  const up = parentOf(useHash()) ?? '#/';
  return (
    <a className="back-pill" href={href ?? up} aria-label={label} title={label} onClick={onClick}>
      <Arrow />
      <span>{label}</span>
    </a>
  );
}
