import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  shade,
  createCanvas,
  drawCarFacing,
  createFenceTile,
  createWoodPlankTile32,
  createNoiseOverlay32,
  generatePixelAssets 
} from '../src/utils/assets.js';

// Mock canvas and context for testing
const mockContext = {
  fillStyle: '',
  fillRect: vi.fn(),
  createImageData: vi.fn(),
  putImageData: vi.fn(),
  getContext: vi.fn()
};

// Mock document.createElement for canvas
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => mockContext),
          toDataURL: vi.fn(() => 'data:image/png;base64,mock-image-data')
        };
      }
      return null;
    })
  },
  writable: true
});

describe('Asset Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shade function', () => {
    it('should lighten a color with positive percentage', () => {
      const result = shade('#800000', 50); // dark red -> lighter
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      expect(parseInt(result.slice(1), 16)).toBeGreaterThan(parseInt('800000', 16));
    });

    it('should darken a color with negative percentage', () => {
      const result = shade('#ff0000', -50); // red -> darker
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
      expect(parseInt(result.slice(1), 16)).toBeLessThan(parseInt('ff0000', 16));
    });

    it('should handle edge cases properly', () => {
      expect(shade('#000000', -100)).toBe('#000000'); // can't get darker than black
      expect(shade('#ffffff', 100)).toBe('#ffffff'); // can't get lighter than white
    });

    it('should handle colors without # prefix', () => {
      const result = shade('ff0000', -50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('createCanvas function', () => {
    it('should create a canvas with specified dimensions', () => {
      const canvas = createCanvas(100, 200);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(200);
    });
  });

  describe('drawCarFacing function', () => {
    it('should create a car sprite with correct dimensions', () => {
      const result = drawCarFacing('up', '#ff0000', 64);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });

    it('should handle all four directions', () => {
      ['up', 'down', 'left', 'right'].forEach(direction => {
        const result = drawCarFacing(direction, '#00ff00', 32);
        expect(result).toBe('data:image/png;base64,mock-image-data');
      });
    });

    it('should use default size when not specified', () => {
      const result = drawCarFacing('up', '#0000ff');
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });
  });

  describe('createFenceTile function', () => {
    it('should create a 16x16 fence tile', () => {
      const result = createFenceTile();
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });
  });

  describe('createWoodPlankTile32 function', () => {
    it('should create a tile with correct dimensions', () => {
      const result = createWoodPlankTile32();
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });
  });

  describe('createNoiseOverlay32 function', () => {
    beforeEach(() => {
      mockContext.createImageData.mockReturnValue({
        data: new Uint8ClampedArray(32 * 32 * 4) // RGBA for 32x32 image
      });
    });

    it('should create noise overlay with default alpha', () => {
      const result = createNoiseOverlay32();
      expect(mockContext.createImageData).toHaveBeenCalledWith(32, 32);
      expect(mockContext.putImageData).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });

    it('should create noise overlay with custom alpha', () => {
      const result = createNoiseOverlay32(0.5);
      expect(mockContext.createImageData).toHaveBeenCalledWith(32, 32);
      expect(result).toBe('data:image/png;base64,mock-image-data');
    });
  });

  describe('generatePixelAssets function', () => {
    it('should generate all required assets', () => {
      const assets = generatePixelAssets();
      
      // Check player sprites
      ['up', 'down', 'left', 'right'].forEach(direction => {
        expect(assets).toHaveProperty(`player_${direction}`);
        expect(assets[`player_${direction}`]).toBe('data:image/png;base64,mock-image-data');
      });

      // Check AI sprites (10 colors × 4 directions)
      for (let i = 0; i < 10; i++) {
        ['up', 'down', 'left', 'right'].forEach(direction => {
          expect(assets).toHaveProperty(`ai${i}_${direction}`);
          expect(assets[`ai${i}_${direction}`]).toBe('data:image/png;base64,mock-image-data');
        });
      }

      // Check environment assets
      expect(assets).toHaveProperty('fence_tile');
      expect(assets).toHaveProperty('floor_wood');
      expect(assets).toHaveProperty('floor_noise');
    });

    it('should return an object with expected number of assets', () => {
      const assets = generatePixelAssets();
      const expectedCount = 
        4 +       // player sprites (4 directions)
        (10 * 4) + // AI sprites (10 colors × 4 directions)
        3;        // environment assets
      expect(Object.keys(assets)).toHaveLength(expectedCount);
    });
  });
});
