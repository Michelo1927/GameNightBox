// Background music: a soft lounge / bossa nova loop, synthesized like the sound effects (no files).
// It has its own on/off switch, separate from the effects, and goes quiet by itself while
// a song or a video is playing (useQuietMusic).
import { useEffect, useState } from 'react';
import { audioContext } from './sounds';

const KEY = 'game-night:music';
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
})();
const listeners = new Set<(on: boolean) => void>();

export function setMusicOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* not persisted */
  }
  listeners.forEach((l) => l(on));
  update();
}

export function useMusicOn() {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    listeners.add(setOn);
    return () => void listeners.delete(setOn);
  }, []);
  return [on, setMusicOn] as const;
}

/** While the calling component is on screen (and `active`), the music pauses: for songs and videos. */
export function useQuietMusic(active = true) {
  useEffect(() => {
    if (!active) return;
    quiet++;
    update();
    return () => {
      quiet--;
      update();
    };
  }, [active]);
}

// --- When to play: switched on, nothing to listen to, page visible, after the first click/key ---
// (browsers don't allow sound before the user has interacted with the page)

let quiet = 0;
let unlocked = false;

function unlock() {
  unlocked = true;
  removeEventListener('pointerdown', unlock);
  removeEventListener('keydown', unlock);
  update();
}
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);
document.addEventListener('visibilitychange', () => update());

function update() {
  const want = enabled && unlocked && quiet === 0 && document.visibilityState === 'visible';
  if (want) start();
  else stop();
}

// --- The player: schedules one bar at a time, a little ahead ---

const VOLUME = 0.5;
const BPM = 78;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
/** Swing: the second eighth of each beat comes a little late. */
const at = (beat: number) => {
  const whole = Math.floor(beat);
  const frac = beat - whole;
  return (whole + (frac === 0.5 ? 0.58 : frac)) * BEAT;
};

let out: GainNode | null = null;
let timer: number | undefined;
let nextBar = 0;
let bar = 0;
let noiseBuf: AudioBuffer | null = null;

function start() {
  if (timer !== undefined) return;
  const a = audioContext();
  if (!a) return;
  const o = chain(a);
  out = o;
  o.gain.setValueAtTime(0.0001, a.currentTime);
  o.gain.exponentialRampToValueAtTime(VOLUME, a.currentTime + 2.5);
  nextBar = a.currentTime + 0.1;
  timer = window.setInterval(() => {
    while (nextBar < a.currentTime + 0.6) {
      playBar(a, o, bar, nextBar);
      bar = (bar + 1) % SONG.length;
      nextBar += BAR;
    }
  }, 100);
}

function stop() {
  if (timer === undefined) return;
  clearInterval(timer);
  timer = undefined;
  const a = audioContext();
  const o = out;
  out = null;
  if (a && o) {
    o.gain.cancelScheduledValues(a.currentTime);
    o.gain.setValueAtTime(o.gain.value, a.currentTime);
    o.gain.linearRampToValueAtTime(0, a.currentTime + 0.6);
    setTimeout(() => o.disconnect(), 4000);
  }
}

/** Volume → soft top end → a room reverb, mixed with the dry sound. */
function chain(a: AudioContext): GainNode {
  const input = a.createGain();
  const tone = a.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 5000;
  const dry = a.createGain();
  dry.gain.value = 0.8;
  const wet = a.createGain();
  wet.gain.value = 0.35;
  const verb = a.createConvolver();
  verb.buffer = impulse(a, 2.8);
  input.connect(tone);
  tone.connect(dry).connect(a.destination);
  tone.connect(verb).connect(wet).connect(a.destination);
  return input;
}

function impulse(a: AudioContext, seconds: number) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

// --- The song: 8 bars of jazz chords, bossa nova rhythm ---

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Each bar: bass root (MIDI) and the chord, voiced for an electric piano. */
const SONG: [number, number[]][] = [
  [38, [53, 57, 60, 64]], // Dm9
  [43, [53, 59, 64, 69]], // G13
  [36, [52, 55, 59, 62]], // Cmaj9
  [45, [55, 61, 65, 70]], // A7(b9)
  [38, [53, 57, 60, 64]], // Dm9
  [43, [53, 59, 64, 69]], // G13
  [40, [55, 59, 62, 66]], // Em9
  [45, [55, 61, 64, 67]], // A7
];

/** Piano comping: [beat, length in beats]. */
const COMP: [number, number][] = [[0, 1.4], [1.5, 0.9], [3.5, 1.2]];
/** Bass: [beat, semitones above the root, length in beats]. */
const BASS: [number, number, number][] = [[0, 0, 1.4], [1.5, 7, 0.45], [2, 7, 1.4], [3.5, 0, 0.45]];
/** Vibraphone, now and then: per bar, [beat, chord note index (+4 = octave up)]. */
const VIBES: [number, number][][] = [
  [], [], [], [],
  [[0.5, 7], [1.5, 6], [2.5, 5]],
  [[1, 6], [2.5, 7]],
  [[0.5, 4], [1.5, 5], [2, 7], [3, 6]],
  [[1, 5]],
];

function playBar(a: AudioContext, o: GainNode, b: number, t0: number) {
  const [root, chord] = SONG[b];

  for (const [beat, len] of COMP)
    chord.forEach((n, i) => rhodes(a, o, hz(n), t0 + at(beat) + i * 0.012, len * BEAT, beat === 0 ? 0.05 : 0.035));

  for (const [beat, semi, len] of BASS) bass(a, o, hz(root + semi), t0 + at(beat), len * BEAT);

  for (const [beat, k] of VIBES[b]) vibes(a, o, hz(chord[k % 4] + 12 * (1 + Math.floor(k / 4))), t0 + at(beat));

  // Drums: soft kick on 1 and 3, brushes on the eighths, a rim click in a bossa pattern.
  kick(a, o, t0 + at(0));
  kick(a, o, t0 + at(2), 0.25);
  for (let e = 0; e < 8; e++) brush(a, o, t0 + at(e / 2), e % 2 ? 0.05 : 0.03);
  for (const beat of b % 2 ? [0.5, 2, 3] : [0, 1.5, 3]) rim(a, o, t0 + at(beat));
}

/** Electric piano: a bell-like FM tone that softens as it fades, slightly detuned for warmth. */
function rhodes(a: AudioContext, o: GainNode, f: number, t: number, len: number, vol: number) {
  const dur = len + 1.2;
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  env.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.6);
  env.gain.setTargetAtTime(0.0001, t + len, 0.25);
  env.connect(o);
  for (const detune of [-4, 4]) {
    const car = a.createOscillator();
    const mod = a.createOscillator();
    const depth = a.createGain();
    car.frequency.value = f;
    car.detune.value = detune;
    mod.frequency.value = f;
    depth.gain.setValueAtTime(f * 1.2, t);
    depth.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
    mod.connect(depth).connect(car.frequency);
    car.connect(env);
    car.start(t);
    mod.start(t);
    car.stop(t + dur);
    mod.stop(t + dur);
  }
}

/** Round upright-like bass: sine with a touch of triangle, filtered. */
function bass(a: AudioContext, o: GainNode, f: number, t: number, len: number) {
  const env = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
  env.gain.exponentialRampToValueAtTime(0.18, t + 0.25);
  env.gain.setTargetAtTime(0.0001, t + len, 0.08);
  lp.connect(env).connect(o);
  for (const [type, g] of [['sine', 1], ['triangle', 0.35]] as const) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = f;
    gain.gain.value = g;
    osc.connect(gain).connect(lp);
    osc.start(t);
    osc.stop(t + len + 0.6);
  }
}

/** Vibraphone: a pure tone with a slow tremolo and a long ring. */
function vibes(a: AudioContext, o: GainNode, f: number, t: number) {
  const osc = a.createOscillator();
  const env = a.createGain();
  const amp = a.createGain();
  const trem = a.createOscillator();
  const tremDepth = a.createGain();
  osc.frequency.value = f;
  trem.frequency.value = 5;
  tremDepth.gain.value = 0.3;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  trem.connect(tremDepth).connect(amp.gain);
  osc.connect(env).connect(amp).connect(o);
  osc.start(t);
  trem.start(t);
  osc.stop(t + 2.3);
  trem.stop(t + 2.3);
}

function kick(a: AudioContext, o: GainNode, t: number, vol = 0.35) {
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.frequency.setValueAtTime(90, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(env).connect(o);
  osc.start(t);
  osc.stop(t + 0.35);
}

function noise(a: AudioContext, o: GainNode, t: number, vol: number, type: BiquadFilterType, freq: number, dur: number, attack = 0.002) {
  noiseBuf ??= (() => {
    const b = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const env = a.createGain();
  src.buffer = noiseBuf;
  filter.type = type;
  filter.frequency.value = freq;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(o);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

/** Brushes on the snare: a short swish. */
const brush = (a: AudioContext, o: GainNode, t: number, vol: number) => noise(a, o, t, vol, 'bandpass', 5000, 0.12, 0.03);
/** Rim click: short and woody. */
const rim = (a: AudioContext, o: GainNode, t: number) => noise(a, o, t, 0.06, 'bandpass', 1700, 0.04);
