// Synthesized sound effects using the Web Audio API; no audio files needed.

let ctx = null;
let masterGain = null;
let noiseBuffer = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);
  }
  resumeAudio();
  return ctx;
}

/** Browsers start audio suspended until a user gesture; call this from one. */
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Plays one oscillator note sweeping from `from` to `to` Hz.
 * `out` lets a caller insert a filter between the note and the master gain.
 */
function tone({ type, from, to = from, duration, gain, delay = 0, linear = false, out }) {
  const audio = getContext();
  if (!audio) return null;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) {
    if (linear) osc.frequency.linearRampToValueAtTime(to, t + duration);
    else osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  }
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.01, t + duration);
  osc.connect(amp);
  amp.connect(out ?? masterGain);
  osc.start(t);
  osc.stop(t + duration);
  return osc;
}

export function playBump() {
  tone({ type: 'triangle', from: 120, to: 40, duration: 0.15, gain: 2.0 });
}

export function playWallHit() {
  const audio = getContext();
  if (!audio) return;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.connect(masterGain);
  tone({ type: 'square', from: 80, to: 20, duration: 0.08, gain: 0.8, out: filter });
}

/** "Ba-ding", pitched up a little for every combo step. */
export function playScore(combo = 1) {
  const pitch = 1 + 0.12 * (combo - 1);
  tone({ type: 'sine', from: 523.25 * pitch, duration: 0.1, gain: 0.12 });
  tone({ type: 'sine', from: 1046.5 * pitch, duration: 0.3, gain: 0.12, delay: 0.1 });
}

export function playPowerup() {
  const osc = tone({ type: 'sine', from: 300, to: 800, duration: 0.3, gain: 0.75, linear: true });
  if (!osc) return;
  const t = ctx.currentTime;
  const tremolo = ctx.createOscillator();
  const depth = ctx.createGain();
  tremolo.frequency.value = 20;
  depth.gain.value = 200;
  tremolo.connect(depth);
  depth.connect(osc.frequency);
  tremolo.start(t);
  tremolo.stop(t + 0.3);
}

export function playTick() {
  tone({ type: 'square', from: 1200, duration: 0.04, gain: 0.15 });
}

export function playStart() {
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    tone({ type: 'triangle', from: freq, duration: 0.15, gain: 0.5, delay: i * 0.09 });
  });
}

export function playGameOver() {
  tone({ type: 'triangle', from: 300, to: 50, duration: 1.0, gain: 0.5 });
}

export function playExplosion() {
  const audio = getContext();
  if (!audio) return;
  const t = audio.currentTime;
  if (!noiseBuffer) {
    const length = audio.sampleRate * 0.5;
    noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  const noise = audio.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);
  const amp = audio.createGain();
  amp.gain.setValueAtTime(1.5, t);
  amp.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

  noise.connect(filter);
  filter.connect(amp);
  amp.connect(masterGain);
  noise.start(t);
}
