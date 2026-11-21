// All textures are drawn here with the canvas 2D API and handed to Phaser as data URLs:
// cars (art in carArt.js), the arena floor and fence, shadows, the chest and effect pixels.
// Arena textures are in art pixels; the scene shows them at PIXEL_SCALE.
import { paintCar, carTextureKey, CAR_ART_FACINGS, DRIVERS, PLAYER_DRIVER } from './carArt.js';
import { shade } from './color.js';
import {
  ARENA_MARGIN,
  TILE_SIZE,
  FLOOR_TILE_WIDTH,
  NOISE_TILE_SIZE,
  PIXEL_SCALE,
  FLOOR_NOISE_GENERATION_ALPHA,
  FLOOR_PLANK,
  WOOD_OUTLINE,
  WOOD_LIGHT,
  AI_COLORS,
  PLAYER_COLOR,
  TURBO_COLOR,
  TURBO_OUTLINE,
  BURST_COLORS,
  DUST_COLOR,
} from '../config/constants.js';

/** Creates a `width` x `height` canvas, lets `draw` paint on its context, returns a data URL. */
function drawTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx);
  return canvas.toDataURL('image/png');
}

function fillRect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Paints a grid of '#rrggbb' strings (null = transparent) into a texture, one cell per pixel. */
export function gridToDataUrl(grid) {
  return drawTexture(grid[0].length, grid.length, (ctx) => {
    grid.forEach((row, y) =>
      row.forEach((color, x) => {
        if (color) fillRect(ctx, color, x, y, 1, 1);
      }),
    );
  });
}

/** Small deterministic PRNG, so generated textures look the same on every load. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// === ARENA ===

const WOOD = {
  outline: WOOD_OUTLINE,
  dark: '#7d5236',
  light: WOOD_LIGHT,
  highlight: '#e0b983',
  dirt: '#5b3f2f',
};
const FENCE_SIZE = ARENA_MARGIN / PIXEL_SCALE;

/** One fence post: outlined, lit on the left and top, shaded on the right. */
function drawFencePost(ctx, x, y, w, h) {
  fillRect(ctx, WOOD.outline, x - 1, y - 1, w + 2, h + 2);
  fillRect(ctx, WOOD.light, x, y, w, h);
  fillRect(ctx, WOOD.highlight, x, y, 1, h);
  fillRect(ctx, WOOD.highlight, x, y, w, 1);
  fillRect(ctx, WOOD.dark, x + w - 1, y + 1, 1, h - 1);
}

/** A rail two art pixels thick, lit then shaded, laid along x (or along y when `vertical`). */
function drawFenceRail(ctx, offset, vertical) {
  [WOOD.light, WOOD.dark].forEach((color, i) => {
    if (vertical) fillRect(ctx, color, offset + i, 0, 1, FENCE_SIZE);
    else fillRect(ctx, color, 0, offset + i, FENCE_SIZE, 1);
  });
}

/**
 * Fence tile repeated along one side of the arena: two rails running along the side and one
 * post per tile. 'h' is for the top and bottom fences, 'v' for the left and right ones.
 */
export function createFenceTile(orientation) {
  const vertical = orientation === 'v';
  return drawTexture(FENCE_SIZE, FENCE_SIZE, (ctx) => {
    fillRect(ctx, WOOD.dirt, 0, 0, FENCE_SIZE, FENCE_SIZE);
    drawFenceRail(ctx, 2, vertical);
    drawFenceRail(ctx, 5, vertical);
    if (vertical) drawFencePost(ctx, 1, 3, 6, 2);
    else drawFencePost(ctx, 3, 1, 2, 6);
  });
}

/** Square corner post that covers the joints where two fence sides meet. */
export function createFenceCorner() {
  return drawTexture(FENCE_SIZE, FENCE_SIZE, (ctx) => {
    fillRect(ctx, WOOD.dirt, 0, 0, FENCE_SIZE, FENCE_SIZE);
    drawFencePost(ctx, 1, 1, FENCE_SIZE - 2, FENCE_SIZE - 2);
    fillRect(ctx, WOOD.outline, 3, 3, 2, 2); // cap
    fillRect(ctx, WOOD.highlight, 3, 3, 1, 1);
  });
}

/**
 * Wooden floor tile (FLOOR_TILE_WIDTH x TILE_SIZE): planks with a single dark seam, staggered
 * butt joints and subtle grain, so the repeat is hard to spot.
 */
export function createWoodFloorTile() {
  const w = FLOOR_TILE_WIDTH;
  const random = seededRandom(7);
  const randomInt = (n) => Math.floor(random() * n);
  return drawTexture(w, TILE_SIZE, (ctx) => {
    const grain = (color, y, h, count, minLength) => {
      for (let n = 0; n < count; n += 1) {
        fillRect(ctx, color, randomInt(w - 6), y + 1 + randomInt(h - 3), minLength + randomInt(minLength + 1), 1);
      }
    };
    let y = 0;
    [9, 7, 8, 8].forEach((h, i) => {
      const plank = shade(FLOOR_PLANK, i % 2 === 0 ? -4 : 4);
      fillRect(ctx, plank, 0, y, w, h);
      grain(shade(plank, 6), y, h, 4, 3);
      grain(shade(plank, -6), y, h, 3, 2);

      const joint = (i * 23 + 9) % w;
      fillRect(ctx, WOOD.outline, joint, y, 1, h - 1);
      fillRect(ctx, shade(plank, 8), joint + 1, y, 1, h - 1);
      fillRect(ctx, '#b8a48a', (joint + w - 3) % w, y + 2, 1, 1); // nail heads
      fillRect(ctx, '#b8a48a', (joint + 3) % w, y + h - 3, 1, 1);

      fillRect(ctx, WOOD.outline, 0, y + h - 1, w, 1);
      y += h;
    });
  });
}

/** Sparse dark specks laid over the floor, on a tile size that doesn't divide the floor's. */
export function createNoiseOverlay() {
  const size = NOISE_TILE_SIZE;
  const random = seededRandom(42);
  return drawTexture(size, size, (ctx) => {
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = random() < 0.15 ? 0 : 255;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = random() < 0.15 ? Math.floor(255 * FLOOR_NOISE_GENERATION_ALPHA) : 0;
    }
    ctx.putImageData(imageData, 0, 0);
  });
}

// === SHADOWS AND EFFECTS ===

/** Hard-edged pixel ellipse: one centred row per entry of `rowWidths`. */
export function createPixelEllipse(rowWidths, color) {
  const width = Math.max(...rowWidths);
  return drawTexture(width, rowWidths.length, (ctx) => {
    rowWidths.forEach((w, row) => fillRect(ctx, color, (width - w) / 2, row, w, 1));
  });
}

/** A crisp 1px ring, expanded by a tween for impact "pops". */
function createPopRing() {
  const size = 12;
  const center = (size - 1) / 2;
  const outer = size / 2;
  const grid = Array.from({ length: size }, (_r, y) =>
    Array.from({ length: size }, (_c, x) => {
      const d = Math.hypot(x - center, y - center);
      return d < outer && d >= outer - 1 ? '#ffffff' : null;
    }),
  );
  return gridToDataUrl(grid);
}

/**
 * The 16px bonus chest; `glint` moves the sparkles so two frames can alternate.
 * Its shadow is a separate image so it stays on the floor while the chest bobs.
 */
export function createBonusChest(glint) {
  return drawTexture(16, 16, (ctx) => {
    fillRect(ctx, '#3a2a12', 2, 3, 12, 11); // outline, so the chest reads against the floor
    fillRect(ctx, '#8b6914', 3, 8, 10, 5); // base
    fillRect(ctx, '#b8941f', 3, 4, 10, 4); // lid
    fillRect(ctx, '#d4af37', 3, 4, 10, 1);
    fillRect(ctx, '#4a4a4a', 3, 8, 10, 1); // band and straps
    fillRect(ctx, '#4a4a4a', 5, 4, 1, 9);
    fillRect(ctx, '#4a4a4a', 10, 4, 1, 9);
    fillRect(ctx, '#4a4a4a', 7, 7, 2, 3); // lock
    fillRect(ctx, '#9a9a9a', 7, 8, 1, 1);
    const sparkles = glint ? [[11, 5], [4, 11]] : [[4, 6], [12, 10]];
    sparkles.forEach(([x, y]) => {
      fillRect(ctx, '#fff5c0', x, y - 1, 1, 3);
      fillRect(ctx, '#fff5c0', x - 1, y, 3, 1);
    });
  });
}

// === MAIN ASSET GENERATION ===

const FRAMES = [0, 1];

function addCarTextures(assets) {
  const car = (dir, color, options) => gridToDataUrl(paintCar(dir, color, options));
  CAR_ART_FACINGS.forEach((dir) => {
    FRAMES.forEach((frame) => {
      const player = { driver: PLAYER_DRIVER, frame };
      assets[carTextureKey('player', dir, { frame })] = car(dir, PLAYER_COLOR, player);
      assets[carTextureKey('player', dir, { frame, turbo: true })] = car(dir, TURBO_COLOR, {
        ...player,
        outline: TURBO_OUTLINE,
      });
    });
    assets[carTextureKey('player', dir, { flash: true })] = car(dir, PLAYER_COLOR, { flash: true });
    AI_COLORS.forEach((color, idx) => {
      const base = `ai${idx}`;
      const driver = DRIVERS[idx % DRIVERS.length];
      FRAMES.forEach((frame) => {
        assets[carTextureKey(base, dir, { frame })] = car(dir, color, { driver, frame });
      });
      assets[carTextureKey(base, dir, { cool: true })] = car(dir, color, { driver, cool: true });
    });
  });
}

/** Every texture the game uses, keyed by texture name, as data URLs. */
export function generatePixelAssets() {
  const assets = {};
  addCarTextures(assets);

  assets.fence_h = createFenceTile('h');
  assets.fence_v = createFenceTile('v');
  assets.fence_corner = createFenceCorner();
  assets.floor_wood = createWoodFloorTile();
  assets.floor_noise = createNoiseOverlay();

  assets.bonus_chest = createBonusChest(false);
  assets.bonus_chest_glint = createBonusChest(true);
  assets.car_shadow = createPixelEllipse([18, 24, 26, 26, 24, 18], 'rgba(42, 31, 26, 0.45)');
  assets.chest_shadow = createPixelEllipse([7, 10, 10, 7], 'rgba(42, 31, 26, 0.45)');

  // Particle pixels; colours are baked in because Canvas can't tint particles.
  // Particles are one art pixel bigger than they look at the end of their life; see BURST_PARTICLES.
  const square = (color) => gridToDataUrl([[color, color], [color, color]]);
  Object.entries(BURST_COLORS).forEach(([kind, color]) => {
    assets[`px_${kind}`] = square(color);
  });
  assets.px_dust = square(DUST_COLOR);
  assets.pop_ring = createPopRing();
  return assets;
}
