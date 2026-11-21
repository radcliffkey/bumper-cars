import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadBestScore, recordScore } from '../src/utils/highScore.js';
import { HIGH_SCORE_STORAGE_KEY } from '../src/config/constants.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data,
  };
}

describe('high score', () => {
  let original;

  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });

  function useStorage(value) {
    Object.defineProperty(globalThis, 'localStorage', { value, configurable: true });
  }

  it('is 0 when nothing is stored', () => {
    useStorage(memoryStorage());
    expect(loadBestScore()).toBe(0);
  });

  it('records a better score and reports it as new', () => {
    const storage = memoryStorage({ [HIGH_SCORE_STORAGE_KEY]: '10' });
    useStorage(storage);
    expect(recordScore(12)).toBe(true);
    expect(storage.data.get(HIGH_SCORE_STORAGE_KEY)).toBe('12');
    expect(loadBestScore()).toBe(12);
  });

  it('keeps the best when the score is not higher', () => {
    const storage = memoryStorage({ [HIGH_SCORE_STORAGE_KEY]: '10' });
    useStorage(storage);
    expect(recordScore(10)).toBe(false);
    expect(storage.data.get(HIGH_SCORE_STORAGE_KEY)).toBe('10');
  });

  it('ignores garbage in storage', () => {
    useStorage(memoryStorage({ [HIGH_SCORE_STORAGE_KEY]: 'abc' }));
    expect(loadBestScore()).toBe(0);
  });

  it('survives storage that throws', () => {
    useStorage({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadBestScore()).toBe(0);
    expect(recordScore(5)).toBe(true);
  });
});
