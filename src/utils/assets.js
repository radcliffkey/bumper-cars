// Assets are generated as tiny base64 PNGs to emulate cozy pixel art.
// We produce directional car sprites, a wooden floor tile, and a fence tile.
import { 
  CAR_PIXEL_SIZE, 
  TILE_SIZE, 
  FLOOR_NOISE_GENERATION_ALPHA,
  AI_COLORS,
  PLAYER_COLOR 
} from '../config/constants.js';

// In test environments, the mocked 2D context may be missing path APIs.
// This helper ensures required methods exist as safe no-ops.
function get2DContext(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return ctx;
  if (typeof ctx.beginPath !== 'function') ctx.beginPath = () => {};
  if (typeof ctx.arc !== 'function') ctx.arc = () => {};
  if (typeof ctx.fill !== 'function') ctx.fill = () => {};
  if (typeof ctx.stroke !== 'function') ctx.stroke = () => {};
  if (typeof ctx.closePath !== 'function') ctx.closePath = () => {};
  return ctx;
}

export function drawCarFacing(direction, colorHex, size = 32) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = get2DContext(c);
  const s = size / 32; // scale factor

  // base shadow
  ctx.fillStyle = 'rgba(42, 31, 26, 0.5)';
  ctx.fillRect(6 * s, 24 * s, 20 * s, 3 * s);

  // Draw bumper car from appropriate angle
  if (direction === 'left') {
    drawCarSideViewLeft(ctx, s, colorHex);
  } else if (direction === 'right') {
    drawCarSideViewRight(ctx, s, colorHex);
  } else if (direction === 'up') {
    drawCarBackView(ctx, s, colorHex);
  } else { // down
    drawCarFrontView(ctx, s, colorHex);
  }

  return c.toDataURL('image/png');
}

function drawCarSideViewLeft(ctx, s, colorHex) {
  // Wheels (visible on side)
  ctx.fillStyle = '#1a1a1a';
  // Front wheel
  ctx.beginPath();
  ctx.arc(9 * s, 20 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Back wheel
  ctx.beginPath();
  ctx.arc(22 * s, 20 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Wheel rims
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.arc(9 * s, 20 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(22 * s, 20 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Car body lower section (main bumper car body)
  ctx.fillStyle = colorHex;
  ctx.fillRect(6 * s, 11 * s, 20 * s, 10 * s);
  
  // Rounded front and back
  ctx.beginPath();
  ctx.arc(6 * s, 16 * s, 5 * s, Math.PI / 2, Math.PI * 1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(26 * s, 16 * s, 5 * s, Math.PI * 1.5, Math.PI / 2);
  ctx.fill();

  // Shading on body (darker bottom)
  ctx.fillStyle = shade(colorHex, -25);
  ctx.fillRect(6 * s, 18 * s, 20 * s, 3 * s);
  
  // Bumper rubber trim
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(5 * s, 11 * s, 1 * s, 10 * s);
  ctx.fillRect(26 * s, 11 * s, 1 * s, 10 * s);

  // Highlight on top of body
  ctx.fillStyle = shade(colorHex, 15);
  ctx.fillRect(7 * s, 11 * s, 18 * s, 2 * s);

  // Headlight
  ctx.fillStyle = '#ffd86b';
  ctx.fillRect(5 * s, 14 * s, 2 * s, 3 * s);
  ctx.fillStyle = '#fff9e6';
  ctx.fillRect(5 * s, 15 * s, 1 * s, 1 * s);

  // Seat/cockpit area
  ctx.fillStyle = '#4a3428';
  ctx.fillRect(11 * s, 9 * s, 9 * s, 4 * s);

  // Windshield
  ctx.fillStyle = '#89d5f7';
  ctx.fillRect(9 * s, 8 * s, 4 * s, 5 * s);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(9 * s, 8 * s, 2 * s, 3 * s);

  // Driver's head (large and cartoonish) - facing left
  ctx.fillStyle = '#f4d2a6'; // skin tone
  ctx.beginPath();
  ctx.arc(14 * s, 7 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(11 * s, 3 * s, 6 * s, 3 * s);
  ctx.fillRect(11 * s, 5 * s, 5 * s, 2 * s);

  // Ear (left side)
  ctx.fillStyle = '#eac39b';
  ctx.fillRect(10 * s, 7 * s, 2 * s, 2 * s);

  // Eye (simple, looking left)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(11 * s, 6 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(11 * s, 7 * s, 1 * s, 1 * s);

  // Smile
  ctx.fillStyle = '#8b5a3c';
  ctx.fillRect(11 * s, 9 * s, 2 * s, 1 * s);

  // Neck
  ctx.fillStyle = '#f4d2a6';
  ctx.fillRect(13 * s, 10 * s, 3 * s, 2 * s);

  // Steering wheel
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 1 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawCarSideViewRight(ctx, s, colorHex) {
  // Wheels (visible on side)
  ctx.fillStyle = '#1a1a1a';
  // Front wheel
  ctx.beginPath();
  ctx.arc(23 * s, 20 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  // Back wheel
  ctx.beginPath();
  ctx.arc(10 * s, 20 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Wheel rims
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.arc(23 * s, 20 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10 * s, 20 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Car body lower section (main bumper car body)
  ctx.fillStyle = colorHex;
  ctx.fillRect(6 * s, 11 * s, 20 * s, 10 * s);
  
  // Rounded front and back
  ctx.beginPath();
  ctx.arc(26 * s, 16 * s, 5 * s, Math.PI * 1.5, Math.PI / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6 * s, 16 * s, 5 * s, Math.PI / 2, Math.PI * 1.5);
  ctx.fill();

  // Shading on body (darker bottom)
  ctx.fillStyle = shade(colorHex, -25);
  ctx.fillRect(6 * s, 18 * s, 20 * s, 3 * s);
  
  // Bumper rubber trim
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(5 * s, 11 * s, 1 * s, 10 * s);
  ctx.fillRect(26 * s, 11 * s, 1 * s, 10 * s);

  // Highlight on top of body
  ctx.fillStyle = shade(colorHex, 15);
  ctx.fillRect(7 * s, 11 * s, 18 * s, 2 * s);

  // Headlight
  ctx.fillStyle = '#ffd86b';
  ctx.fillRect(25 * s, 14 * s, 2 * s, 3 * s);
  ctx.fillStyle = '#fff9e6';
  ctx.fillRect(26 * s, 15 * s, 1 * s, 1 * s);

  // Seat/cockpit area
  ctx.fillStyle = '#4a3428';
  ctx.fillRect(12 * s, 9 * s, 9 * s, 4 * s);

  // Windshield
  ctx.fillStyle = '#89d5f7';
  ctx.fillRect(19 * s, 8 * s, 4 * s, 5 * s);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(21 * s, 8 * s, 2 * s, 3 * s);

  // Driver's head (large and cartoonish) - facing right
  ctx.fillStyle = '#f4d2a6'; // skin tone
  ctx.beginPath();
  ctx.arc(18 * s, 7 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(15 * s, 3 * s, 6 * s, 3 * s);
  ctx.fillRect(16 * s, 5 * s, 5 * s, 2 * s);

  // Ear (right side)
  ctx.fillStyle = '#eac39b';
  ctx.fillRect(20 * s, 7 * s, 2 * s, 2 * s);

  // Eye (simple, looking right)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(19 * s, 6 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(20 * s, 7 * s, 1 * s, 1 * s);

  // Smile
  ctx.fillStyle = '#8b5a3c';
  ctx.fillRect(19 * s, 9 * s, 2 * s, 1 * s);

  // Neck
  ctx.fillStyle = '#f4d2a6';
  ctx.fillRect(16 * s, 10 * s, 3 * s, 2 * s);

  // Steering wheel
  ctx.fillStyle = '#4a4a4a';
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 1 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawCarFrontView(ctx, s, colorHex) {
  // Front wheels (both visible from front)
  ctx.fillStyle = '#1a1a1a';
  // Left wheel
  ctx.fillRect(7 * s, 19 * s, 4 * s, 4 * s);
  // Right wheel
  ctx.fillRect(21 * s, 19 * s, 4 * s, 4 * s);

  // Wheel highlights
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(8 * s, 20 * s, 2 * s, 2 * s);
  ctx.fillRect(22 * s, 20 * s, 2 * s, 2 * s);

  // Car body - rounded front
  ctx.fillStyle = colorHex;
  // Main body
  ctx.fillRect(7 * s, 12 * s, 18 * s, 10 * s);
  
  // Rounded top
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 9 * s, Math.PI, Math.PI * 2);
  ctx.fill();

  // Darker shading on sides
  ctx.fillStyle = shade(colorHex, -25);
  ctx.fillRect(7 * s, 13 * s, 2 * s, 9 * s);
  ctx.fillRect(23 * s, 13 * s, 2 * s, 9 * s);

  // Front bumper rubber
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(8 * s, 21 * s, 16 * s, 1 * s);

  // Highlight on top
  ctx.fillStyle = shade(colorHex, 15);
  ctx.fillRect(10 * s, 8 * s, 12 * s, 2 * s);

  // Windshield/cockpit area
  ctx.fillStyle = '#89d5f7';
  ctx.fillRect(10 * s, 10 * s, 12 * s, 5 * s);
  // Windshield reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(11 * s, 10 * s, 5 * s, 3 * s);

  // Driver's head (large and cartoonish) - facing forward
  ctx.fillStyle = '#f4d2a6'; // skin tone
  ctx.beginPath();
  ctx.arc(16 * s, 6 * s, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(12 * s, 2 * s, 8 * s, 3 * s);
  ctx.fillRect(12 * s, 4 * s, 8 * s, 2 * s);
  // Hair sides
  ctx.fillRect(11 * s, 4 * s, 2 * s, 3 * s);
  ctx.fillRect(19 * s, 4 * s, 2 * s, 3 * s);

  // Both ears (front view)
  ctx.fillStyle = '#eac39b';
  ctx.fillRect(11 * s, 6 * s, 2 * s, 2 * s);
  ctx.fillRect(19 * s, 6 * s, 2 * s, 2 * s);

  // Eyes (both visible, looking forward)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13 * s, 5 * s, 2 * s, 2 * s);
  ctx.fillRect(17 * s, 5 * s, 2 * s, 2 * s);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(13 * s, 6 * s, 1 * s, 1 * s);
  ctx.fillRect(18 * s, 6 * s, 1 * s, 1 * s);

  // Smile
  ctx.fillStyle = '#8b5a3c';
  ctx.fillRect(14 * s, 8 * s, 4 * s, 1 * s);
  ctx.fillRect(13 * s, 9 * s, 1 * s, 1 * s);
  ctx.fillRect(18 * s, 9 * s, 1 * s, 1 * s);

  // Neck
  ctx.fillStyle = '#f4d2a6';
  ctx.fillRect(14 * s, 10 * s, 4 * s, 2 * s);

  // Headlights (both visible from front)
  ctx.fillStyle = '#ffd86b';
  ctx.fillRect(9 * s, 20 * s, 3 * s, 2 * s);
  ctx.fillRect(20 * s, 20 * s, 3 * s, 2 * s);
  ctx.fillStyle = '#fff9e6';
  ctx.fillRect(10 * s, 20 * s, 1 * s, 1 * s);
  ctx.fillRect(21 * s, 20 * s, 1 * s, 1 * s);

  // Steering wheel (partial view)
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(14 * s, 12 * s, 4 * s, 1 * s);
}

function drawCarBackView(ctx, s, colorHex) {
  // Back wheels (both visible from back)
  ctx.fillStyle = '#1a1a1a';
  // Left wheel
  ctx.fillRect(7 * s, 19 * s, 4 * s, 4 * s);
  // Right wheel
  ctx.fillRect(21 * s, 19 * s, 4 * s, 4 * s);

  // Wheel highlights
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(8 * s, 20 * s, 2 * s, 2 * s);
  ctx.fillRect(22 * s, 20 * s, 2 * s, 2 * s);

  // Car body - rounded back
  ctx.fillStyle = colorHex;
  // Main body
  ctx.fillRect(7 * s, 12 * s, 18 * s, 10 * s);
  
  // Rounded top
  ctx.beginPath();
  ctx.arc(16 * s, 12 * s, 9 * s, Math.PI, Math.PI * 2);
  ctx.fill();

  // Darker shading on sides
  ctx.fillStyle = shade(colorHex, -25);
  ctx.fillRect(7 * s, 13 * s, 2 * s, 9 * s);
  ctx.fillRect(23 * s, 13 * s, 2 * s, 9 * s);

  // Back bumper rubber
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(8 * s, 21 * s, 16 * s, 1 * s);

  // Darker bottom (back view)
  ctx.fillStyle = shade(colorHex, -30);
  ctx.fillRect(9 * s, 19 * s, 14 * s, 3 * s);

  // Highlight on top
  ctx.fillStyle = shade(colorHex, 15);
  ctx.fillRect(10 * s, 8 * s, 12 * s, 2 * s);

  // Back of seat/headrest
  ctx.fillStyle = '#4a3428';
  ctx.fillRect(11 * s, 10 * s, 10 * s, 6 * s);
  ctx.fillStyle = '#5c4530';
  ctx.fillRect(12 * s, 11 * s, 8 * s, 2 * s);

  // Driver's head (back of head) - large and cartoonish
  ctx.fillStyle = '#f4d2a6'; // skin tone
  ctx.beginPath();
  ctx.arc(16 * s, 6 * s, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair (back of head)
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(12 * s, 2 * s, 8 * s, 3 * s);
  ctx.fillRect(12 * s, 4 * s, 8 * s, 3 * s);
  ctx.fillRect(11 * s, 4 * s, 10 * s, 4 * s);

  // Ears visible from back
  ctx.fillStyle = '#eac39b';
  ctx.fillRect(11 * s, 6 * s, 2 * s, 2 * s);
  ctx.fillRect(19 * s, 6 * s, 2 * s, 2 * s);

  // Neck from back
  ctx.fillStyle = '#f4d2a6';
  ctx.fillRect(14 * s, 9 * s, 4 * s, 3 * s);

  // Tail/brake lights (both visible from back)
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(9 * s, 20 * s, 3 * s, 2 * s);
  ctx.fillRect(20 * s, 20 * s, 3 * s, 2 * s);
  ctx.fillStyle = '#ff8888';
  ctx.fillRect(10 * s, 20 * s, 1 * s, 1 * s);
  ctx.fillRect(21 * s, 20 * s, 1 * s, 1 * s);
}

// === UTILITY FUNCTIONS ===

/**
 * Creates a shade or tint of a hex color
 * @param {string} hex - Hex color string (e.g., '#ff0000')
 * @param {number} percent - Positive for lighter, negative for darker
 * @returns {string} Modified hex color
 */
export function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Creates a canvas element with given dimensions
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement} Canvas element
 */
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// === TILE CREATION FUNCTIONS ===

/**
 * Creates a fence tile sprite
 * @returns {string} Base64 data URL of the fence tile
 */
export function createFenceTile() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = get2DContext(c);
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

/**
 * Creates a wood plank floor tile
 * @returns {string} Base64 data URL of the wood tile
 */
export function createWoodPlankTile32() {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = get2DContext(c);
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

/**
 * Creates a noise overlay texture for floor tiles
 * @param {number} alpha - Alpha value for noise pixels (0-1)
 * @returns {string} Base64 data URL of the noise overlay
 */
export function createNoiseOverlay32(alpha = FLOOR_NOISE_GENERATION_ALPHA) {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = get2DContext(c);
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

/**
 * Creates a bonus chest sprite
 * @returns {string} Base64 data URL of the chest sprite
 */
export function createBonusChest() {
  const c = document.createElement('canvas');
  const size = 32;
  c.width = size;
  c.height = size;
  const ctx = get2DContext(c);
  
  // Shadow
  ctx.fillStyle = '#2a1f1a';
  ctx.fillRect(6, 26, 20, 3);
  
  // Bottom half (chest base)
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(6, 16, 20, 10);
  
  // Top half (chest lid)
  ctx.fillStyle = '#b8941f';
  ctx.fillRect(6, 8, 20, 8);
  
  // Lid highlight
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(7, 8, 18, 2);
  
  // Lock/clasp
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(14, 14, 4, 6);
  
  // Lock highlight
  ctx.fillStyle = '#707070';
  ctx.fillRect(15, 15, 2, 2);
  
  // Metal bands
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(6, 12, 20, 1);
  ctx.fillRect(6, 20, 20, 1);
  ctx.fillRect(10, 8, 1, 18);
  ctx.fillRect(21, 8, 1, 18);
  
  // Sparkle effect
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(8, 10, 2, 2);
  ctx.fillRect(22, 18, 2, 2);
  
  return c.toDataURL('image/png');
}

// === MAIN ASSET GENERATION ===

/**
 * Generates all pixel art assets for the game
 * @returns {Object} Object containing all game assets as base64 data URLs
 */
export function generatePixelAssets() {
  const assets = {};

  // Player directional sprites
  ['up', 'down', 'left', 'right'].forEach((dir) => {
    assets[`player_${dir}`] = drawCarFacing(dir, PLAYER_COLOR, CAR_PIXEL_SIZE);
  });

  // AI car directional sprites
  AI_COLORS.forEach((color, idx) => {
    ['up', 'down', 'left', 'right'].forEach((dir) => {
      assets[`ai${idx}_${dir}`] = drawCarFacing(dir, color, CAR_PIXEL_SIZE);
    });
  });

  // Environment assets
  assets.fence_tile = createFenceTile();
  assets.floor_wood = createWoodPlankTile32();
  assets.floor_noise = createNoiseOverlay32();
  
  // Bonus chest
  assets.bonus_chest = createBonusChest();

  return assets;
}


