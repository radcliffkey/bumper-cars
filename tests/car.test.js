import { describe, it, expect, vi } from 'vitest';
import { createCarSprite } from '../src/sprites/Car.js';
import { CAR_BODY_RADIUS, CAR_BODY_OFFSET, PIXEL_SCALE } from '../src/config/constants.js';

function mockScene() {
  const sprite = { body: {} };
  ['setScale', 'setCircle', 'setBounce', 'setCollideWorldBounds', 'setDepth'].forEach((m) => {
    sprite[m] = vi.fn(() => sprite);
  });
  return { physics: { add: { sprite: vi.fn(() => sprite) } }, sprite };
}

describe('createCarSprite', () => {
  it('shows the art at pixel scale with a centred circle of the world radius', () => {
    const scene = mockScene();
    const car = createCarSprite(scene, 100, 200, 'player_up_0', 0.5);
    expect(scene.physics.add.sprite).toHaveBeenCalledWith(100, 200, 'player_up_0');
    expect(car.setScale).toHaveBeenCalledWith(PIXEL_SCALE);
    // Arcade scales the circle's texture-pixel radius by the sprite scale.
    expect(car.setCircle).toHaveBeenCalledWith(CAR_BODY_RADIUS / PIXEL_SCALE, CAR_BODY_OFFSET, CAR_BODY_OFFSET);
  });

  it('keeps the car in the arena and reports fence hits', () => {
    const scene = mockScene();
    const car = createCarSprite(scene, 0, 0, 'ai0_down_0', 1);
    expect(car.setBounce).toHaveBeenCalledWith(1);
    expect(car.setCollideWorldBounds).toHaveBeenCalledWith(true);
    expect(car.body.onWorldBounds).toBe(true);
  });
});
