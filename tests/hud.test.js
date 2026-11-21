import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hud } from '../src/ui/Hud.js';
import { UI_TEXT_COLOR, UI_URGENT_COLOR, URGENT_TIME_MS } from '../src/config/constants.js';

function displayObject(extra = {}) {
  const obj = { text: '', width: 0, visible: true, ...extra };
  obj.setDepth = vi.fn(() => obj);
  obj.setOrigin = vi.fn(() => obj);
  obj.setVisible = vi.fn((v) => {
    obj.visible = v;
    return obj;
  });
  obj.setText = vi.fn((t) => {
    obj.text = t;
    return obj;
  });
  obj.setColor = vi.fn(() => obj);
  obj.setActive = vi.fn((v) => {
    obj.active = v;
    return obj;
  });
  obj.setPosition = vi.fn(() => obj);
  obj.setAlpha = vi.fn(() => obj);
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
    hud.setCombo(3);
    hud.setCombo(3);
    expect(hud.comboText.text).toBe('Combo x3');
    expect(hud.scene.tweens.add).toHaveBeenCalledTimes(1);
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
    expect(hud.overlay.visible).toBe(true);
    hud.hideOverlay();
    expect(hud.overlay.visible).toBe(false);
  });
});
