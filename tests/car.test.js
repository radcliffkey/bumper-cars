import { describe, it, expect, vi } from 'vitest';
import { createCarSprite } from '../src/sprites/Car.js';
import { CAR_BODY_RADIUS, CAR_BODY_OFFSET } from '../src/config/constants.js';

function mockScene() {
  const sprite = { body: {} };
  ['setCircle', 'setBounce', 'setCollideWorldBounds', 'setDepth'].forEach((m) => {
    sprite[m] = vi.fn(() => sprite);
  });
  return { physics: { add: { sprite: vi.fn(() => sprite) } }, sprite };
}

describe('createCarSprite', () => {
  it('creates a physics sprite with a centred circular body', () => {
    const scene = mockScene();
    const car = createCarSprite(scene, 100, 200, 'player_up', 0.5);
    expect(scene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player_up');
    expect(car.setCircle).toHaveBeenCalledWith(CAR_BODY_RADIUS, CAR_BODY_OFFSET, CAR_BODY_OFFSET);
  });

  it('keeps the car in the arena and reports fence hits', () => {
    const scene = mockScene();
    const car = createCarSprite(scene, 0, 0, 'ai0_down', 1);
    expect(car.setBounce).toHaveBeenCalledWith(1);
    expect(car.setCollideWorldBounds).toHaveBeenCalledWith(true);
    expect(car.body.onWorldBounds).toBe(true);
  });
});
