// Assets are generated as tiny base64 PNGs to emulate cozy pixel art.
// We produce directional car sprites, a wooden floor tile, and a fence tile.
import { CAR_PIXEL_SIZE, TILE_SIZE, FLOOR_NOISE_GENERATION_ALPHA } from '../config/constants.js';

function drawCarFacing(direction, colorHex, size = 32) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const s = size / 32; // scale factor

  // base shadow
  ctx.fillStyle = '#2a1f1a';
  ctx.fillRect(8 * s, 22 * s, 16 * s, 3 * s);

  // wheels
  ctx.fillStyle = '#2f2f2f';
  if (direction === 'left' || direction === 'right') {
    ctx.fillRect(8 * s, 8 * s, 3 * s, 6 * s);
    ctx.fillRect(8 * s, 18 * s, 3 * s, 6 * s);
    ctx.fillRect(21 * s, 8 * s, 3 * s, 6 * s);
    ctx.fillRect(21 * s, 18 * s, 3 * s, 6 * s);
  } else {
    ctx.fillRect(6 * s, 10 * s, 6 * s, 3 * s);
    ctx.fillRect(20 * s, 10 * s, 6 * s, 3 * s);
    ctx.fillRect(6 * s, 20 * s, 6 * s, 3 * s);
    ctx.fillRect(20 * s, 20 * s, 6 * s, 3 * s);
  }

  // body main
  ctx.fillStyle = colorHex;
  ctx.fillRect(7 * s, 9 * s, 18 * s, 14 * s);

  // darker shade at bottom/right to add depth
  ctx.fillStyle = shade(colorHex, -20);
  ctx.fillRect(7 * s, 20 * s, 18 * s, 3 * s);
  ctx.fillRect(22 * s, 9 * s, 3 * s, 14 * s);

  // bumper highlights
  ctx.fillStyle = '#111111';
  ctx.fillRect(7 * s, 8 * s, 18 * s, 1 * s);
  ctx.fillRect(7 * s, 23 * s, 18 * s, 1 * s);

  // cockpit/windshield and driver head position varies by direction
  ctx.fillStyle = '#6bd3ff'; // glass
  if (direction === 'up') {
    ctx.fillRect(10 * s, 10 * s, 12 * s, 6 * s);
    ctx.fillStyle = '#eac39b'; // driver
    ctx.fillRect(14 * s, 12 * s, 4 * s, 4 * s);
  } else if (direction === 'down') {
    ctx.fillRect(10 * s, 16 * s, 12 * s, 6 * s);
    ctx.fillStyle = '#eac39b';
    ctx.fillRect(14 * s, 18 * s, 4 * s, 4 * s);
  } else if (direction === 'left') {
    ctx.fillRect(9 * s, 12 * s, 10 * s, 8 * s);
    ctx.fillStyle = '#eac39b';
    ctx.fillRect(10 * s, 14 * s, 4 * s, 4 * s);
  } else {
    ctx.fillRect(13 * s, 12 * s, 10 * s, 8 * s);
    ctx.fillStyle = '#eac39b';
    ctx.fillRect(18 * s, 14 * s, 4 * s, 4 * s);
  }

  // lights
  ctx.fillStyle = '#ffd86b';
  if (direction === 'up') {
    ctx.fillRect(9 * s, 8 * s, 4 * s, 2 * s);
    ctx.fillRect(19 * s, 8 * s, 4 * s, 2 * s);
  } else if (direction === 'down') {
    ctx.fillRect(9 * s, 24 * s, 4 * s, 2 * s);
    ctx.fillRect(19 * s, 24 * s, 4 * s, 2 * s);
  } else if (direction === 'left') {
    ctx.fillRect(6 * s, 12 * s, 2 * s, 4 * s);
    ctx.fillRect(6 * s, 20 * s, 2 * s, 4 * s);
  } else {
    ctx.fillRect(24 * s, 12 * s, 2 * s, 4 * s);
    ctx.fillRect(24 * s, 20 * s, 2 * s, 4 * s);
  }

  return c.toDataURL('image/png');
}

function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function createFenceTile() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  // background dirt edge
  ctx.fillStyle = '#5b3f2f';
  ctx.fillRect(0, 0, 16, 16);
  // fence posts
  ctx.fillStyle = '#c89b67';
  ctx.fillRect(2, 2, 4, 12);
  ctx.fillRect(10, 2, 4, 12);
  // rails
  ctx.fillStyle = '#9b6a47';
  ctx.fillRect(0, 5, 16, 2);
  ctx.fillRect(0, 9, 16, 2);
  // outlines
  ctx.fillStyle = '#5a3e2b';
  ctx.fillRect(2, 2, 1, 12);
  ctx.fillRect(10, 2, 1, 12);
  return c.toDataURL('image/png');
}

function createWoodPlankTile32() {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d');
  // background
  ctx.fillStyle = '#6f4f3b';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // draw horizontal planks with slight shade variation
  const plankHeights = [9, 7, 8, 8];
  let y = 0;
  for (let i = 0; i < plankHeights.length; i += 1) {
    const h = plankHeights[i];
    const shadeDelta = i % 2 === 0 ? -8 : 8;
    ctx.fillStyle = shade('#7e5a3f', shadeDelta);
    ctx.fillRect(0, y, TILE_SIZE, h);
    // top and bottom darker lines
    ctx.fillStyle = '#5a3e2b';
    ctx.fillRect(0, y, TILE_SIZE, 1);
    ctx.fillRect(0, y + h - 1, TILE_SIZE, 1);
    // random grain
    ctx.fillStyle = '#a27a53';
    for (let gx = 2; gx < TILE_SIZE - 2; gx += 6) {
      const gy = y + 2 + ((gx + i * 3) % (h - 3));
      ctx.fillRect(gx, gy, 2, 1);
    }
    y += h;
  }
  // occasional nail heads
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(6, 6, 1, 1);
  ctx.fillRect(20, 14, 1, 1);
  ctx.fillRect(10, 24, 1, 1);
  return c.toDataURL('image/png');
}

function createNoiseOverlay32(alpha = FLOOR_NOISE_GENERATION_ALPHA) {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d');
  const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() < 0.15 ? 0 : 255; // sparse dark specks
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = Math.random() < 0.15 ? Math.floor(255 * alpha) : 0;
  }
  ctx.putImageData(imageData, 0, 0);
  return c.toDataURL('image/png');
}

export function generatePixelAssets() {
  const assets = {};

  // Player (red) directional sprites
  ['up', 'down', 'left', 'right'].forEach((dir) => {
    assets[`player_${dir}`] = drawCarFacing(dir, '#c64b4b', CAR_PIXEL_SIZE);
  });

  const aiColors = [
    '#4b79d6', // royal blue
    '#3bbf6b', // emerald
    '#d6c14b', // gold
    '#9a4bd6', // violet
    '#d64b8c', // fuchsia
    '#4bd6c6', // aqua
    '#d67f4b', // orange
    '#6b4bd6', // indigo
    '#4bd64f', // lime
    '#4bd6a5', // mint
  ];
  aiColors.forEach((color, idx) => {
    ['up', 'down', 'left', 'right'].forEach((dir) => {
      assets[`ai${idx}_${dir}`] = drawCarFacing(dir, color, CAR_PIXEL_SIZE);
    });
  });

  assets.fence_tile = createFenceTile();
  assets.floor_wood = createWoodPlankTile32();
  assets.floor_noise = createNoiseOverlay32();

  return assets;
}


