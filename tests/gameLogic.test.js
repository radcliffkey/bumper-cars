import { describe, it, expect, vi } from 'vitest';
import { computeRecoilVectors, nextAiDirectionTime, tickTimer, canScoreHit } from '../src/logic/gameLogic.js';

describe('computeRecoilVectors', () => {
  it('computes opposite recoil for player and ai', () => {
    const { player, ai } = computeRecoilVectors({ x: 10, y: 10 }, { x: 0, y: 0 }, 180);
    expect(player).toEqual({ x: 180, y: 180 });
    expect(ai).toEqual({ x: -180, y: -180 });
  });
});

describe('nextAiDirectionTime', () => {
  it('returns a time at least 1200ms in the future', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // jitter = 0
    const t = nextAiDirectionTime(1000);
    expect(t).toBe(2200);
    Math.random.mockRestore();
  });
});

describe('tickTimer', () => {
  it('decrements until zero', () => {
    expect(tickTimer(10)).toBe(9);
    expect(tickTimer(1)).toBe(0);
    expect(tickTimer(0)).toBe(0);
  });
});

describe('canScoreHit', () => {
  it('allows first-time scoring when lastScoredAt is null', () => {
    expect(canScoreHit(1000, null, 800)).toBe(true);
  });
  it('enforces cooldown window', () => {
    expect(canScoreHit(1500, 1000, 800)).toBe(false);
    expect(canScoreHit(1799, 1000, 800)).toBe(false);
    expect(canScoreHit(1800, 1000, 800)).toBe(true);
    expect(canScoreHit(2000, 1000, 800)).toBe(true);
  });
});


