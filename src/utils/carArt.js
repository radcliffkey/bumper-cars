// Pixel art for the bumper cars: ASCII templates painted with a per-car palette.
// Everything here is pure (it returns colour grids), so it can be tested without a canvas;
// assets.js turns the grids into textures.
//
// Template characters:
//   h b s l  body ramp (highlight, base, shadow, line)   o  outline
//   r R      rubber bumper                                k K  cockpit, seat
//   g        steering wheel                               y w  headlight, t T  tail light
//   p P      pole and its tip                             c    stripe
//   f F      driver skin, a A hair, u U shirt, e eyes, m mouth

import { CAR_PIXEL_SIZE, FLOOR_SHADE, WOOD_OUTLINE } from '../config/constants.js';
import { hexToHsl, hslToHex, mix } from './color.js';

const CH_SIDE = {
  x: 2,
  y: 1,
  rows: [
    '....P.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '....p.......................',
    '...oooooo...................',
    '..olhhhhlo....k.............',
    '..lhbbbbbl.....kkooooo......',
    '.olbbbbbskkkkkkkolhhhloo....',
    '.lhbbbbbskkkkkkkgbbbbbhhlo..',
    '.lhbbbbbbssssssssbbbbbbbbhl.',
    '.lbbbbbbbbbbbbbbbbbbbbbbbbyo',
    '.lbccccccccccccccccccccbbbwo',
    '.lbbbbbbbbbbbbbbbbbbbbbbbsyo',
    '.osssssssssssssssssssssssso.',
    'oRRRRRRRRRRRRRRRRRRRRRRRRRRo',
    'orrrrrrrrrrrrrrrrrrrrrrrrrro',
    '.oooooooooooooooooooooooooo.',
  ],
};

const DR_SIDE = {
  x: 10,
  y: 6,
  rows: [
    '.ooooo...',
    'oaAAaao..',
    'oaaafffo.',
    'oaaffefo.',
    'oaFffffo.',
    '.oFfffo..',
    '.ouuuo...',
    '.uuuuo...',
    '.uuuuuo..',
    '.uuuUuuuf',
    '.uuuu....',
  ],
};

const CH_FRONT = {
  x: 3,
  y: 1,
  rows: [
    '.............P............',
    '.............p............',
    '.............p............',
    '.............p............',
    '.............p............',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '..........................',
    '......oooooooooooooo......',
    '.....oKKKKKKKKKKKKKKo.....',
    '...ooKkkkkkkkkkkkkkKoo....',
    '..olhkkkkkkkkkkkkkkkbso...',
    '..lhbkkkkkkkkkkkkkkkbbs...',
    '.olhhhhhhhhhhhhhhhhhbbslo.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lbwybbbbbccccccbbbbbwysl.',
    '.lbyybbbbbccccccbbbbbyysl.',
    '.osssssssssssssssssssssso.',
    'oRRRRRRRRRRRRRRRRRRRRRRRRo',
    'orrrrrrrrrrrrrrrrrrrrrrrro',
    '.oooooooooooooooooooooooo.',
  ],
};

const DR_FRONT = {
  x: 11,
  y: 5,
  rows: [
    '..oooooo..',
    '.oaAAaaao.',
    '.oaaaaaao.',
    '.oaffffao.',
    '.ofeffefo.',
    '.offffffo.',
    '..ofmmfo..',
    'ouuuFFuuuo',
    'ouuuuuuuuo',
    'oUuuuuuuUo',
    'ofuggggufo',
  ],
};

const CH_BACK = {
  x: 3,
  y: 11,
  rows: [
    '......oooooooooooooo......',
    '.....oKKKKKKKKKKKKKKo.....',
    '...ooKKKKKKKKKKKKKKKoo....',
    '..olhkKKKKKKKKKKKKKkbso...',
    '..lhbkkkkkkkkkkkkkkkbbs...',
    '.olhhhhhhhhhhhhhhhhhbbslo.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lhbbbbbbbccccccbbbbbbbsl.',
    '.lbTtbbbbbccccccbbbbbTtsl.',
    '.lbttbbbbbccccccbbbbbttsl.',
    '.osssssssssssssssssssssso.',
    'oRRRRRRRRRRRRRRRRRRRRRRRRo',
    'orrrrrrrrrrrrrrrrrrrrrrrro',
    '.oooooooooooooooooooooooo.',
  ],
};

const DR_BACK = {
  x: 11,
  y: 5,
  rows: [
    '..oooooo..',
    '.oaAAaaao.',
    '.oaaaaaao.',
    '.oaaaaaao.',
    '.oaaaaaao.',
    '.oFaaaaFo.',
    '..offffo..',
    'ouuuuuuuuo',
    'ouuuuuuuuo',
  ],
};

const POLE_BACK = {
  x: 16,
  y: 1,
  rows: [
    'P',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
    'p',
  ],
};

const LAYERS = {
  side: [CH_SIDE, { ...DR_SIDE, driver: true }],
  down: [CH_FRONT, { ...DR_FRONT, driver: true }],
  up: [CH_BACK, { ...DR_BACK, driver: true }, POLE_BACK],
};

const OUTLINE = '#2b1d16';
const FLASH = '#fff8e6';
const POLE = new Set(['p', 'P']); // left out of the turbo outline, or it turns into a double line

const FIXED_COLORS = {
  o: OUTLINE,
  r: '#34292c',
  R: '#5e5054',
  k: '#3d2a20',
  K: '#6b4a35',
  g: '#241c1c',
  y: '#ffd86b',
  w: '#fff6d8',
  t: '#b23a32',
  T: '#f0705c',
  p: '#8a8690',
  P: '#fff1a8',
  c: '#f3e3c0',
  e: OUTLINE,
  m: '#a8503c',
};

/** Facings that have their own car art; 'left' reuses 'right', flipped (see carFlipped). */
export const CAR_ART_FACINGS = Object.freeze(['up', 'down', 'right']);

export function carFlipped(facing) {
  return facing === 'left';
}

/**
 * Texture key for a car's current look; generatePixelAssets creates a texture for every key
 * this can return. `base` is 'player' or 'ai<n>'. A hit flash wins over the cooldown look,
 * which wins over turbo and the driving bob frame.
 */
export function carTextureKey(base, facing, { frame = 0, cool = false, flash = false, turbo = false } = {}) {
  const art = carFlipped(facing) ? 'right' : facing;
  if (flash) return `car_flash_${art}`;
  if (cool) return `${base}_cool_${art}`;
  return `${turbo ? `${base}_turbo` : base}_${art}_${frame}`;
}

/** Driver looks (skin, hair, shirt); the last one, with a cream helmet, is the player's. */
export const DRIVERS = [
  { f: '#f0c9a0', F: '#d49a72', a: '#5c3a21', A: '#7d5433', u: '#e9dcc0', U: '#c2b393' },
  { f: '#c68e5e', F: '#a06c44', a: '#2e2320', A: '#4a3a36', u: '#7fb2c9', U: '#5c8ea8' },
  { f: '#f3d3b4', F: '#d8a585', a: '#d9a441', A: '#f0c868', u: '#d47a98', U: '#b05a78' },
  { f: '#8d5a3b', F: '#6e4229', a: '#b8b2a8', A: '#dcd6cc', u: '#86a84e', U: '#64853a' },
  { f: '#f0c9a0', F: '#d49a72', a: '#b5532f', A: '#d9743f', u: '#5a7fc0', U: '#44629c' },
];
export const PLAYER_DRIVER = { f: '#f0c9a0', F: '#d49a72', a: '#f3e3c0', A: '#fff6d8', u: '#f3e3c0', U: '#cdbb95' };

/** Moves hue `h` a fraction `t` of the way to `target`, by at most `cap` degrees. */
function hueToward(h, target, t, cap) {
  const d = ((target - h + 540) % 360) - 180;
  return h + Math.max(-cap, Math.min(cap, d * t));
}

/**
 * Highlight, base, shadow and line colours for a body colour. Shadows drift toward
 * blue-violet and highlights toward yellow, the usual pixel-art hue shift.
 */
export function colorRamp(hex) {
  const [h, s, l] = hexToHsl(hex);
  return {
    h: hslToHex(hueToward(h, 50, 0.25, 18), s * 0.85, l + (1 - l) * 0.35),
    b: hex,
    s: hslToHex(hueToward(h, 260, 0.25, 22), s * 0.92, l * 0.74),
    l: hslToHex(hueToward(h, 260, 0.35, 30), s * 0.8, l * 0.42),
  };
}

/**
 * A car facing 'up', 'down' or 'right' (left is drawn flipped) as a CAR_PIXEL_SIZE square grid of '#rrggbb' strings (null = transparent).
 * - frame 1 drops the driver 1px and dims the pole tip: alternate it with 0 for a driving bob.
 * - outline draws a 1px ring of that colour around the car (the turbo look).
 * - flash paints everything but the outline white, for the moment a car is hit.
 * - cool fades the body toward the floor and turns the lights off: the car can't score yet.
 */
export function paintCar(direction, bodyColor, options = {}) {
  const { driver = DRIVERS[0], frame = 0, outline = null, flash = false, cool = false } = options;
  const n = CAR_PIXEL_SIZE;
  const grid = Array.from({ length: n }, () => Array(n).fill('.'));
  LAYERS[direction === 'right' ? 'side' : direction].forEach(({ x, y, rows, driver: isDriver }) => {
    const dy = isDriver ? frame : 0;
    rows.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        const gy = y + ry + dy;
        if (ch !== '.' && gy < n) grid[gy][x + rx] = ch;
      });
    });
  });

  const palette = { ...FIXED_COLORS, ...colorRamp(bodyColor), ...driver };
  if (frame === 1 || cool) palette.P = palette.p;
  if (cool) {
    'hbslc'.split('').forEach((k) => {
      palette[k] = mix(palette[k], FLOOR_SHADE, 0.6);
    });
    ['y', 'w', 't', 'T'].forEach((k) => {
      palette[k] = WOOD_OUTLINE;
    });
  }

  const isBody = (x, y) => x >= 0 && y >= 0 && x < n && y < n && grid[y][x] !== '.' && !POLE.has(grid[y][x]);
  return grid.map((row, y) =>
    row.map((ch, x) => {
      if (ch === '.') {
        const touches = isBody(x + 1, y) || isBody(x - 1, y) || isBody(x, y + 1) || isBody(x, y - 1);
        return outline && touches ? outline : null;
      }
      if (flash) return ch === 'o' ? OUTLINE : FLASH;
      return palette[ch];
    }),
  );
}
