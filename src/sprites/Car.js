import { CAR_BODY_RADIUS, CAR_BODY_OFFSET, DEPTH } from '../config/constants.js';

/**
 * A car with a circular body that stays inside the arena and reports fence hits through the
 * world's 'worldbounds' event. Drag is applied by the scene, not by Arcade physics.
 */
export function createCarSprite(scene, x, y, key, wallBounce) {
  const sprite = scene.physics.add.sprite(x, y, key);
  sprite.setCircle(CAR_BODY_RADIUS, CAR_BODY_OFFSET, CAR_BODY_OFFSET);
  sprite.setBounce(wallBounce);
  sprite.setCollideWorldBounds(true);
  sprite.body.onWorldBounds = true;
  sprite.setDepth(DEPTH.CARS);
  return sprite;
}
