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

/** A note that can slide to another pitch and sit left (-1) or right (1). */
function glide(a: AudioContext, from: number, to: number, at: number, dur: number, type: OscillatorType, volume: number, pan = 0) {
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const gain = a.createGain();
  const panner = a.createStereoPanner();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  panner.pan.setValueAtTime(pan, t);
  osc.connect(gain).connect(panner).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A burst of noise (a drum hit, a swoosh), filtered around one frequency. */
function noise(a: AudioContext, at: number, dur: number, volume: number, freq: number) {
  const t = a.currentTime + at;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  src.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t);
}

/** Furto: tiptoeing steps, a quick getaway and the clink of a grabbed coin. */
function steal() {
  const a = audio();
  if (!a) return;
  [196, 208, 220, 233].forEach((f, i) => note(a, f, i * 0.17, 0.09, 'triangle', 0.22));
  glide(a, 300, 1400, 0.72, 0.22, 'sine', 0.1);
  noise(a, 0.72, 0.25, 0.25, 2500);
  note(a, 988, 1.0, 0.08, 'square', 0.07);
  note(a, 1319, 1.08, 0.4, 'square', 0.07);
}

/** Passa la mano: a ball bouncing between left and right, faster and faster. */
function pass() {
  const a = audio();
  if (!a) return;
  const hits = [0, 0.3, 0.55, 0.75, 0.9];
  hits.forEach((at, i) => glide(a, i % 2 ? 1175 : 880, i % 2 ? 1100 : 820, at, 0.12, 'sine', 0.2, i % 2 ? 0.8 : -0.8));
  glide(a, 600, 1600, 1.02, 0.3, 'triangle', 0.08, 0.8);
}

/** Imprevisto: a drum roll, then a sound that matches the card (found by its icon). */
function gift(icon: string) {
  const a = audio();
  if (!a) return;
  for (let i = 0; i < 11; i++) noise(a, i * 0.055, 0.07, 0.08 + i * 0.02, 300);
  const s = 0.65;
  switch (icon) {
    case '🍀': // Colpo di fortuna: a shower of coins
      for (let i = 0; i < 6; i++) {
        note(a, 988, s + i * 0.11, 0.06, 'square', 0.06);
        note(a, 1319, s + i * 0.11 + 0.05, 0.25, 'square', 0.06);
      }
      break;
    case '💸': // Tasse: the cash register takes the money, wah wah wah
      noise(a, s, 0.05, 0.3, 3000);
      note(a, 2093, s + 0.05, 0.5, 'sine', 0.12);
      note(a, 2637, s + 0.05, 0.5, 'sine', 0.08);
      [[392, 370], [370, 349]].forEach(([f, to], i) => glide(a, f, to, s + 0.55 + i * 0.3, 0.28, 'sawtooth', 0.08));
      glide(a, 349, 262, s + 1.15, 0.7, 'sawtooth', 0.08);
      break;
    case '🎉': // Festa per tutti: party horn and popping confetti
      glide(a, 350, 700, s, 0.45, 'sawtooth', 0.08);
      glide(a, 353, 706, s, 0.45, 'square', 0.04);
      [0.5, 0.62, 0.7, 0.85, 0.93].forEach((at, i) => noise(a, s + at, 0.06, 0.35, 1500 + i * 600));
      [523, 659, 784, 1047].forEach((f, i) => note(a, f, s + 0.5 + i * 0.08, 0.3, 'triangle', 0.12));
      break;
    case '🏹': // Robin Hood: the bow string, the arrow flying across, the hit
      glide(a, 220, 110, s, 0.25, 'triangle', 0.25);
      glide(a, 1800, 900, s + 0.1, 0.4, 'sine', 0.06, -0.6);
      noise(a, s + 0.1, 0.4, 0.15, 4000);
      glide(a, 160, 60, s + 0.5, 0.2, 'sine', 0.4, 0.6);
      noise(a, s + 0.5, 0.06, 0.4, 800);
      break;
    case '🔄': // Scambio: two notes trading places, left to right
      glide(a, 330, 880, s, 0.6, 'triangle', 0.13, -0.7);
      glide(a, 880, 330, s, 0.6, 'triangle', 0.13, 0.7);
      note(a, 659, s + 0.65, 0.3, 'sine', 0.12);
      break;
    default: // Regalo: a little music box
      [1568, 1319, 1047, 1319, 1568, 2093].forEach((f, i) => note(a, f, s + i * 0.13, 0.5, 'sine', 0.1));
  }
}

export const sounds = {
  right: () => melody([[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.35]]),
  wrong: () => melody([[155, 0, 0.5], [147, 0, 0.5]], 'sawtooth', 0.12),
  tick: () => melody([[1200, 0, 0.05]], 'square', 0.05),
  timeUp: () => melody([[330, 0, 0.25], [330, 0.3, 0.25], [262, 0.6, 0.6]], 'square', 0.1),
  steal,
  pass,
  gift,
  reveal: () => melody([[880, 0, 0.12], [1175, 0.08, 0.25]], 'sine', 0.12),
  win: () =>
    melody([
      [523, 0, 0.15], [523, 0.15, 0.15], [523, 0.3, 0.15], [659, 0.45, 0.4],
      [587, 0.9, 0.15], [659, 1.05, 0.15], [784, 1.2, 0.8],
    ]),
};
