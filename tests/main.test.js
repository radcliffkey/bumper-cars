import { describe, it, expect, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const GameMock = vi.fn();
  const PhaserStub = { AUTO: 'AUTO', Game: GameMock, Scene: class {}, Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' } };
  return { GameMock, PhaserStub };
});

vi.mock('phaser', () => ({ default: hoisted.PhaserStub }));

describe('main entry wiring', () => {
  it('creates a Phaser.Game with expected config', async () => {
    const mod = await import('../src/main.js');
    await mod.gameReady;
    expect(hoisted.GameMock).toHaveBeenCalledTimes(1);
    const [config] = hoisted.GameMock.mock.calls[0];

    expect(config.type).toBe('AUTO');
    expect(config.width).toBeGreaterThan(0);
    expect(config.height).toBeGreaterThan(0);
    expect(config.physics.default).toBe('arcade');
    expect(Array.isArray(config.scene)).toBe(true);
    expect(config.render.pixelArt).toBe(true);
    expect(config.scale.mode).toBe('FIT');
  });
});
