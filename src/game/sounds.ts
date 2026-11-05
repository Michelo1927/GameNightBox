// Game sounds, synthesized with the Web Audio API: no audio files to download.
import { useEffect, useState } from 'react';

const MUTE_KEY = 'jeopardy-quiz:mute';
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<(m: boolean) => void>();

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* not persisted */
  }
  listeners.forEach((l) => l(m));
}

export function useMuted() {
  const [m, setM] = useState(muted);
  useEffect(() => {
    listeners.add(setM);
    return () => void listeners.delete(setM);
  }, []);
  return [m, setMuted] as const;
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One note: frequency (Hz), start offset and duration (s). */
function note(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'triangle', volume = 0.18) {
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const melody = (notes: [number, number, number][], type?: OscillatorType, volume?: number) => {
  const a = audio();
  if (a) for (const [f, at, dur] of notes) note(a, f, at, dur, type, volume);
};

export const sounds = {
  right: () => melody([[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.35]]),
  wrong: () => melody([[155, 0, 0.5], [147, 0, 0.5]], 'sawtooth', 0.12),
  tick: () => melody([[1200, 0, 0.05]], 'square', 0.05),
  timeUp: () => melody([[330, 0, 0.25], [330, 0.3, 0.25], [262, 0.6, 0.6]], 'square', 0.1),
  double: () => melody([[392, 0, 0.12], [523, 0.1, 0.12], [659, 0.2, 0.12], [784, 0.3, 0.12], [1047, 0.4, 0.5]]),
  reveal: () => melody([[880, 0, 0.12], [1175, 0.08, 0.25]], 'sine', 0.12),
  win: () =>
    melody([
      [523, 0, 0.15], [523, 0.15, 0.15], [523, 0.3, 0.15], [659, 0.45, 0.4],
      [587, 0.9, 0.15], [659, 1.05, 0.15], [784, 1.2, 0.8],
    ]),
};
