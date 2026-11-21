// Pure scoring and spawning rules, kept free of Phaser so they can be unit tested.

import { COMBO_MAX, COMBO_WINDOW_MS } from '../config/constants.js';

/** True when something last done at `lastAtMs` (null: never) may happen again now. */
export function cooldownElapsed(nowMs, lastAtMs, cooldownMs) {
  if (lastAtMs == null) return true;
  return nowMs - lastAtMs >= cooldownMs;
}

/** True when too much time has passed since the last scoring hit to keep the combo going. */
export function comboExpired(nowMs, lastScoreAtMs) {
  return lastScoreAtMs == null || nowMs - lastScoreAtMs > COMBO_WINDOW_MS;
}

/** Combo multiplier for a hit scored now, given the previous scoring hit. */
export function nextCombo(combo, nowMs, lastScoreAtMs) {
  if (comboExpired(nowMs, lastScoreAtMs)) return 1;
  return Math.min(COMBO_MAX, combo + 1);
}

/** On/off phase for something blinking every `periodMs` while a countdown runs out. */
export function blinkOn(remainingMs, periodMs) {
  return Math.floor(remainingMs / periodMs) % 2 === 0;
}

/** Whole seconds shown on the countdown for the given remaining time. */
export function secondsLeft(remainingMs) {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Picks a random point in `bounds` that keeps `clearance` from every obstacle, falling back
 * to any point in bounds when the arena is too crowded.
 * @param {{minX: number, maxX: number, minY: number, maxY: number}} bounds
 * @param {Array<{x: number, y: number}>} obstacles
 * @param {number} clearance
 * @param {(min: number, max: number) => number} randomInt inclusive integer generator
 */
export function findFreeSpawnPoint(bounds, obstacles, clearance, randomInt, maxAttempts = 50) {
  const clearanceSq = clearance * clearance;
  const randomPoint = () => ({
    x: randomInt(bounds.minX, bounds.maxX),
    y: randomInt(bounds.minY, bounds.maxY),
  });
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const p = randomPoint();
    const free = obstacles.every((o) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 >= clearanceSq);
    if (free) return p;
  }
  return randomPoint();
}
