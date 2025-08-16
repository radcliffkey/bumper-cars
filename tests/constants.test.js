import { describe, it, expect } from 'vitest';
import * as constants from '../src/config/constants.js';

describe('Constants Configuration', () => {
  describe('Game dimensions', () => {
    it('should have valid game dimensions', () => {
      expect(constants.GAME_WIDTH).toBeGreaterThan(0);
      expect(constants.GAME_HEIGHT).toBeGreaterThan(0);
      expect(typeof constants.GAME_WIDTH).toBe('number');
      expect(typeof constants.GAME_HEIGHT).toBe('number');
    });

    it('should have reasonable aspect ratio', () => {
      const aspectRatio = constants.GAME_WIDTH / constants.GAME_HEIGHT;
      expect(aspectRatio).toBeGreaterThan(1); // Landscape orientation
      expect(aspectRatio).toBeLessThan(3); // Not too wide
    });
  });

  describe('Arena layout constants', () => {
    it('should have valid arena margins and walls', () => {
      expect(constants.ARENA_MARGIN).toBeGreaterThan(0);
      expect(constants.WALL_THICKNESS).toBeGreaterThan(0);
      expect(constants.FENCE_THICKNESS).toBeGreaterThan(0);
      
      // Arena margin should be large enough to contain fence
      expect(constants.ARENA_MARGIN).toBeGreaterThanOrEqual(constants.FENCE_THICKNESS);
    });

    it('should leave enough playable area', () => {
      const playableWidth = constants.GAME_WIDTH - (constants.ARENA_MARGIN * 2);
      const playableHeight = constants.GAME_HEIGHT - (constants.ARENA_MARGIN * 2);
      
      expect(playableWidth).toBeGreaterThan(200); // Minimum reasonable play area
      expect(playableHeight).toBeGreaterThan(200);
    });
  });

  describe('Car configuration', () => {
    it('should have valid car physics properties', () => {
      expect(constants.CAR_BODY_RADIUS).toBeGreaterThan(0);
      expect(constants.CAR_BODY_OFFSET_X).toBeGreaterThanOrEqual(0);
      expect(constants.CAR_BODY_OFFSET_Y).toBeGreaterThanOrEqual(0);
      expect(constants.CAR_LINEAR_DRAG).toBeGreaterThan(0);
      expect(constants.CAR_LINEAR_DRAG).toBeLessThanOrEqual(1);
      expect(constants.CAR_BOUNCE).toBeGreaterThanOrEqual(0);
      expect(constants.CAR_BOUNCE).toBeLessThanOrEqual(1);
    });

    it('should have car size fit within arena', () => {
      const carDiameter = constants.CAR_BODY_RADIUS * 2;
      const playableWidth = constants.GAME_WIDTH - (constants.ARENA_MARGIN * 2);
      const playableHeight = constants.GAME_HEIGHT - (constants.ARENA_MARGIN * 2);
      
      expect(carDiameter).toBeLessThan(playableWidth / 4); // Allow multiple cars width-wise
      expect(carDiameter).toBeLessThan(playableHeight / 4); // Allow multiple cars height-wise
    });
  });

  describe('Movement and physics', () => {
    it('should have reasonable speed values', () => {
      expect(constants.PLAYER_MAX_SPEED).toBeGreaterThan(0);
      expect(constants.AI_BASE_SPEED).toBeGreaterThan(0);
      expect(constants.RECOIL_FORCE).toBeGreaterThan(0);
      
      // Player should be faster than AI for gameplay balance
      expect(constants.PLAYER_MAX_SPEED).toBeGreaterThan(constants.AI_BASE_SPEED);
    });

    it('should have AI behavior timing that makes sense', () => {
      expect(constants.AI_DIRECTION_INTERVAL_MS_BASE).toBeGreaterThan(500); // Not too twitchy
      expect(constants.AI_DIRECTION_INTERVAL_MS_BASE).toBeLessThan(5000); // Not too slow
      expect(constants.AI_DIRECTION_INTERVAL_MS_JITTER).toBeGreaterThanOrEqual(0);
      
      // Jitter should not exceed base interval for consistency
      expect(constants.AI_DIRECTION_INTERVAL_MS_JITTER).toBeLessThanOrEqual(constants.AI_DIRECTION_INTERVAL_MS_BASE);
    });
  });

  describe('Game timing', () => {
    it('should have reasonable game duration', () => {
      expect(constants.GAME_DURATION_SECONDS).toBeGreaterThan(30); // Not too short
      expect(constants.GAME_DURATION_SECONDS).toBeLessThan(1800); // Not too long (30 min)
    });

    it('should have reasonable scoring cooldown', () => {
      expect(constants.SCORING_COOLDOWN_MS).toBeGreaterThan(500); // Prevent spam scoring
      expect(constants.SCORING_COOLDOWN_MS).toBeLessThan(10000); // Not too punishing
    });
  });

  describe('AI behavior constants', () => {
    it('should have sensible stuck detection values', () => {
      expect(constants.AI_STUCK_POSITION_TOLERANCE_PX).toBeGreaterThan(0);
      expect(constants.AI_STUCK_TIME_MS).toBeGreaterThan(500); // Give time to move
      expect(constants.AI_STUCK_TIME_MS).toBeLessThan(5000); // Don't wait too long
      
      // Respawn clearance should be larger than car radius
      expect(constants.AI_RESPAWN_CLEARANCE_PX).toBeGreaterThan(constants.CAR_BODY_RADIUS);
    });
  });

  describe('Visual asset constants', () => {
    it('should have valid tile and sprite dimensions', () => {
      expect(constants.TILE_SIZE).toBeGreaterThan(0);
      expect(constants.CAR_PIXEL_SIZE).toBeGreaterThan(0);
      
      // Should be power of 2 or common sizes for pixel art
      const commonSizes = [16, 32, 64, 128];
      expect(commonSizes).toContain(constants.TILE_SIZE);
      expect(commonSizes).toContain(constants.CAR_PIXEL_SIZE);
    });

    it('should have valid alpha values for floor noise', () => {
      expect(constants.FLOOR_NOISE_GENERATION_ALPHA).toBeGreaterThanOrEqual(0);
      expect(constants.FLOOR_NOISE_GENERATION_ALPHA).toBeLessThanOrEqual(1);
      expect(constants.FLOOR_NOISE_OVERLAY_ALPHA).toBeGreaterThanOrEqual(0);
      expect(constants.FLOOR_NOISE_OVERLAY_ALPHA).toBeLessThanOrEqual(1);
    });
  });

  describe('Color configuration', () => {
    it('should have valid color arrays', () => {
      expect(Array.isArray(constants.AI_COLORS)).toBe(true);
      expect(constants.AI_COLORS.length).toBeGreaterThan(0);
      expect(typeof constants.PLAYER_COLOR).toBe('string');
      
      // All colors should be valid hex strings
      constants.AI_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
      expect(constants.PLAYER_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have unique AI colors', () => {
      const uniqueColors = new Set(constants.AI_COLORS);
      expect(uniqueColors.size).toBe(constants.AI_COLORS.length);
    });

    it('should have enough AI colors for game', () => {
      // Should have at least 4 colors for variety
      expect(constants.AI_COLORS.length).toBeGreaterThanOrEqual(4);
      
      // Should not have too many (diminishing returns)
      expect(constants.AI_COLORS.length).toBeLessThanOrEqual(20);
    });
  });

  describe('UI constants', () => {
    it('should have valid font family', () => {
      expect(typeof constants.UI_FONT_FAMILY).toBe('string');
      expect(constants.UI_FONT_FAMILY.length).toBeGreaterThan(0);
    });
  });

  describe('Constant relationships and dependencies', () => {
    it('should maintain logical relationships between related constants', () => {
      // Car should fit within its pixel sprite
      expect(constants.CAR_BODY_RADIUS * 2).toBeLessThanOrEqual(constants.CAR_PIXEL_SIZE);
      
      // Physics body offsets should be reasonable
      expect(constants.CAR_BODY_OFFSET_X + constants.CAR_BODY_RADIUS).toBeLessThanOrEqual(constants.CAR_PIXEL_SIZE);
      expect(constants.CAR_BODY_OFFSET_Y + constants.CAR_BODY_RADIUS).toBeLessThanOrEqual(constants.CAR_PIXEL_SIZE);
      
      // Arena should be large enough for multiple cars with clearance
      const minPlayArea = constants.AI_RESPAWN_CLEARANCE_PX * 4;
      const actualPlayWidth = constants.GAME_WIDTH - (constants.ARENA_MARGIN * 2);
      const actualPlayHeight = constants.GAME_HEIGHT - (constants.ARENA_MARGIN * 2);
      
      expect(actualPlayWidth).toBeGreaterThan(minPlayArea);
      expect(actualPlayHeight).toBeGreaterThan(minPlayArea);
    });
  });
});
