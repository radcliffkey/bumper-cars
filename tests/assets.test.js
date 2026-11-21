import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  gridToDataUrl,
  createFenceTile,
  createFenceCorner,
  createWoodFloorTile,
  createNoiseOverlay,
  createPixelEllipse,
  createBonusChest,
  seededRandom,
  generatePixelAssets,
} from '../src/utils/assets.js';
import { carTextureKey } from '../src/utils/carArt.js';
import {
  AI_COLORS,
  ARENA_MARGIN,
  BURST_COLORS,
  FLOOR_TILE_WIDTH,
  NOISE_TILE_SIZE,
  PIXEL_SCALE,
  TILE_SIZE,
} from '../src/config/constants.js';

// A fake canvas that records its size and every fillRect, so tests can check what was drawn.
const canvases = [];
function fakeCanvas() {
  const rects = [];
  const ctx = {
    fillStyle: '',
    fillRect: vi.fn((x, y, w, h) => rects.push({ x, y, w, h, color: ctx.fillStyle })),
    createImageData: vi.fn((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn(),
  };
  const canvas = { width: 0, height: 0, ctx, rects, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,x' };
  canvases.push(canvas);
  return canvas;
}

Object.defineProperty(global, 'document', {
  value: { createElement: vi.fn((tag) => (tag === 'canvas' ? fakeCanvas() : null)) },
  writable: true,
});

const lastCanvas = () => canvases[canvases.length - 1];

describe('asset generation', () => {
  beforeEach(() => {
    canvases.length = 0;
  });

  it('seededRandom repeats its sequence for the same seed', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const seq = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seq);
    seq.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });
  });

  it('gridToDataUrl paints one 1x1 rect per coloured cell and skips empty ones', () => {
    expect(gridToDataUrl([['#111111', null], [null, '#222222']])).toMatch(/^data:image\/png/);
    const canvas = lastCanvas();
    expect([canvas.width, canvas.height]).toEqual([2, 2]);
    expect(canvas.rects.map((r) => [r.x, r.y, r.w, r.h, r.color])).toEqual([
      [0, 0, 1, 1, '#111111'],
      [1, 1, 1, 1, '#222222'],
    ]);
  });

  it.each(['h', 'v'])('fence tile %s is the fence width at art scale', (orientation) => {
    createFenceTile(orientation);
    expect(lastCanvas().width).toBe(ARENA_MARGIN / PIXEL_SCALE);
  });

  it('fence corner matches the fence tiles', () => {
    createFenceCorner();
    expect(lastCanvas().width).toBe(ARENA_MARGIN / PIXEL_SCALE);
  });

  it('floor tile has the floor dimensions and is identical on every load', () => {
    createWoodFloorTile();
    const first = lastCanvas();
    createWoodFloorTile();
    const second = lastCanvas();
    expect([first.width, first.height]).toEqual([FLOOR_TILE_WIDTH, TILE_SIZE]);
    expect(second.rects).toEqual(first.rects);
  });

  it('noise overlay is deterministic and uses its own tile size', () => {
    createNoiseOverlay();
    const first = lastCanvas();
    createNoiseOverlay();
    const second = lastCanvas();
    expect(first.ctx.createImageData).toHaveBeenCalledWith(NOISE_TILE_SIZE, NOISE_TILE_SIZE);
    expect(second.ctx.putImageData.mock.calls[0][0].data).toEqual(first.ctx.putImageData.mock.calls[0][0].data);
  });

  it('pixel ellipse draws one centred row per width', () => {
    createPixelEllipse([2, 6, 2], '#000');
    const canvas = lastCanvas();
    expect([canvas.width, canvas.height]).toEqual([6, 3]);
    expect(canvas.rects.map((r) => [r.x, r.y, r.w])).toEqual([[2, 0, 2], [0, 1, 6], [2, 2, 2]]);
  });

  it('chest frames differ only in the glint', () => {
    createBonusChest(false);
    const plain = lastCanvas().rects;
    createBonusChest(true);
    const glint = lastCanvas().rects;
    expect(glint.length).toBe(plain.length);
    expect(glint).not.toEqual(plain);
  });

  describe('generatePixelAssets', () => {
    const facings = ['up', 'down', 'left', 'right'];

    it('has a texture for every car look the scene can ask for', () => {
      const assets = generatePixelAssets();
      const looks = [{}, { frame: 1 }, { flash: true }];
      const keys = [];
      facings.forEach((facing) => {
        [...looks, { turbo: true }, { turbo: true, frame: 1 }].forEach((look) =>
          keys.push(carTextureKey('player', facing, look)),
        );
        AI_COLORS.forEach((_c, i) =>
          [...looks, { cool: true }].forEach((look) => keys.push(carTextureKey(`ai${i}`, facing, look))),
        );
      });
      expect(keys.filter((key) => !(key in assets))).toEqual([]);
    });

    it('has the arena, chest and effect textures', () => {
      const assets = generatePixelAssets();
      [
        'fence_h',
        'fence_v',
        'fence_corner',
        'floor_wood',
        'floor_noise',
        'bonus_chest',
        'bonus_chest_glint',
        'car_shadow',
        'chest_shadow',
        ...Object.keys(BURST_COLORS).map((kind) => `px_${kind}`),
        'px_dust',
        'pop_ring',
      ].forEach((key) => expect(assets).toHaveProperty(key));
    });
  });
});
