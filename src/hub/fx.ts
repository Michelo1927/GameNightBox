// Stage lights: a warm flash on a right answer, a red pulse on a wrong one (styles in stage.css).
export function lights(kind: 'ok' | 'ko') {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = `stage-flash ${kind}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
