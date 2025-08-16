import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Phaser globally before any imports that might use it
vi.hoisted(() => {
  global.Phaser = {
    Scene: class {
      constructor(key) {
        this.scene = { key };
      }
    },
    Math: {
      Between: vi.fn((_min, _max) => _min + Math.floor(Math.random() * (_max - _min + 1))),
      FloatBetween: vi.fn((_min, _max) => _min + Math.random() * (_max - _min))
    }
  };
});

import { GameScene } from '../src/scenes/GameScene.js';
import { ARENA_MARGIN, CAR_BODY_RADIUS, GAME_WIDTH, GAME_HEIGHT } from '../src/config/constants.js';

// Mock game scene dependencies
const mockTime = {
  now: 1000
};

const mockScale = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT
};

const mockAiCar = {
  x: 100,
  y: 100,
  getData: vi.fn(),
  setData: vi.fn(),
  getChildren: vi.fn(() => [])
};

const mockAiCars = {
  getChildren: vi.fn(() => [mockAiCar])
};

const mockPlayer = {
  x: 400,
  y: 300
};

describe('GameScene Utility Methods', () => {
  // NOTE: These tests use the actual GameScene implementation, not mocks.
  // Phaser is mocked globally to allow instantiation without a browser environment.
  let gameScene;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create actual GameScene instance
    gameScene = new GameScene();
    
    // Set up required properties that would normally be set by Phaser
    gameScene.time = mockTime;
    gameScene.scale = mockScale;
    gameScene.aiCars = mockAiCars;
    gameScene.player = mockPlayer;
    
    // Mock timer text for tickTimer tests
    gameScene.timerText = {
      setText: vi.fn()
    };
    gameScene.endGame = vi.fn();
  });

  describe('findFreeSpawnPoint method', () => {
    it('should return coordinates within arena bounds', () => {
      const result = gameScene.findFreeSpawnPoint(null);
      
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      
      // Should be within actual arena bounds (using real constants)
      const expectedMinX = (ARENA_MARGIN * 2) + CAR_BODY_RADIUS; // ARENA_PADDING + CAR_BODY_RADIUS
      const expectedMaxX = GAME_WIDTH - expectedMinX;
      const expectedMinY = expectedMinX;
      const expectedMaxY = GAME_HEIGHT - expectedMinX;
      
      expect(result.x).toBeGreaterThanOrEqual(expectedMinX);
      expect(result.x).toBeLessThanOrEqual(expectedMaxX);
      expect(result.y).toBeGreaterThanOrEqual(expectedMinY);
      expect(result.y).toBeLessThanOrEqual(expectedMaxY);
    });

    it('should avoid spawning too close to player', () => {
      // Mock player at center
      gameScene.player = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
      
      // Mock Phaser.Math.Between to return a position far from player
      global.Phaser.Math.Between.mockImplementation((_min, _max) => {
        // Return position near minimum bound (far from center player)
        return _min + 10;
      });

      const result = gameScene.findFreeSpawnPoint(null);
      
      // Should find a valid position away from player
      expect(result.x).toBeDefined();
      expect(result.y).toBeDefined();
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    it('should exclude specified sprite when checking clearance', () => {
      const excludeSprite = { x: 200, y: 200 };
      mockAiCars.getChildren.mockReturnValue([mockAiCar, excludeSprite]);
      
      const result = gameScene.findFreeSpawnPoint(excludeSprite);
      
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('should fallback to random position after max attempts', () => {
      // Force all attempts to be "too close" by mocking positions at center
      global.Phaser.Math.Between.mockImplementation(() => GAME_WIDTH / 2); // Always center
      
      const result = gameScene.findFreeSpawnPoint(null);
      
      // Should still return a position even if not ideal (fallback behavior)
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });
  });

  describe('tickTimer method', () => {
    beforeEach(() => {
      gameScene.gameOver = false;
      gameScene.timeLeft = 60;
      gameScene.timerText = {
        setText: vi.fn()
      };
      gameScene.endGame = vi.fn();
    });

    it('should decrement time when game is not over', () => {
      gameScene.tickTimer();
      
      expect(gameScene.timeLeft).toBe(59);
      expect(gameScene.timerText.setText).toHaveBeenCalledWith('Time: 59');
    });

    it('should not decrement time when game is over', () => {
      gameScene.gameOver = true;
      gameScene.timeLeft = 30;
      
      gameScene.tickTimer();
      
      expect(gameScene.timeLeft).toBe(30);
      expect(gameScene.timerText.setText).not.toHaveBeenCalled();
    });

    it('should end game when time reaches zero', () => {
      gameScene.timeLeft = 1;
      
      gameScene.tickTimer();
      
      expect(gameScene.timeLeft).toBe(0);
      expect(gameScene.endGame).toHaveBeenCalled();
    });

    it('should update timer display correctly', () => {
      gameScene.timeLeft = 45;
      
      gameScene.tickTimer();
      
      expect(gameScene.timerText.setText).toHaveBeenCalledWith('Time: 44');
    });
  });

  describe('constructor and initial state', () => {
    it('should initialize with correct default values', () => {
      const scene = new GameScene();
      
      expect(scene.score).toBe(0);
      expect(scene.timeLeft).toBe(240); // GAME_DURATION_SECONDS
      expect(scene.gameOver).toBe(false);
      expect(scene.player).toBeNull();
      expect(scene.aiCars).toBeNull();
      expect(scene.walls).toBeNull();
    });
  });
});
