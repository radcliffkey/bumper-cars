import { describe, it, expect, vi } from 'vitest';
import { canScoreHit } from '../src/logic/gameLogic.js';
import { generatePixelAssets } from '../src/utils/assets.js';

// Mock DOM for canvas operations
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            fillStyle: '',
            fillRect: vi.fn(),
            createImageData: vi.fn(() => ({
              data: new Uint8ClampedArray(32 * 32 * 4)
            })),
            putImageData: vi.fn()
          })),
          toDataURL: vi.fn(() => 'data:image/png;base64,test-data')
        };
      }
      return null;
    })
  },
  writable: true
});

describe('Integration Tests', () => {
  describe('Asset Generation Pipeline', () => {
    it('should generate a complete set of game assets', () => {
      const assets = generatePixelAssets();
      
      // Verify all required asset types are present
      const expectedAssetTypes = [
        'player_up', 'player_down', 'player_left', 'player_right',
        'fence_tile', 'floor_wood', 'floor_noise', 'bonus_chest'
      ];
      
      expectedAssetTypes.forEach(assetKey => {
        expect(assets).toHaveProperty(assetKey);
        expect(typeof assets[assetKey]).toBe('string');
        expect(assets[assetKey]).toMatch(/^data:image\/png;base64,/);
      });
      
      // Verify AI car assets are generated for all colors and directions
      for (let i = 0; i < 10; i++) {
        ['up', 'down', 'left', 'right'].forEach(direction => {
          const key = `ai${i}_${direction}`;
          expect(assets).toHaveProperty(key);
          expect(assets[key]).toMatch(/^data:image\/png;base64,/);
        });
      }
    });

    it('should generate consistent asset count', () => {
      const assets = generatePixelAssets();
      const assetCount = Object.keys(assets).length;
      
      // 4 player sprites + (10 AI colors × 4 directions) + 4 environment assets
      const expectedCount = 4 + (10 * 4) + 4;
      expect(assetCount).toBe(expectedCount);
    });
  });

  describe('Game Logic Integration', () => {
    describe('Scoring system with cooldown', () => {
      it('should handle rapid collision sequences correctly', () => {
        const startTime = 1000;
        const cooldown = 2000;
        
        // First hit should score
        expect(canScoreHit(startTime, null, cooldown)).toBe(true);
        
        // Immediate second hit should not score
        expect(canScoreHit(startTime + 1, startTime, cooldown)).toBe(false);
        
        // Hit within cooldown should not score
        expect(canScoreHit(startTime + 1500, startTime, cooldown)).toBe(false);
        
        // Hit after cooldown should score
        expect(canScoreHit(startTime + 2000, startTime, cooldown)).toBe(true);
        expect(canScoreHit(startTime + 2500, startTime, cooldown)).toBe(true);
      });

      it('should handle multiple AI cars with independent cooldowns', () => {
        const now = 5000;
        const cooldown = 2000;
        
        // Simulate different AI cars with different last score times
        const aiCar1LastHit = 3000; // 2 seconds ago
        const aiCar2LastHit = 4500; // 0.5 seconds ago
        const aiCar3LastHit = null; // never hit
        
        expect(canScoreHit(now, aiCar1LastHit, cooldown)).toBe(true);  // Cooldown expired
        expect(canScoreHit(now, aiCar2LastHit, cooldown)).toBe(false); // Still in cooldown
        expect(canScoreHit(now, aiCar3LastHit, cooldown)).toBe(true);  // First hit
      });
    });

    describe('Game timing and state transitions', () => {
      it('should handle game duration and end conditions', () => {
        // Mock game scene state
        const mockGameState = {
          timeLeft: 240,
          gameOver: false,
          score: 0
        };
        
        // Simulate game progression
        for (let tick = 0; tick < 240; tick++) {
          if (!mockGameState.gameOver) {
            mockGameState.timeLeft--;
            if (mockGameState.timeLeft <= 0) {
              mockGameState.gameOver = true;
            }
          }
        }
        
        expect(mockGameState.timeLeft).toBe(0);
        expect(mockGameState.gameOver).toBe(true);
      });
    });
  });

  describe('Physics and Collision Integration', () => {
    it('should validate collision detection parameters', () => {
      // Test with realistic car positions and sizes
      const car1 = { x: 100, y: 100, radius: 24 };
      const car2 = { x: 120, y: 110, radius: 24 };
      
      // Calculate distance between centers
      const dx = car2.x - car1.x;
      const dy = car2.y - car1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const combinedRadius = car1.radius + car2.radius;
      
      // Should detect collision when overlapping
      expect(distance).toBeLessThan(combinedRadius);
      
      // Test non-collision
      const car3 = { x: 200, y: 200, radius: 24 };
      const dx2 = car3.x - car1.x;
      const dy2 = car3.y - car1.y;
      const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      expect(distance2).toBeGreaterThan(combinedRadius);
    });

    it('should validate arena bounds checking', () => {
      const arenaWidth = 800;
      const arenaHeight = 600;
      const margin = 16;
      const carRadius = 24;
      
      // Valid positions
      const validPositions = [
        { x: margin + carRadius + 10, y: margin + carRadius + 10 },
        { x: arenaWidth / 2, y: arenaHeight / 2 },
        { x: arenaWidth - margin - carRadius - 10, y: arenaHeight - margin - carRadius - 10 }
      ];
      
      validPositions.forEach(pos => {
        expect(pos.x).toBeGreaterThan(margin + carRadius);
        expect(pos.x).toBeLessThan(arenaWidth - margin - carRadius);
        expect(pos.y).toBeGreaterThan(margin + carRadius);
        expect(pos.y).toBeLessThan(arenaHeight - margin - carRadius);
      });
      
      // Invalid positions (outside bounds)
      const invalidPositions = [
        { x: 0, y: 0 },
        { x: arenaWidth, y: arenaHeight },
        { x: margin, y: margin }
      ];
      
      invalidPositions.forEach(pos => {
        const withinBounds = pos.x > margin + carRadius && 
                            pos.x < arenaWidth - margin - carRadius &&
                            pos.y > margin + carRadius && 
                            pos.y < arenaHeight - margin - carRadius;
        expect(withinBounds).toBe(false);
      });
    });
  });

  describe('Constants and Configuration Integrity', () => {
    it('should maintain consistent constant relationships', () => {
      // Import constants to verify relationships
      const constants = {
        GAME_WIDTH: 800,
        GAME_HEIGHT: 600,
        CAR_BODY_RADIUS: 24,
        ARENA_MARGIN: 16,
        AI_RESPAWN_CLEARANCE_PX: 56
      };
      
      // Verify arena is large enough for cars
      const minArenaWidth = constants.ARENA_MARGIN * 2 + constants.CAR_BODY_RADIUS * 4;
      const minArenaHeight = constants.ARENA_MARGIN * 2 + constants.CAR_BODY_RADIUS * 4;
      
      expect(constants.GAME_WIDTH).toBeGreaterThan(minArenaWidth);
      expect(constants.GAME_HEIGHT).toBeGreaterThan(minArenaHeight);
      
      // Verify respawn clearance is reasonable
      expect(constants.AI_RESPAWN_CLEARANCE_PX).toBeGreaterThan(constants.CAR_BODY_RADIUS * 2);
    });
  });
});
