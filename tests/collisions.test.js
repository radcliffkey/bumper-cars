import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide a minimal Phaser shim before importing GameScene
vi.hoisted(() => {
  global.Phaser = {
    Scene: class {},
    BlendModes: { MULTIPLY: 'MULTIPLY' },
    Math: {
      Between: vi.fn((min, max) => min + Math.floor(Math.random() * (max - min + 1))),
      FloatBetween: vi.fn((min, max) => min + Math.random() * (max - min)),
    },
  };
});

import { GameScene } from '../src/scenes/GameScene.js';
import { RECOIL_FORCE, SCORING_COOLDOWN_MS, SHAKE_COOLDOWN_MS } from '../src/config/constants.js';

function createMockCar({ x, y, vx = 0, vy = 0, isAi = false }) {
  let data = new Map();
  if (isAi) data.set('ai', true);
  return {
    x,
    y,
    body: { velocity: { x: vx, y: vy } },
    setVelocity: vi.fn(function (nx, ny) {
      this.body.velocity.x = nx;
      this.body.velocity.y = ny;
      return this;
    }),
    setData: vi.fn((k, v) => data.set(k, v)),
    getData: vi.fn((k) => data.get(k)),
    texture: { key: 'car' },
    setTexture: vi.fn(function (key) { this.texture.key = key; return this; }),
  };
}

function createMockWall(nx, ny, width = 100, height = 10) {
  const meta = new Map([['nx', nx], ['ny', ny]]);
  return {
    width,
    height,
    x: 0,
    y: 0,
    getData: (k) => meta.get(k),
  };
}

describe('Collision Handlers', () => {
  let scene;

  beforeEach(() => {
    scene = new GameScene();
    scene.gameOver = false;
    scene.time = { now: 10_000 };
    scene.scale = { width: 800, height: 600 };
    scene.score = 0;
    scene.scoreText = { setText: vi.fn() };
    scene.cameras = {
      main: {
        shake: vi.fn()
      }
    };
    scene.lastShakeAt = 0;
  });

  describe('handleWallCollision', () => {
    it('reflects velocity across wall normal and nudges car outward', () => {
      const car = createMockCar({ x: 100, y: 100, vx: 50, vy: -20 });
      const wall = createMockWall(0, 1); // upward normal (from top wall)

      const oldX = car.x;
      const oldY = car.y;

      scene.handleWallCollision(car, wall);

      // Reflected velocity: vy should flip sign and increase away from wall at least to min bump
      const speed = Math.hypot(car.body.velocity.x, car.body.velocity.y);
      expect(speed).toBeGreaterThanOrEqual(Math.max(120, RECOIL_FORCE * 0.8));

      // Position nudged outward along normal
      expect(car.x).toBe(oldX + wall.getData('nx') * 2);
      expect(car.y).toBe(oldY + wall.getData('ny') * 2);
    });
  });

  describe('handleCarCollision', () => {
    it('applies strong impulse when player hits AI and increments score with cooldown', () => {
      const player = createMockCar({ x: 200, y: 200, vx: 150, vy: 0, isAi: false });
      const ai = createMockCar({ x: 230, y: 200, vx: 0, vy: 0, isAi: true });

      // First collision should score
      scene.handleCarCollision(player, ai);
      expect(player.setVelocity).toHaveBeenCalled();
      expect(ai.setVelocity).toHaveBeenCalled();
      expect(scene.score).toBe(1);
      expect(scene.scoreText.setText).toHaveBeenCalledWith('Score: 1');
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(150, 0.015);

      const lastHit = ai.getData('lastScoredAt');
      expect(typeof lastHit).toBe('number');

      // Immediate second collision should not score due to cooldown
      scene.handleCarCollision(player, ai);
      expect(scene.score).toBe(1);

      // Immediate second collision should NOT shake again (cooldown)
      scene.cameras.main.shake.mockClear();
      scene.handleCarCollision(player, ai);
      expect(scene.cameras.main.shake).not.toHaveBeenCalled();

      // Advance time past shake cooldown but still within score cooldown
      scene.time.now += SHAKE_COOLDOWN_MS + 1;
      scene.handleCarCollision(player, ai);
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(150, 0.015);

      // Advance time past scoring cooldown and collide again
      scene.time.now += SCORING_COOLDOWN_MS + 1;
      scene.handleCarCollision(player, ai);
      expect(scene.score).toBe(2);
    });

    it('exchanges normal components with impulse for AI vs AI closing collision', () => {
      const a = createMockCar({ x: 300, y: 300, vx: 50, vy: 0, isAi: true });
      const b = createMockCar({ x: 320, y: 300, vx: -10, vy: 0, isAi: true });

      scene.handleCarCollision(a, b);

      // Both cars should receive updated velocities away from each other
      expect(a.setVelocity).toHaveBeenCalled();
      expect(b.setVelocity).toHaveBeenCalled();

      const aNew = a.body.velocity;
      const bNew = b.body.velocity;
      // They should be moving in opposite x directions after collision
      expect(Math.sign(aNew.x)).toBe(-1);
      expect(Math.sign(bNew.x)).toBe(1);
    });

    it('nudges cars apart when not closing along normal', () => {
      // Parallel movement, slight overlap/graze where closing speed <= 0
      const a = createMockCar({ x: 400, y: 400, vx: 20, vy: 0, isAi: true });
      const b = createMockCar({ x: 430, y: 400, vx: 20, vy: 0, isAi: true });

      scene.handleCarCollision(a, b);

      // Nudge should adjust velocities to separate
      expect(a.setVelocity).toHaveBeenCalled();
      expect(b.setVelocity).toHaveBeenCalled();
      const aAfter = a.body.velocity;
      const bAfter = b.body.velocity;
      expect(aAfter.x).not.toBe(20);
      expect(bAfter.x).not.toBe(20);
    });
  });
});


