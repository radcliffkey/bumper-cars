import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create hoisted refs for mocks used inside vi.mock
const hoisted = vi.hoisted(() => {
  const GameMock = vi.fn();
  const PhaserStub = { AUTO: 'AUTO', Game: GameMock, Scene: class {} };
  // Provide global Phaser for files that reference it directly (e.g., GameScene.js)
  global.Phaser = PhaserStub;
  return { GameMock, PhaserStub };
});

// Ensure a clean module cache between tests
beforeEach(() => {
  vi.resetModules();
});

describe('main entry wiring', () => {
  it('creates a Phaser.Game with expected config', async () => {
    vi.mock('phaser', () => ({
      default: hoisted.PhaserStub,
    }), { virtual: true });

    const mod = await import('../src/main.js');
    expect(mod).toBeTruthy();
    expect(hoisted.GameMock).toHaveBeenCalledTimes(1);
    const [config] = hoisted.GameMock.mock.calls[0];

    expect(config.type).toBe('AUTO');
    expect(config.width).toBeGreaterThan(0);
    expect(config.height).toBeGreaterThan(0);
    expect(config.physics.default).toBe('arcade');
    expect(Array.isArray(config.scene)).toBe(true);
    expect(config.render.pixelArt).toBe(true);
  });
});


