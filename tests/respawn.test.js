import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  global.Phaser = {
    Scene: class {},
    Math: {
      Between: vi.fn((min, _max) => min),
      FloatBetween: vi.fn((min, _max) => min),
    },
  };
});

import { GameScene } from '../src/scenes/GameScene.js';

function mockAiSprite() {
  return {
    x: 0,
    y: 0,
    body: { reset: vi.fn() },
    setVelocity: vi.fn(),
    setData: vi.fn(),
  };
}

describe('AI respawn helpers', () => {
  let scene;

  beforeEach(() => {
    scene = new GameScene();
    scene.time = { now: 1000 };
    scene.scale = { width: 800, height: 600 };
    scene.aiCars = { getChildren: () => [] };
    scene.player = { x: 400, y: 300 };
  });

  it('simpleRespawn moves AI to a free point and sets velocity', () => {
    const ai = mockAiSprite();
    const spyFind = vi.spyOn(scene, 'findFreeSpawnPoint').mockReturnValue({ x: 100, y: 120 });
    scene.simpleRespawn(ai);
    expect(spyFind).toHaveBeenCalled();
    expect(ai.body.reset).toHaveBeenCalledWith(100, 120);
    expect(ai.setVelocity).toHaveBeenCalled();
  });

  it('explodeAndRespawn triggers a visual flash tween then respawns', () => {
    const ai = mockAiSprite();
    ai.x = 200; ai.y = 220;

    // Stub out visual/tween methods used by explodeAndRespawn
    scene.add = {
      circle: vi.fn(() => ({ setDepth: vi.fn(() => ({ destroy: vi.fn() })) })),
      text: vi.fn(),
      tileSprite: vi.fn(() => ({
        setOrigin: vi.fn(() => ({
          setDepth: vi.fn(() => ({
            setBlendMode: vi.fn(() => ({
              setAlpha: vi.fn(() => ({})),
            })),
          })),
        })),
      })),
    };
    scene.tweens = { add: vi.fn((cfg) => { cfg.onComplete && cfg.onComplete(); }) };

    const spyFind = vi.spyOn(scene, 'findFreeSpawnPoint').mockReturnValue({ x: 300, y: 320 });
    scene.explodeAndRespawn(ai);
    expect(scene.tweens.add).toHaveBeenCalled();
    expect(spyFind).toHaveBeenCalled();
    expect(ai.body.reset).toHaveBeenCalledWith(300, 320);
    expect(ai.setVelocity).toHaveBeenCalled();
  });
});


