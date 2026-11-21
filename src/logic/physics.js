// Pure movement and collision-response math, kept free of Phaser so it can be unit tested.
// Vectors are plain { x, y } objects.

import {
  RECOIL_FORCE,
  RECOIL_SPEED_FACTOR,
  PLAYER_KNOCKBACK_RATIO,
  AI_MIN_BUMP_SPEED,
} from '../config/constants.js';

const length = (v) => Math.hypot(v.x, v.y);

/** Unit vector along `v`, or `fallback` for a zero vector. */
function normalize(v, fallback) {
  const len = length(v);
  return len > 0 ? { x: v.x / len, y: v.y / len } : fallback;
}

/** Exponentially decays a velocity, `drag` being the decay rate per second. */
export function applyDrag(vel, dtSec, drag) {
  const decay = Math.exp(-drag * dtSec);
  return { x: vel.x * decay, y: vel.y * decay };
}

/**
 * Advances a driven car's velocity by one frame.
 * Input accelerates the car up to `maxSpeed`; a faster knock-back is never clamped
 * instantly, it only bleeds off through drag, so bumps actually push the player around.
 */
export function steer(vel, input, dtSec, { accel, maxSpeed, drag }) {
  const dragged = applyDrag(vel, dtSec, drag);
  const dir = normalize(input, { x: 0, y: 0 });
  let x = dragged.x + dir.x * accel * dtSec;
  let y = dragged.y + dir.y * accel * dtSec;

  const cap = Math.max(maxSpeed, length(dragged));
  const speed = Math.hypot(x, y);
  if (speed > cap) {
    x *= cap / speed;
    y *= cap / speed;
  }
  return { x, y };
}

/**
 * Which of the four sprite facings best matches a velocity; null when standing still.
 * Keeps `current` on near-diagonals so the sprite does not flicker between two facings.
 */
export function facingOf(vel, current = null, hysteresis = 1.2) {
  if (vel.x === 0 && vel.y === 0) return null;
  const ax = Math.abs(vel.x);
  const ay = Math.abs(vel.y);
  const horizontal = current === 'left' || current === 'right';
  const vertical = current === 'up' || current === 'down';
  let useX = ax > ay;
  if (horizontal) useX = ax * hysteresis >= ay;
  else if (vertical) useX = ax > ay * hysteresis;
  if (useX) return vel.x > 0 ? 'right' : 'left';
  return vel.y > 0 ? 'down' : 'up';
}

/** Decays a velocity faster than `cruiseSpeed` back towards it, leaving slower ones alone. */
export function cruise(vel, dtSec, drag, cruiseSpeed) {
  const speed = length(vel);
  if (speed <= cruiseSpeed) return vel;
  const target = Math.max(cruiseSpeed, length(applyDrag(vel, dtSec, drag)));
  return { x: (vel.x / speed) * target, y: (vel.y / speed) * target };
}

/**
 * Player-vs-AI bump: the AI car is flung away from the player, harder the faster the player
 * drives, and the player bounces back with part of that force (never boosted by power-ups).
 * `closingSpeed` is how fast the player was driving into the AI car.
 */
export function playerBump(player, playerVel, ai, recoilMultiplier = 1) {
  const { x: nx, y: ny } = normalize({ x: ai.x - player.x, y: ai.y - player.y }, { x: 1, y: 0 });
  const baseRecoil = Math.max(RECOIL_FORCE, length(playerVel) * RECOIL_SPEED_FACTOR);
  const recoil = baseRecoil * recoilMultiplier;
  const knockback = baseRecoil * PLAYER_KNOCKBACK_RATIO;
  return {
    ai: { x: nx * recoil, y: ny * recoil },
    player: { x: -nx * knockback, y: -ny * knockback },
    recoil,
    closingSpeed: playerVel.x * nx + playerVel.y * ny,
  };
}

/**
 * AI-vs-AI bump: billiard-like exchange of the normal velocity components, exaggerated with
 * an outward impulse and a minimum speed so cars never stick together. Returns new velocities.
 */
export function aiBump(a, aVel, b, bVel) {
  const n = normalize({ x: b.x - a.x, y: b.y - a.y }, null);
  if (!n) return { a: aVel, b: bVel };
  const { x: nx, y: ny } = n;
  const tx = -ny;
  const ty = nx;

  const vaN = aVel.x * nx + aVel.y * ny;
  const vaT = aVel.x * tx + aVel.y * ty;
  const vbN = bVel.x * nx + bVel.y * ny;
  const vbT = bVel.x * tx + bVel.y * ty;
  const closingSpeed = vaN - vbN;

  if (closingSpeed <= 0) {
    // Grazing or already separating: just nudge them apart.
    return {
      a: { x: aVel.x - nx * AI_MIN_BUMP_SPEED, y: aVel.y - ny * AI_MIN_BUMP_SPEED },
      b: { x: bVel.x + nx * AI_MIN_BUMP_SPEED, y: bVel.y + ny * AI_MIN_BUMP_SPEED },
    };
  }

  const impulse = Math.max(RECOIL_FORCE * 0.8, closingSpeed * 1.2);
  const newA = { x: vbN * nx + vaT * tx - nx * impulse, y: vbN * ny + vaT * ty - ny * impulse };
  const newB = { x: vaN * nx + vbT * tx + nx * impulse, y: vaN * ny + vbT * ty + ny * impulse };
  return {
    a: withMinSpeedAlong(newA, -nx, -ny, AI_MIN_BUMP_SPEED),
    b: withMinSpeedAlong(newB, nx, ny, AI_MIN_BUMP_SPEED),
  };
}

/**
 * Makes sure a velocity points away from a wall (normal pointing into the arena)
 * at least `minSpeed` fast, so AI cars never slide along or stall at the fence.
 */
export function bounceOffWall(vel, normal, minSpeed) {
  const away = vel.x * normal.x + vel.y * normal.y;
  if (away >= minSpeed) return vel;
  const boost = minSpeed - away;
  return { x: vel.x + normal.x * boost, y: vel.y + normal.y * boost };
}

function withMinSpeedAlong(vel, nx, ny, minSpeed) {
  const speed = length(vel);
  if (speed >= minSpeed) return vel;
  const boost = minSpeed - speed;
  return { x: vel.x + nx * boost, y: vel.y + ny * boost };
}
