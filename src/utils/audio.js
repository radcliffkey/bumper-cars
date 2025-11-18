// Simple synthesized sound effects using Web Audio API
// No external assets required.

let ctx = null;
let masterGain = null;

function initAudio() {
  if (typeof window === 'undefined') return; // Node/Test environment check
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.25; // Master volume
      masterGain.connect(ctx.destination);
    }
  }
  // Try to resume if suspended (browser autoplay policy)
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function playBump() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

  // Stronger bump: increased gain and slightly longer duration
  gain.gain.setValueAtTime(2.0, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.15);
}

export function playWallHit() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Duller, shorter sound for walls
  osc.type = 'square';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 0.08);

  // Low pass filter to make it sound like a dull thud
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  gain.gain.setValueAtTime(0.8, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.08);
}

export function playScore() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  
  // Double tone "ba-ding"
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, t); // C5
  osc1.frequency.setValueAtTime(1046.50, t + 0.1); // C6

  gain1.gain.setValueAtTime(0.1, t);
  gain1.gain.setValueAtTime(0.1, t + 0.1);
  gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

  osc1.connect(gain1);
  gain1.connect(masterGain);

  osc1.start(t);
  osc1.stop(t + 0.4);
}

export function playPowerup() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.linearRampToValueAtTime(800, t + 0.3);
  
  // Tremolo
  const tremolo = ctx.createOscillator();
  tremolo.frequency.value = 20;
  const tremoloGain = ctx.createGain();
  tremoloGain.gain.value = 200;
  tremolo.connect(tremoloGain);
  tremoloGain.connect(osc.frequency);
  tremolo.start(t);
  tremolo.stop(t + 0.3);

  gain.gain.setValueAtTime(0.75, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.3);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.3);
}

export function playGameOver() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 1.0);

  gain.gain.setValueAtTime(0.5, t);
  gain.gain.linearRampToValueAtTime(0, t + 1.0);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 1.0);
}

export function playExplosion() {
  initAudio();
  if (!ctx) return;

  const t = ctx.currentTime;
  
  // Noise buffer for explosion
  const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Lowpass filter to make it sound like a distant or muffled explosion
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1.5, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  noise.start(t);
}

