import { describe, it, expect } from 'vitest';
import { applyDrag, steer, facingOf, cruise, playerBump, aiBump, bounceOffWall } from '../src/logic/physics.js';
import {
  RECOIL_FORCE,
  RECOIL_SPEED_FACTOR,
  PLAYER_KNOCKBACK_RATIO,
  AI_MIN_BUMP_SPEED,
} from '../src/config/constants.js';

const speed = (v) => Math.hypot(v.x, v.y);
const DRIVE = { accel: 900, maxSpeed: 220, drag: 2 };

describe('applyDrag', () => {
  it('decays velocity exponentially with time', () => {
    const v = applyDrag({ x: 100, y: -50 }, 1, Math.log(2));
    expect(v.x).toBeCloseTo(50);
    expect(v.y).toBeCloseTo(-25);
  });
});

describe('steer', () => {
  it('accelerates in the input direction', () => {
    const v = steer({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.1, DRIVE);
    expect(v.x).toBeCloseTo(90);
    expect(v.y).toBe(0);
  });

  it('does not drive faster diagonally', () => {
    let v = { x: 0, y: 0 };
    for (let i = 0; i < 120; i += 1) v = steer(v, { x: 1, y: 1 }, 1 / 60, DRIVE);
    expect(speed(v)).toBeCloseTo(DRIVE.maxSpeed);
  });

  it('coasts to a stop without input', () => {
    let v = { x: 200, y: 0 };
    for (let i = 0; i < 180; i += 1) v = steer(v, { x: 0, y: 0 }, 1 / 60, DRIVE);
    expect(speed(v)).toBeLessThan(1);
  });

  it('keeps a knock-back above max speed instead of clamping it away', () => {
    const v = steer({ x: -400, y: 0 }, { x: -1, y: 0 }, 1 / 60, DRIVE);
    expect(speed(v)).toBeGreaterThan(DRIVE.maxSpeed);
    expect(speed(v)).toBeLessThanOrEqual(400);
  });
});

describe('facingOf', () => {
  it.each([
    [{ x: 5, y: 1 }, 'right'],
    [{ x: -5, y: 1 }, 'left'],
    [{ x: 1, y: 5 }, 'down'],
    [{ x: 1, y: -5 }, 'up'],
  ])('maps %o to %s', (vel, facing) => {
    expect(facingOf(vel)).toBe(facing);
  });

  it('returns null when standing still', () => {
    expect(facingOf({ x: 0, y: 0 })).toBeNull();
  });

  it('keeps the current facing on near-diagonals', () => {
    expect(facingOf({ x: 100, y: 110 }, 'right')).toBe('right');
    expect(facingOf({ x: 110, y: 100 }, 'down')).toBe('down');
    expect(facingOf({ x: 100, y: 130 }, 'right')).toBe('down');
  });
});

describe('cruise', () => {
  it('slows a flung car back towards cruising speed', () => {
    const v = cruise({ x: 300, y: 0 }, 0.5, 1, 120);
    expect(v.x).toBeLessThan(300);
    expect(v.x).toBeGreaterThanOrEqual(120);
  });

  it('never drops below cruising speed', () => {
    const v = cruise({ x: 0, y: 130 }, 10, 5, 120);
    expect(v.y).toBeCloseTo(120);
  });

  it('leaves slower cars alone', () => {
    const vel = { x: 50, y: 0 };
    expect(cruise(vel, 1, 1, 120)).toBe(vel);
  });
});

describe('playerBump', () => {
  it('flings the AI away from the player and knocks the player back', () => {
    const r = playerBump({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(r.ai).toEqual({ x: RECOIL_FORCE, y: 0 });
    expect(r.player.x).toBeCloseTo(-RECOIL_FORCE * PLAYER_KNOCKBACK_RATIO);
    expect(r.closingSpeed).toBe(0);
  });

  it('flings harder the faster the player drives into the car', () => {
    const r = playerBump({ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 10, y: 0 });
    expect(r.recoil).toBeCloseTo(300 * RECOIL_SPEED_FACTOR);
    expect(r.closingSpeed).toBe(300);
  });

  it('boosts the fling but not the player knock-back with a multiplier', () => {
    const plain = playerBump({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 });
    const boosted = playerBump({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 10 }, 2);
    expect(boosted.ai.y).toBeCloseTo(plain.ai.y * 2);
    expect(boosted.player).toEqual(plain.player);
  });

  it('picks a direction when both cars share a position', () => {
    const r = playerBump({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(speed(r.ai)).toBeCloseTo(RECOIL_FORCE);
  });
});

describe('aiBump', () => {
  it('sends closing cars apart', () => {
    const r = aiBump({ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 20, y: 0 }, { x: -10, y: 0 });
    expect(r.a.x).toBeLessThan(0);
    expect(r.b.x).toBeGreaterThan(0);
  });

  it('keeps tangential motion', () => {
    const r = aiBump({ x: 0, y: 0 }, { x: 50, y: 30 }, { x: 20, y: 0 }, { x: 0, y: 0 });
    expect(r.a.y).toBeCloseTo(30);
  });

  it('nudges grazing cars apart by the minimum bump speed', () => {
    const r = aiBump({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }, { x: 20, y: 0 });
    expect(r.a.x).toBeCloseTo(20 - AI_MIN_BUMP_SPEED);
    expect(r.b.x).toBeCloseTo(20 + AI_MIN_BUMP_SPEED);
  });

  it('leaves cars at the same position unchanged', () => {
    const va = { x: 3, y: 0 };
    const vb = { x: 0, y: 4 };
    expect(aiBump({ x: 1, y: 1 }, va, { x: 1, y: 1 }, vb)).toEqual({ a: va, b: vb });
  });
});

describe('bounceOffWall', () => {
  it('pushes a car sliding along the wall away from it', () => {
    const v = bounceOffWall({ x: 100, y: 0 }, { x: 0, y: 1 }, 140);
    expect(v).toEqual({ x: 100, y: 140 });
  });

  it('keeps a velocity already leaving fast enough', () => {
    const vel = { x: -200, y: 0 };
    expect(bounceOffWall(vel, { x: -1, y: 0 }, 140)).toBe(vel);
  });
});
