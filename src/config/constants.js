import { colorInt } from '../utils/color.js';

// === GAME ===
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const ROUND_DURATION_MS = 90_000;
export const URGENT_TIME_MS = 10_000; // timer turns red and ticks below this
export const MAX_FRAME_DT_MS = 50; // clamp long frames (tab switch, hitch) so physics stays sane

// === ARENA ===
export const ARENA_MARGIN = 16; // fence thickness; the drivable area starts inside it
export const SPAWN_PADDING = ARENA_MARGIN * 2; // extra inset when placing cars and chests

// === PLAYER DRIVING ===
export const PLAYER_ACCEL = 900; // px/s² while a direction key is held
export const PLAYER_MAX_SPEED = 220; // px/s reachable by driving (knock-back can exceed it)
export const PLAYER_DRAG = 2.0; // exponential velocity decay per second
export const PLAYER_WALL_BOUNCE = 0.5;

// === CAR BODY ===
// Art is drawn in art pixels and shown at PIXEL_SCALE world pixels each.
export const PIXEL_SCALE = 2;
export const CAR_PIXEL_SIZE = 32; // car texture size, in art pixels
export const CAR_BODY_RADIUS = 24; // physics circle radius, in world pixels
// Arcade's setCircle takes texture pixels; this centres the circle in the car texture.
export const CAR_BODY_OFFSET = (CAR_PIXEL_SIZE - (CAR_BODY_RADIUS * 2) / PIXEL_SCALE) / 2;
// Shadows sit just below the art's bottom edge: the car bumper and the chest base.
export const CAR_SHADOW_OFFSET_Y = 10 * PIXEL_SCALE;
export const CHEST_SHADOW_OFFSET_Y = 7 * PIXEL_SCALE;

// === BUMPS ===
export const RECOIL_FORCE = 180; // minimum speed an AI car is flung at by the player
export const RECOIL_SPEED_FACTOR = 1.1; // faster player → harder fling
export const PLAYER_KNOCKBACK_RATIO = 0.6; // player bounces back with this share of the fling
export const AI_MIN_BUMP_SPEED = 90; // AI cars never stall after bumping each other
export const AI_MIN_WALL_SPEED = 140; // AI cars always leave a wall at least this fast
export const SHAKE_COOLDOWN_MS = 500;
export const SLAM_FLASH_COOLDOWN_MS = 300;
export const DUST_MIN_SPEED = 180; // the player kicks up dust above this speed
export const DUST_INTERVAL_MS = 60;
export const SOUND_COOLDOWN_MS = 200;

// === AI ===
export const AI_COUNT = 10;
export const AI_BASE_SPEED = 120;
export const AI_DRAG = 0.6; // AI cars glide further than the player after a bump
export const AI_DIRECTION_INTERVAL_MS_BASE = 1200;
export const AI_DIRECTION_INTERVAL_MS_JITTER = 1000;
export const AI_BUMP_STEER_DELAY_MS = 700; // a flung AI car keeps its trajectory this long
export const AI_STUCK_POSITION_TOLERANCE_PX = 8; // max drift to still count as "stuck"
export const AI_STUCK_TIME_MS = 1000; // time staying within tolerance before respawn
export const AI_RESPAWN_CLEARANCE_PX = 56; // min distance from other cars when respawning

// === SCORING ===
export const SCORING_COOLDOWN_MS = 2000; // per AI car; cars on cooldown are drawn faded
export const COMBO_WINDOW_MS = 2500; // score again within this to grow the combo
export const COMBO_MAX = 5;
export const SCORE_MIN_CLOSING_SPEED = 60; // the player must actually drive into a car to score
export const SLAM_WINDOW_MS = 900; // a flung car hitting the fence within this earns a slam
export const SLAM_BONUS = 2;
export const HIGH_SCORE_STORAGE_KEY = 'bumper-cars.best';

// === BONUS CHEST ===
export const CHEST_SPAWN_INTERVAL_MS = 8000;
export const CHEST_LIFETIME_MS = 6000; // uncollected chests vanish after this
export const CHEST_BLINK_MS = 1500; // chest blinks during the end of its lifetime
export const CHEST_BODY_RADIUS = 16;
export const CHEST_SPAWN_INSET = 32; // keeps chests clear of the fence
export const POWERUP_DURATION_MS = 5000;
export const POWERUP_SPEED_MULTIPLIER = 1.5;
export const POWERUP_RECOIL_MULTIPLIER = 1.8;

// === VISUAL ASSETS ===
// Arena textures are in art pixels and shown at PIXEL_SCALE.
export const TILE_SIZE = 32; // floor tile height
export const FLOOR_TILE_WIDTH = 64; // wider than tall so plank joints can stagger
export const NOISE_TILE_SIZE = 24; // doesn't divide the floor tile, so the repeats don't line up
export const FLOOR_NOISE_GENERATION_ALPHA = 0.2; // per-pixel alpha when generating noise texture
export const FLOOR_NOISE_OVERLAY_ALPHA = 0.35; // alpha applied when layering noise sprite

// === RENDER DEPTHS ===
// Cars get CARS + y / height so lower cars draw in front.
export const DEPTH = Object.freeze({
  SHADOW: 0.5,
  DUST: 0.6,
  FENCE: 1,
  CHEST: 1.5,
  CARS: 2,
  EFFECTS: 50,
  HUD: 100,
  BANNER: 250,
  OVERLAY: 300,
});

// === PALETTE ===
// Shared by the arena art, the UI and the cars, so the browns stay one family.
export const WOOD_OUTLINE = '#5a3e2b'; // plank seams, fence and UI outlines, text stroke, lights off
export const WOOD_LIGHT = '#c89b67'; // fence posts and panel borders
export const FLOOR_PLANK = '#7e5a3f';
export const FLOOR_SHADE = '#6f4f3b'; // cars that can't score fade toward this

// === UI ===
export const UI_FONT_FAMILY = '"Press Start 2P", monospace';
export const UI_TEXT_COLOR = '#ffe6a7';
export const UI_BRIGHT_TEXT = '#fff5d6';
export const UI_TEXT_STROKE = WOOD_OUTLINE;
export const UI_URGENT_COLOR = '#ff6b5a';
export const UI_TITLE_COLOR = '#ffd34d';
export const UI_OUTLINE = colorInt(WOOD_OUTLINE);
export const UI_PANEL_BORDER = colorInt(WOOD_LIGHT);
export const UI_PANEL_FILL = 0x3b2a20;

// === COLORS ===
// Toned-down hues that sit with the wooden arena; the player is the only saturated red.
// No orange or brown: they sink into the floor.
export const AI_COLORS = [
  '#5a7fc0', // slate
  '#86c0d4', // sky
  '#3f9c90', // teal
  '#86a84e', // moss
  '#4c8058', // pine
  '#8f5fa8', // plum
  '#aa98dc', // lavender
  '#d9809f', // rose
  '#c9a23c', // mustard
  '#d6ccb6', // bone
];

export const PLAYER_COLOR = '#e5443b';
export const POWERUP_COLOR = 0xffdd44; // turbo bar and label
export const TURBO_COLOR = '#ffcf3f'; // player car body while turbo is on
export const TURBO_OUTLINE = '#ff7b29'; // a hot glow; anything pale merges with the driver's helmet

// Particle colours for impact bursts, baked into textures (Canvas can't tint particles).
export const BURST_COLORS = Object.freeze({
  spark: '#fff1a8',
  slam: '#ff9a4d',
  gold: '#ffd700',
  white: '#ffffff',
});
export const SLAM_COLOR = BURST_COLORS.slam; // the slam label matches its particles
export const DUST_COLOR = '#a27a53';

