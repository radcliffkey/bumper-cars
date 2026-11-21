import { describe, it, expect } from 'vitest';
import {
  cooldownElapsed,
  comboExpired,
  nextCombo,
  blinkOn,
  secondsLeft,
  findFreeSpawnPoint,
} from '../src/logic/gameLogic.js';
import { COMBO_MAX, COMBO_WINDOW_MS } from '../src/config/constants.js';

describe('cooldownElapsed', () => {
  it('allows the first time', () => {
    expect(cooldownElapsed(1000, null, 2000)).toBe(true);
    expect(cooldownElapsed(1000, undefined, 2000)).toBe(true);
  });

  it('blocks within the cooldown and allows after', () => {
    expect(cooldownElapsed(2999, 1000, 2000)).toBe(false);
    expect(cooldownElapsed(3000, 1000, 2000)).toBe(true);
  });
});

describe('comboExpired', () => {
  it('is expired with no previous hit or after the window', () => {
    expect(comboExpired(1000, null)).toBe(true);
    expect(comboExpired(1001 + COMBO_WINDOW_MS, 1000)).toBe(true);
    expect(comboExpired(1000 + COMBO_WINDOW_MS, 1000)).toBe(false);
  });
});

describe('blinkOn', () => {
  it('alternates every period', () => {
    expect([0, 99, 100, 199, 200].map((ms) => blinkOn(ms, 100))).toEqual([true, true, false, false, true]);
  });
});

describe('nextCombo', () => {
  it('starts at 1', () => {
    expect(nextCombo(0, 1000, null)).toBe(1);
  });

  it('grows while hits come within the window', () => {
    expect(nextCombo(2, 1000 + COMBO_WINDOW_MS, 1000)).toBe(3);
  });

  it('resets after the window', () => {
    expect(nextCombo(4, 1001 + COMBO_WINDOW_MS, 1000)).toBe(1);
  });

  it('is capped', () => {
    expect(nextCombo(COMBO_MAX, 1100, 1000)).toBe(COMBO_MAX);
  });
});

describe('secondsLeft', () => {
  it.each([
    [90000, 90],
    [89001, 90],
    [89000, 89],
    [1, 1],
    [0, 0],
    [-50, 0],
  ])('shows %i ms as %i s', (ms, s) => {
    expect(secondsLeft(ms)).toBe(s);
  });
});

describe('findFreeSpawnPoint', () => {
  const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

  function sequence(values) {
    let i = 0;
    return () => values[i++ % values.length];
  }

  it('skips points too close to obstacles', () => {
    // First candidate (10,10) is next to the obstacle; second (90,90) is free.
    const random = sequence([10, 10, 90, 90]);
    expect(findFreeSpawnPoint(bounds, [{ x: 12, y: 12 }], 20, random)).toEqual({ x: 90, y: 90 });
  });

  it('falls back to a random point when nothing is free', () => {
    const random = sequence([50]);
    expect(findFreeSpawnPoint(bounds, [{ x: 50, y: 50 }], 20, random, 5)).toEqual({ x: 50, y: 50 });
  });

  it('draws coordinates from the given bounds', () => {
    const calls = [];
    const random = (min, max) => {
      calls.push([min, max]);
      return min;
    };
    findFreeSpawnPoint({ minX: 1, maxX: 2, minY: 3, maxY: 4 }, [], 10, random);
    expect(calls).toEqual([[1, 2], [3, 4]]);
  });
});
