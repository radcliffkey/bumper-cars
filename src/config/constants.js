// Gameplay timing
export const GAME_DURATION_SECONDS = 240;
export const AI_DIRECTION_INTERVAL_MS_BASE = 1200;
export const AI_DIRECTION_INTERVAL_MS_JITTER = 1000;
export const SCORING_COOLDOWN_MS = 2000; // min delay between scoring on the same AI car

// Arena layout
export const ARENA_MARGIN = 16; // visual fence inset
export const FENCE_THICKNESS = 16; // fence sprite thickness
export const WALL_THICKNESS = 12; // invisible physics wall thickness

// Movement
export const PLAYER_MAX_SPEED = 200;
export const AI_BASE_SPEED = 120;
export const RECOIL_FORCE = 180;

// Car visuals/physics
export const CAR_PIXEL_SIZE = 64; // generated sprite size per side
export const CAR_BODY_RADIUS = 24; // physics circle radius
export const CAR_BODY_OFFSET_X = 8; // physics body offset
export const CAR_BODY_OFFSET_Y = 8;
export const CAR_LINEAR_DRAG = 0.9;
export const CAR_BOUNCE = 0.6;

// Tiles
export const TILE_SIZE = 32; // wood/noise tile size
export const FLOOR_NOISE_GENERATION_ALPHA = 0.2; // per-pixel alpha when generating noise texture
export const FLOOR_NOISE_OVERLAY_ALPHA = 0.35; // alpha applied when layering noise sprite

// UI
export const UI_FONT_FAMILY = '"Press Start 2P", monospace';

