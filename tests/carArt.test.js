import { describe, it, expect } from 'vitest';
import {
  colorRamp,
  paintCar,
  carTextureKey,
  carFlipped,
  CAR_ART_FACINGS,
  DRIVERS,
  PLAYER_DRIVER,
} from '../src/utils/carArt.js';
import { luminance } from '../src/utils/color.js';
import { AI_COLORS, CAR_PIXEL_SIZE, PLAYER_COLOR } from '../src/config/constants.js';

const colorsOf = (grid) => new Set(grid.flat().filter(Boolean));
const FACINGS = CAR_ART_FACINGS;
const VARIANTS = [{}, { frame: 1 }, { cool: true }, { flash: true }, { outline: '#ff7b29' }];

describe('colorRamp', () => {
  it.each([...AI_COLORS, PLAYER_COLOR])('keeps %s as the base and orders the tones by brightness', (hex) => {
    const ramp = colorRamp(hex);
    expect(ramp.b).toBe(hex);
    expect(luminance(ramp.h)).toBeGreaterThan(luminance(ramp.b));
    expect(luminance(ramp.b)).toBeGreaterThan(luminance(ramp.s));
    expect(luminance(ramp.s)).toBeGreaterThan(luminance(ramp.l));
  });
});

describe('paintCar', () => {
  it.each(FACINGS)('gives every template pixel of the %s car a colour in every variant', (dir) => {
    [DRIVERS[0], PLAYER_DRIVER].forEach((driver) =>
      VARIANTS.forEach((variant) => {
        const grid = paintCar(dir, '#5a7fc0', { driver, ...variant });
        expect(grid.flat().every((c) => c === null || /^#[0-9a-f]{6}$/.test(c))).toBe(true);
      }),
    );
  });

  it.each(FACINGS)('paints a full %s car inside a 1px margin', (dir) => {
    const grid = paintCar(dir, '#5a7fc0');
    expect(grid).toHaveLength(CAR_PIXEL_SIZE);
    grid.forEach((row) => expect(row).toHaveLength(CAR_PIXEL_SIZE));
    const last = CAR_PIXEL_SIZE - 1;
    const edges = [...grid[0], ...grid[last], ...grid.map((row) => row[0]), ...grid.map((row) => row[last])];
    expect(edges.every((c) => c === null)).toBe(true);
    expect(grid.flat().filter(Boolean).length).toBeGreaterThan(200);
  });

  it('uses the body colour and the driver palette', () => {
    const colors = colorsOf(paintCar('down', '#86a84e', { driver: DRIVERS[1] }));
    expect(colors.has('#86a84e')).toBe(true);
    expect(colors.has(DRIVERS[1].u)).toBe(true);
  });

  it('flash keeps only the outline and the flash white', () => {
    const colors = colorsOf(paintCar('right', '#5a7fc0', { flash: true }));
    expect(colors.size).toBe(2);
  });

  it('cooldown look turns the lights off and drops the body colour', () => {
    const colors = colorsOf(paintCar('down', '#5a7fc0', { cool: true }));
    expect(colors.has('#5a7fc0')).toBe(false);
    expect(colors.has('#ffd86b')).toBe(false);
  });

  it('outline adds a ring of that colour around the car, but not around the pole', () => {
    const plain = paintCar('right', '#ffcf3f');
    const outlined = paintCar('right', '#ffcf3f', { outline: '#ff7b29' });
    const count = (grid) => grid.flat().filter(Boolean).length;
    expect(count(outlined)).toBeGreaterThan(count(plain));
    expect(colorsOf(outlined).has('#ff7b29')).toBe(true);
    // The pole is a lone column at the top; its rows stay one pixel wide.
    expect(outlined[2].filter(Boolean)).toHaveLength(1);
  });

  it('bob frame moves the driver but not the chassis', () => {
    const still = paintCar('right', '#5a7fc0');
    const bob = paintCar('right', '#5a7fc0', { frame: 1 });
    expect(bob).not.toEqual(still);
    expect(bob.slice(20)).toEqual(still.slice(20));
  });

  it.each(FACINGS)('bob frame opens no holes in the %s car below the head', (dir) => {
    const still = paintCar(dir, '#5a7fc0');
    const bob = paintCar(dir, '#5a7fc0', { frame: 1 });
    const holes = [];
    still.forEach((row, y) => row.forEach((c, x) => c && !bob[y][x] && holes.push(y)));
    // Only the top of the head may move away.
    expect(holes.every((y) => y <= 8)).toBe(true);
  });
});

describe('car texture keys', () => {
  it.each([
    ['player', 'up', {}, 'player_up_0'],
    ['player', 'down', { frame: 1 }, 'player_down_1'],
    ['player', 'right', { turbo: true, frame: 1 }, 'player_turbo_right_1'],
    ['player', 'left', { turbo: true }, 'player_turbo_right_0'],
    ['ai3', 'right', { cool: true, frame: 1 }, 'ai3_cool_right'],
    ['ai3', 'left', { cool: true, flash: true }, 'car_flash_right'],
    ['player', 'up', { turbo: true, flash: true }, 'car_flash_up'],
  ])('%s facing %s with %o is %s', (base, facing, look, key) => {
    expect(carTextureKey(base, facing, look)).toBe(key);
  });

  it('draws left by flipping the right-facing art', () => {
    expect(['up', 'down', 'left', 'right'].filter(carFlipped)).toEqual(['left']);
    expect(CAR_ART_FACINGS).not.toContain('left');
  });
});
