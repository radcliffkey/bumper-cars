import { CAR_BODY_RADIUS, CAR_BODY_OFFSET_X, CAR_BODY_OFFSET_Y, CAR_LINEAR_DRAG, CAR_BOUNCE } from '../config/constants.js';

export function createCarSprite(scene, x, y, key) {
  const sprite = scene.physics.add.sprite(x, y, key);
  sprite.setDamping(true);
  sprite.setDrag(CAR_LINEAR_DRAG);
  // Larger car: adjust physics body to a centered circle
  sprite.setCircle(CAR_BODY_RADIUS, CAR_BODY_OFFSET_X, CAR_BODY_OFFSET_Y);
  sprite.setBounce(CAR_BOUNCE);
  return sprite;
}


