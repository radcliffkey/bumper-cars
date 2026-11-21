import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GameScene, Phase } from '../src/scenes/GameScene.js';
import {
  AI_BUMP_STEER_DELAY_MS,
  CAR_BODY_RADIUS,
  SPAWN_PADDING,
  AI_MIN_WALL_SPEED,
  AI_STUCK_TIME_MS,
  CHEST_LIFETIME_MS,
  CHEST_SPAWN_INTERVAL_MS,
  COMBO_WINDOW_MS,
  POWERUP_DURATION_MS,
  ROUND_DURATION_MS,
  SCORING_COOLDOWN_MS,
  SLAM_BONUS,
  SLAM_WINDOW_MS,
  URGENT_TIME_MS,
} from '../src/config/constants.js';

function mockCar({ x = 0, y = 0, vx = 0, vy = 0, ai = false } = {}) {
  const data = new Map(ai ? [['ai', true], ['base', 'ai0'], ['dirChangeAt', 0]] : []);
  const car = {
    x,
    y,
    body: { velocity: { x: vx, y: vy }, reset: vi.fn((nx, ny) => Object.assign(car, { x: nx, y: ny })) },
    setVelocity: vi.fn((nx, ny) => {
      car.body.velocity.x = nx;
      car.body.velocity.y = ny;
      return car;
    }),
    getData: (k) => data.get(k),
    setData: (k, v) => {
      if (typeof k === 'object') Object.entries(k).forEach(([kk, vv]) => data.set(kk, vv));
      else data.set(k, v);
      return car;
    },
    setTexture: vi.fn(),
    setAlpha: vi.fn(),
    setTint: vi.fn(),
    clearTint: vi.fn(),
  };
  car.body.gameObject = car;
  return car;
}

function chainable() {
  const obj = { destroy: vi.fn() };
  obj.setDepth = vi.fn(() => obj);
  return obj;
}

function createScene() {
  const scene = new GameScene();
  scene.phase = Phase.PLAYING;
  scene.clock = 10_000;
  scene.roundEndsAt = scene.clock + ROUND_DURATION_MS;
  scene.scale = { width: 800, height: 600 };
  scene.hud = {
    setScore: vi.fn(),
    setTimeLeft: vi.fn(),
    setCombo: vi.fn(),
    setPowerup: vi.fn(),
    showOverlay: vi.fn(),
    hideOverlay: vi.fn(),
    floatText: vi.fn(),
    banner: vi.fn(),
  };
  scene.cameras = { main: { shake: vi.fn() } };
  scene.tweens = { add: vi.fn(), pauseAll: vi.fn(), resumeAll: vi.fn(), killTweensOf: vi.fn() };
  scene.add = { circle: vi.fn(chainable), rectangle: vi.fn(chainable) };
  scene.time = { delayedCall: vi.fn() };
  scene.physics = { world: { pause: vi.fn(), resume: vi.fn() } };
  scene.player = mockCar({ x: 400, y: 300 });
  scene.aiCars = { getChildren: () => [] };
  scene.chest = {
    active: false,
    x: 0,
    y: 0,
    enableBody: vi.fn(function (_reset, x, y) {
      Object.assign(this, { active: true, x, y });
    }),
    disableBody: vi.fn(function () {
      this.active = false;
    }),
    setVisible: vi.fn(),
  };
  return scene;
}

describe('GameScene', () => {
  let scene;

  beforeEach(() => {
    scene = createScene();
  });

  describe('round timer', () => {
    it('updates the HUD only when the shown second changes', () => {
      scene.clock += 500;
      scene.updateRoundTimer(500);
      expect(scene.hud.setTimeLeft).not.toHaveBeenCalled();
      scene.clock += 600;
      scene.updateRoundTimer(600);
      expect(scene.hud.setTimeLeft).toHaveBeenCalledWith(ROUND_DURATION_MS - 1100);
    });

    it('ends the round at the deadline', () => {
      scene.endRound = vi.fn();
      scene.clock = scene.roundEndsAt;
      scene.updateRoundTimer(16);
      expect(scene.endRound).toHaveBeenCalled();
    });

    it('does not advance while paused', () => {
      scene.phase = Phase.PAUSED;
      scene.update(0, 16);
      expect(scene.clock).toBe(10_000);
    });

    it('clamps long frames', () => {
      scene.updatePlayer = vi.fn();
      scene.updateAiCars = vi.fn();
      scene.updateChest = vi.fn();
      scene.roundEndsAt = scene.clock + URGENT_TIME_MS * 3;
      scene.update(0, 5000);
      expect(scene.clock).toBe(10_050);
    });
  });

  it('schedules the first chest relative to the start of the round', () => {
    scene.phase = Phase.READY;
    scene.startRound();
    expect(scene.phase).toBe(Phase.PLAYING);
    expect(scene.roundEndsAt).toBe(scene.clock + ROUND_DURATION_MS);
    expect(scene.nextChestAt).toBe(scene.clock + CHEST_SPAWN_INTERVAL_MS);
  });

  describe('pause', () => {
    it('toggles physics, tweens and the overlay', () => {
      scene.togglePause();
      expect(scene.phase).toBe(Phase.PAUSED);
      expect(scene.physics.world.pause).toHaveBeenCalled();
      expect(scene.hud.showOverlay).toHaveBeenCalled();
      scene.togglePause();
      expect(scene.phase).toBe(Phase.PLAYING);
      expect(scene.physics.world.resume).toHaveBeenCalled();
      expect(scene.hud.hideOverlay).toHaveBeenCalled();
    });

    it('does nothing on the title screen', () => {
      scene.phase = Phase.READY;
      scene.togglePause();
      expect(scene.phase).toBe(Phase.READY);
    });
  });

  describe('bumping an AI car', () => {
    let ai;

    beforeEach(() => {
      ai = mockCar({ x: 430, y: 300, ai: true });
      scene.playerVelocity = { x: 200, y: 0 };
    });

    it('flings the car, shakes the camera and scores', () => {
      scene.handleCarCollision(scene.player, ai);
      expect(ai.body.velocity.x).toBeGreaterThan(0);
      expect(scene.player.body.velocity.x).toBeLessThan(0);
      expect(scene.cameras.main.shake).toHaveBeenCalled();
      expect(scene.score).toBe(1);
      expect(scene.hud.setScore).toHaveBeenCalledWith(1);
    });

    it('delays the next AI heading change so the fling plays out', () => {
      scene.handleCarCollision(ai, scene.player);
      expect(ai.getData('dirChangeAt')).toBe(scene.clock + AI_BUMP_STEER_DELAY_MS);
    });

    it('respects the per-car scoring cooldown', () => {
      scene.handleCarCollision(scene.player, ai);
      scene.playerVelocity = { x: 200, y: 0 };
      scene.clock += SCORING_COOLDOWN_MS - 1;
      scene.handleCarCollision(scene.player, ai);
      expect(scene.score).toBe(1);
      scene.playerVelocity = { x: 200, y: 0 };
      scene.clock += 1;
      scene.handleCarCollision(scene.player, ai);
      expect(scene.score).toBeGreaterThan(1);
    });

    it('chains different cars into a combo', () => {
      const other = mockCar({ x: 400, y: 330, ai: true });
      scene.handleCarCollision(scene.player, ai);
      scene.playerVelocity = { x: 0, y: 200 };
      scene.clock += COMBO_WINDOW_MS - 1;
      scene.handleCarCollision(scene.player, other);
      expect(scene.combo).toBe(2);
      expect(scene.score).toBe(3);
    });

    it('does not score when the AI drives into a parked player', () => {
      scene.playerVelocity = { x: 0, y: 0 };
      scene.handleCarCollision(scene.player, ai);
      expect(ai.setVelocity).toHaveBeenCalled();
      expect(scene.score).toBe(0);
    });

    it('does not score outside a round', () => {
      scene.phase = Phase.READY;
      scene.handleCarCollision(scene.player, ai);
      expect(scene.score).toBe(0);
    });

    it('flings harder while powered up', () => {
      const plain = mockCar({ x: 430, y: 300, ai: true });
      scene.handleCarCollision(scene.player, plain);
      scene.powerupEndsAt = scene.clock + 1000;
      scene.playerVelocity = { x: 200, y: 0 };
      scene.handleCarCollision(scene.player, ai);
      expect(ai.body.velocity.x).toBeGreaterThan(plain.body.velocity.x);
    });
  });

  it('resolves AI-vs-AI collisions without scoring', () => {
    const a = mockCar({ x: 300, y: 300, vx: 50, ai: true });
    const b = mockCar({ x: 320, y: 300, vx: -10, ai: true });
    scene.handleCarCollision(a, b);
    expect(a.body.velocity.x).toBeLessThan(0);
    expect(b.body.velocity.x).toBeGreaterThan(0);
    expect(scene.score).toBe(0);
  });

  describe('fence hits', () => {
    it('keeps AI cars moving away from the fence', () => {
      const ai = mockCar({ x: 100, y: 20, vx: 100, vy: 0, ai: true });
      scene.handleWorldBounds(ai.body, true, false, false, false);
      expect(ai.body.velocity.y).toBeGreaterThanOrEqual(AI_MIN_WALL_SPEED);
    });

    it('awards a slam for a car flung into the fence', () => {
      const ai = mockCar({ x: 100, y: 20, vx: 0, vy: 200, ai: true });
      ai.setData('flungAt', scene.clock - SLAM_WINDOW_MS);
      scene.handleWorldBounds(ai.body, true, false, false, false);
      expect(scene.score).toBe(SLAM_BONUS);
      expect(ai.getData('flungAt')).toBeNull();

      scene.handleWorldBounds(ai.body, true, false, false, false);
      expect(scene.score).toBe(SLAM_BONUS);
    });

    it('awards no slam once the fling is old', () => {
      const ai = mockCar({ x: 100, y: 20, ai: true });
      ai.setData('flungAt', scene.clock - SLAM_WINDOW_MS - 1);
      scene.handleWorldBounds(ai.body, true, false, false, false);
      expect(scene.score).toBe(0);
    });
  });

  describe('bonus chest', () => {
    it('spawns on schedule and vanishes when not collected', () => {
      scene.nextChestAt = scene.clock;
      scene.updateChest();
      expect(scene.chest.active).toBe(true);

      scene.clock += CHEST_LIFETIME_MS;
      scene.updateChest();
      expect(scene.chest.active).toBe(false);
      expect(scene.nextChestAt).toBe(scene.clock + CHEST_SPAWN_INTERVAL_MS);
    });

    it('grants turbo when collected', () => {
      scene.spawnChest();
      scene.collectChest();
      expect(scene.chest.active).toBe(false);
      expect(scene.powerupEndsAt).toBe(scene.clock + POWERUP_DURATION_MS);
      expect(scene.isPoweredUp()).toBe(true);
    });
  });

  describe('stuck AI cars', () => {
    it('respawn after sitting still too long', () => {
      const ai = mockCar({ x: 100, y: 100, ai: true });
      scene.resetAiTracking(ai);
      scene.findSpawnPoint = vi.fn(() => ({ x: 300, y: 320 }));
      scene.clock += AI_STUCK_TIME_MS;
      scene.checkStuck(ai);
      expect(ai.body.reset).toHaveBeenCalledWith(300, 320);
      expect(ai.setVelocity).toHaveBeenCalled();
    });

    it('stay put while they keep moving', () => {
      const ai = mockCar({ x: 100, y: 100, ai: true });
      scene.resetAiTracking(ai);
      ai.x = 150;
      scene.clock += AI_STUCK_TIME_MS;
      scene.checkStuck(ai);
      expect(ai.body.reset).not.toHaveBeenCalled();
    });
  });

  it('spawns cars inside the padded arena', () => {
    const inset = SPAWN_PADDING + CAR_BODY_RADIUS;
    for (let i = 0; i < 20; i += 1) {
      const p = scene.findSpawnPoint(CAR_BODY_RADIUS);
      expect(p.x).toBeGreaterThanOrEqual(inset);
      expect(p.x).toBeLessThanOrEqual(800 - inset);
      expect(p.y).toBeGreaterThanOrEqual(inset);
      expect(p.y).toBeLessThanOrEqual(600 - inset);
    }
  });

  describe('display state', () => {
    it('tints the player and fills the bar while turbo lasts', () => {
      scene.powerupEndsAt = scene.clock + POWERUP_DURATION_MS / 2;
      scene.updateVisuals();
      expect(scene.player.setTint).toHaveBeenCalled();
      expect(scene.hud.setPowerup).toHaveBeenCalledWith(0.5);
    });

    it('fades AI cars on scoring cooldown only during a round', () => {
      const ai = mockCar({ ai: true });
      ai.setData('lastScoredAt', scene.clock);
      scene.aiCars = { getChildren: () => [ai] };
      scene.updateVisuals();
      expect(ai.setAlpha).toHaveBeenLastCalledWith(expect.any(Number));
      expect(ai.setAlpha.mock.lastCall[0]).toBeLessThan(1);
      scene.phase = Phase.OVER;
      scene.updateVisuals();
      expect(ai.setAlpha).toHaveBeenLastCalledWith(1);
    });
  });

  describe('commands', () => {
    it('starts the round on any key from the title screen', () => {
      scene.phase = Phase.READY;
      scene.handleCommand('KeyP');
      expect(scene.phase).toBe(Phase.PLAYING);
    });

    it('pauses and restarts during a round', () => {
      scene.restart = vi.fn();
      scene.handleCommand('KeyP');
      expect(scene.phase).toBe(Phase.PAUSED);
      scene.handleCommand('KeyR');
      expect(scene.restart).toHaveBeenCalled();
    });

    it('restarts after a round only once the delay has passed', () => {
      scene.restart = vi.fn();
      scene.phase = Phase.OVER;
      scene.handleCommand('Space');
      expect(scene.restart).not.toHaveBeenCalled();
      scene.canRestart = true;
      scene.handleCommand('ArrowUp');
      expect(scene.restart).not.toHaveBeenCalled();
      scene.handleCommand('Space');
      expect(scene.restart).toHaveBeenCalled();
    });
  });

  it('ends the round with the final score and a restart delay', () => {
    scene.score = 7;
    scene.powerupEndsAt = scene.clock + 1000;
    scene.combo = 3;
    scene.endRound();
    expect(scene.isPoweredUp()).toBe(false);
    expect(scene.combo).toBe(0);
    expect(scene.phase).toBe(Phase.OVER);
    expect(scene.physics.world.pause).toHaveBeenCalled();
    expect(scene.hud.showOverlay).toHaveBeenCalledWith('GAME OVER', expect.stringContaining('Score: 7'));
    expect(scene.time.delayedCall).toHaveBeenCalled();
  });
});
