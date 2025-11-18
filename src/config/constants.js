// === GAME CONFIGURATION ===

// Core game settings
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const GAME_DURATION_SECONDS = 240;

// === ARENA LAYOUT ===
export const ARENA_MARGIN = 16; // visual fence inset
export const FENCE_THICKNESS = 16; // fence sprite thickness
export const WALL_THICKNESS = 12; // invisible physics wall thickness

// === MOVEMENT & PHYSICS ===
export const PLAYER_MAX_SPEED = 200;
export const AI_BASE_SPEED = 120;
export const RECOIL_FORCE = 180;

// === CAR CONFIGURATION ===
export const CAR_PIXEL_SIZE = 64; // generated sprite size per side
export const CAR_BODY_RADIUS = 24; // physics circle radius
export const CAR_BODY_OFFSET_X = 8; // physics body offset
export const CAR_BODY_OFFSET_Y = 8;
export const CAR_LINEAR_DRAG = 0.9;
export const CAR_BOUNCE = 0.6;

// === AI BEHAVIOR ===
export const AI_DIRECTION_INTERVAL_MS_BASE = 1200;
export const AI_DIRECTION_INTERVAL_MS_JITTER = 1000;
export const AI_STUCK_POSITION_TOLERANCE_PX = 8; // max drift to still count as "stuck"
export const AI_STUCK_TIME_MS = 1000; // time staying within tolerance before respawn
export const AI_RESPAWN_CLEARANCE_PX = 56; // min distance from other cars when respawning
export const AI_COUNT = 10; // number of AI cars in the arena

// === SCORING & FEEDBACK ===
export const SCORING_COOLDOWN_MS = 2000; // min delay between scoring on the same AI car
export const SHAKE_COOLDOWN_MS = 500; // min delay between screen shakes to avoid jitter


// === BONUS CHESTS ===
export const CHEST_SPAWN_INTERVAL_MS = 10000; // spawn a chest every 10 seconds
export const CHEST_BODY_RADIUS = 16; // collision radius for chest
export const POWERUP_DURATION_MS = 5000; // how long powerup effects last
export const POWERUP_SPEED_MULTIPLIER = 1.5; // speed boost multiplier
export const POWERUP_RECOIL_MULTIPLIER = 1.8; // stronger bumping multiplier

// === VISUAL ASSETS ===
export const TILE_SIZE = 32; // wood/noise tile size
export const FLOOR_NOISE_GENERATION_ALPHA = 0.2; // per-pixel alpha when generating noise texture
export const FLOOR_NOISE_OVERLAY_ALPHA = 0.35; // alpha applied when layering noise sprite

// === UI STYLING ===
export const UI_FONT_FAMILY = '"Press Start 2P", monospace';

// === COLORS ===
export const AI_COLORS = [
  '#4b79d6', // royal blue
  '#22cc44', // bright green
  '#ffdd33', // bright yellow
  '#9933ff', // deep purple
  '#ff3399', // hot pink
  '#00dddd', // cyan
  '#ff8833', // bright orange
  '#2244aa', // navy blue
  '#88ff44', // lime green
  '#8b5a3c', // brown
];

export const PLAYER_COLOR = '#ff2222'; // bright red

