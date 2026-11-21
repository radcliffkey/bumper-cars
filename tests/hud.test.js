import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hud } from '../src/ui/Hud.js';
import { UI_TEXT_COLOR, UI_URGENT_COLOR, URGENT_TIME_MS } from '../src/config/constants.js';

function displayObject(extra = {}) {
  const obj = { text: '', width: 0, height: 20, visible: true, x: 0, y: 0, ...extra };
  const chain = (fn) => vi.fn((...args) => {
    fn(...args);
    return obj;
  });
  obj.setDepth = chain(() => {});
  obj.setOrigin = chain(() => {});
  obj.setVisible = chain((v) => {
    obj.visible = v;
  });
  obj.setText = chain((t) => {
    obj.text = t;
    obj.width = t.length * 12;
  });
  obj.setColor = chain(() => {});
  obj.setActive = chain((v) => {
    obj.active = v;
  });
  obj.setPosition = chain((x, y) => Object.assign(obj, { x, y }));
  obj.setY = chain((y) => {
    obj.y = y;
  });
  obj.setSize = chain((w, h) => Object.assign(obj, { width: w, height: h }));
  obj.setAlpha = chain(() => {});
  obj.destroy = vi.fn();
  return obj;
}

function mockScene() {
  return {
    scale: { width: 800, height: 600 },
    add: {
      text: vi.fn((_x, _y, text) => displayObject({ text })),
      rectangle: vi.fn((_x, _y, width) => displayObject({ width })),
      container: vi.fn(() => displayObject()),
    },
    tweens: { add: vi.fn() },
    time: { now: 1000 },
  };
}

describe('Hud', () => {
  let hud;

  beforeEach(() => {
    hud = new Hud(mockScene());
  });

  it('shows whole seconds and recolours only when urgency flips', () => {
    hud.setTimeLeft(URGENT_TIME_MS + 1500);
    expect(hud.timerText.text).toBe(`Time: ${Math.ceil((URGENT_TIME_MS + 1500) / 1000)}`);
    expect(hud.timerText.setColor).not.toHaveBeenCalled();
    hud.setTimeLeft(URGENT_TIME_MS);
    hud.setTimeLeft(URGENT_TIME_MS - 1000);
    expect(hud.timerText.setColor).toHaveBeenCalledTimes(1);
    expect(hud.timerText.setColor).toHaveBeenLastCalledWith(UI_URGENT_COLOR);
    hud.setTimeLeft(URGENT_TIME_MS + 5000);
    expect(hud.timerText.setColor).toHaveBeenLastCalledWith(UI_TEXT_COLOR);
  });

  it('keeps floating text inside the fence', () => {
    hud.floatText(795, 5, 'SLAM! +2');
    const text = hud.floatPool[0];
    expect(text.x + text.width / 2).toBeLessThanOrEqual(800 - 16);
    expect(text.y - 36).toBeGreaterThanOrEqual(16);
  });

  it('reuses finished floating texts', () => {
    hud.floatText(10, 10, '+1');
    const first = hud.floatPool[0];
    first.setActive(false);
    hud.floatText(20, 20, '+2');
    expect(hud.floatPool).toHaveLength(1);
    expect(first.text).toBe('+2');
    hud.floatText(30, 30, '+3');
    expect(hud.floatPool).toHaveLength(2);
  });

  it('labels combos from x2 and pops only when the label changes', () => {
    hud.setCombo(1);
    expect(hud.comboText.text).toBe('');
    const before = hud.scene.tweens.add.mock.calls.length;
    hud.setCombo(3);
    hud.setCombo(3);
    expect(hud.comboText.text).toBe('Combo x3');
    expect(hud.scene.tweens.add).toHaveBeenCalledTimes(before + 1);
  });

  it('sizes the power-up bar and hides it when empty', () => {
    hud.setPowerup(0.5);
    expect(hud.powerupFill.visible).toBe(true);
    expect(hud.powerupFill.width).toBe(60);
    hud.setPowerup(2);
    expect(hud.powerupFill.width).toBe(120);
    hud.setPowerup(0);
    expect(hud.powerupFill.visible).toBe(false);
  });

  it('shows and hides the overlay', () => {
    hud.showOverlay('PAUSED', 'P: resume');
    expect(hud.overlayTitle.text).toBe('PAUSED');
    expect(hud.overlayTitleShadow.text).toBe('PAUSED');
    expect(hud.overlay.visible).toBe(true);
    hud.hideOverlay();
    expect(hud.overlay.visible).toBe(false);
  });

  it('starts the prompt visible whenever an overlay opens, then blinks it', () => {
    hud.showOverlay('GAME OVER', 'Score: 7', 'Space: play again');
    expect(hud.overlayPrompt.visible).toBe(true);
    const seen = new Set();
    for (let t = 1000; t < 3000; t += 100) {
      hud.update(t, []);
      seen.add(hud.overlayPrompt.visible);
    }
    expect([...seen].sort()).toEqual([false, true]);
  });

  it('bobs the title and its shadow together in whole pixels', () => {
    hud.showOverlay('BUMPER CARS', '');
    const offsets = new Set();
    for (let t = 1000; t < 2000; t += 40) {
      hud.update(t, []);
      offsets.add(hud.overlayTitleShadow.y - hud.overlayTitle.y);
      expect(Number.isInteger(hud.overlayTitle.y)).toBe(true);
    }
    expect([...offsets]).toHaveLength(1);
  });

  it('fades the HUD plates while a car is under them', () => {
    hud.update(0, [{ x: 400, y: 300 }]);
    expect(hud.scoreText.setAlpha).not.toHaveBeenCalled();
    hud.update(0, [{ x: 60, y: 40 }]);
    expect(hud.scoreText.setAlpha).toHaveBeenLastCalledWith(expect.any(Number));
    expect(hud.scoreText.setAlpha.mock.lastCall[0]).toBeLessThan(1);
    hud.update(0, [{ x: 400, y: 300 }]);
    expect(hud.scoreText.setAlpha).toHaveBeenLastCalledWith(1);
  });

  it('stacks title, body and prompt inside the panel', () => {
    hud.showOverlay('GAME OVER', 'Score: 7', 'Space: play again');
    expect(hud.overlayBody.y).toBeGreaterThan(hud.overlayTitle.y);
    expect(hud.overlayPrompt.y).toBeGreaterThan(hud.overlayBody.y);
    const [outline] = hud.overlayPanel.parts;
    expect(outline.y).toBeLessThan(hud.overlayTitle.y);
    expect(outline.y + outline.height).toBeGreaterThan(hud.overlayPrompt.y + hud.overlayPrompt.height);
  });
});
