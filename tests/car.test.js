import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCarSprite } from '../src/sprites/Car.js';

// Mock Phaser scene with physics system
const mockPhysicsBody = {
  setDamping: vi.fn(),
  setDrag: vi.fn(),
  setCircle: vi.fn(),
  setBounce: vi.fn(),
  reset: vi.fn()
};

const mockSprite = {
  setDamping: vi.fn(() => mockSprite),
  setDrag: vi.fn(() => mockSprite),
  setCircle: vi.fn(() => mockSprite),
  setBounce: vi.fn(() => mockSprite),
  body: mockPhysicsBody
};

const mockPhysics = {
  add: {
    sprite: vi.fn(() => mockSprite)
  }
};

const mockScene = {
  physics: mockPhysics
};

describe('Car Sprite Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCarSprite function', () => {
    it('should create a sprite with correct position and texture', () => {
      const x = 100;
      const y = 200;
      const key = 'player_up';
      
      const sprite = createCarSprite(mockScene, x, y, key);
      
      expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(x, y, key);
      expect(sprite).toBe(mockSprite);
    });

    it('should configure physics properties correctly', () => {
      const sprite = createCarSprite(mockScene, 0, 0, 'test');
      
      expect(sprite.setDamping).toHaveBeenCalledWith(true);
      expect(sprite.setDrag).toHaveBeenCalledWith(0.9); // CAR_LINEAR_DRAG
      expect(sprite.setCircle).toHaveBeenCalledWith(24, 8, 8); // CAR_BODY_RADIUS, offsets
      expect(sprite.setBounce).toHaveBeenCalledWith(0.6); // CAR_BOUNCE
    });

    it('should return the configured sprite', () => {
      const sprite = createCarSprite(mockScene, 50, 75, 'ai0_down');
      expect(sprite).toBe(mockSprite);
    });

    it('should handle different sprite keys', () => {
      const spriteKeys = ['player_up', 'player_down', 'ai0_left', 'ai5_right'];
      
      spriteKeys.forEach(key => {
        createCarSprite(mockScene, 0, 0, key);
        expect(mockScene.physics.add.sprite).toHaveBeenCalledWith(0, 0, key);
      });
    });

    it('should maintain method chaining for sprite configuration', () => {
      // Each method should return the sprite to allow chaining
      const sprite = createCarSprite(mockScene, 0, 0, 'test');
      
      // Verify that all the configuration methods were called
      expect(sprite.setDamping).toHaveBeenCalled();
      expect(sprite.setDrag).toHaveBeenCalled();
      expect(sprite.setCircle).toHaveBeenCalled();
      expect(sprite.setBounce).toHaveBeenCalled();
    });
  });
});
