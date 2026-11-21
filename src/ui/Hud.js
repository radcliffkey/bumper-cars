import { blinkOn, secondsLeft } from '../logic/gameLogic.js';
import {
  ARENA_MARGIN,
  DEPTH,
  POWERUP_COLOR,
  UI_FONT_FAMILY,
  UI_OUTLINE,
  UI_PANEL_BORDER,
  UI_PANEL_FILL,
  UI_TEXT_COLOR,
  UI_TEXT_STROKE,
  UI_BRIGHT_TEXT,
  UI_TITLE_COLOR,
  UI_URGENT_COLOR,
  URGENT_TIME_MS,
} from '../config/constants.js';

const POWERUP_BAR = { width: 120, height: 8 };
const HUD_INSET = ARENA_MARGIN + 8; // HUD sits inside the fence, not on it
const PROMPT_BLINK_MS = 450;
const OVERLAY_WIDTH = 600;
const TITLE_SHADOW_OFFSET = 4;
const TITLE_BOB = [0, 1, 2, 3, 2, 1]; // whole-pixel steps, one per TITLE_BOB_STEP_MS
const TITLE_BOB_STEP_MS = 160;
const COVERED_ALPHA = 0.35; // HUD plates fade while a car is under them

function textStyle(fontSize, color = UI_TEXT_COLOR) {
  return {
    fontFamily: UI_FONT_FAMILY,
    fontSize: `${fontSize}px`,
    color,
    stroke: UI_TEXT_STROKE,
    strokeThickness: fontSize >= 16 ? 4 : 2,
    align: 'center',
    padding: { x: 2, y: 2 },
  };
}

/**
 * A framed pixel panel (dark outline, wooden border, dark fill) made of three rectangles,
 * which every renderer draws crisply. `layout` moves and resizes it.
 */
class PixelPanel {
  constructor(scene, fillAlpha) {
    this.parts = [
      scene.add.rectangle(0, 0, 1, 1, UI_OUTLINE).setOrigin(0, 0),
      scene.add.rectangle(0, 0, 1, 1, UI_PANEL_BORDER).setOrigin(0, 0),
      scene.add.rectangle(0, 0, 1, 1, UI_PANEL_FILL, fillAlpha).setOrigin(0, 0),
    ];
  }

  layout(x, y, w, h) {
    this.parts.forEach((part, i) => {
      const inset = i * 2;
      part.setPosition(x + inset, y + inset).setSize(w - inset * 2, h - inset * 2);
    });
    return this;
  }

  setDepth(depth) {
    this.parts.forEach((part) => part.setDepth(depth));
    return this;
  }
}

/** Score, timer, combo and power-up readouts plus the centred title/pause/game-over overlay. */
export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.urgent = false;
    this.floatPool = []; // reused so frequent "+N" labels don't create a texture each time
    const { width, height } = scene.scale;

    const plateTop = HUD_INSET - 6;
    this.plates = [
      { x: plateTop, y: plateTop, w: 168, h: 46 },
      { x: width - HUD_INSET - 140, y: plateTop, w: 146, h: 46 },
    ];
    const plateParts = this.plates.flatMap(({ x, y, w, h }) =>
      new PixelPanel(scene, 0.8).layout(x, y, w, h).setDepth(DEPTH.HUD).parts,
    );
    this.scoreText = scene.add.text(HUD_INSET, HUD_INSET, 'Score: 0', textStyle(12)).setDepth(DEPTH.HUD);
    this.comboText = scene.add
      .text(HUD_INSET, HUD_INSET + 18, '', textStyle(10, UI_TITLE_COLOR))
      .setDepth(DEPTH.HUD);
    this.timerText = scene.add
      .text(width - HUD_INSET, HUD_INSET, '', textStyle(12))
      .setOrigin(1, 0)
      .setDepth(DEPTH.HUD);

    const barX = width - HUD_INSET - POWERUP_BAR.width;
    const barY = HUD_INSET + 22;
    this.powerupBack = scene.add
      .rectangle(barX, barY, POWERUP_BAR.width, POWERUP_BAR.height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD);
    this.powerupFill = scene.add
      .rectangle(barX, barY, POWERUP_BAR.width, POWERUP_BAR.height, POWERUP_COLOR)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD);
    this.setPowerup(0);
    this.hudParts = [...plateParts, this.scoreText, this.comboText, this.timerText, this.powerupBack, this.powerupFill];
    this.covered = false;

    const dim = scene.add.rectangle(0, 0, width, height, 0x000000, 0.35).setOrigin(0, 0);
    this.overlayPanel = new PixelPanel(scene, 0.94);
    const titleStyle = { ...textStyle(28, UI_TITLE_COLOR), strokeThickness: 6 };
    // The shadow copy gets the same stroke width in its own colour, so its glyphs line up
    // with the title's and the offset shows.
    this.overlayTitleShadow = scene.add
      .text(width / 2 + TITLE_SHADOW_OFFSET, 0, '', { ...titleStyle, color: UI_TEXT_STROKE, stroke: UI_TEXT_STROKE })
      .setOrigin(0.5, 0);
    this.overlayTitle = scene.add.text(width / 2, 0, '', titleStyle).setOrigin(0.5, 0);
    this.overlayBody = scene.add
      .text(width / 2, 0, '', { ...textStyle(12, UI_BRIGHT_TEXT), lineSpacing: 10 })
      .setOrigin(0.5, 0);
    this.overlayPrompt = scene.add.text(width / 2, 0, '', textStyle(12, UI_TITLE_COLOR)).setOrigin(0.5, 0);
    this.titleY = 0;
    this.overlayShownAt = 0;
    this.overlay = scene.add
      .container(0, 0, [
        dim,
        ...this.overlayPanel.parts,
        this.overlayTitleShadow,
        this.overlayTitle,
        this.overlayBody,
        this.overlayPrompt,
      ])
      .setDepth(DEPTH.OVERLAY)
      .setVisible(false);
  }

  /**
   * Per-frame UI animation on scene time (`nowMs`), which keeps running while the game is paused
   * or over: the title bob, the prompt blink, and fading the plates while any of `cars` is under one.
   */
  update(nowMs, cars) {
    if (this.overlay.visible) {
      const since = nowMs - this.overlayShownAt;
      const bob = TITLE_BOB[Math.floor(since / TITLE_BOB_STEP_MS) % TITLE_BOB.length];
      this.overlayTitle.setY(this.titleY - bob);
      this.overlayTitleShadow.setY(this.titleY + TITLE_SHADOW_OFFSET - bob);
      this.overlayPrompt.setVisible(blinkOn(since, PROMPT_BLINK_MS));
    }
    const covered = cars.some((car) => this.plates.some(({ x, y, w, h }) =>
      car.x > x - ARENA_MARGIN && car.x < x + w + ARENA_MARGIN && car.y < y + h + ARENA_MARGIN));
    if (covered !== this.covered) {
      this.covered = covered;
      this.hudParts.forEach((part) => part.setAlpha(covered ? COVERED_ALPHA : 1));
    }
  }

  setScore(score) {
    this.scoreText.setText(`Score: ${score}`);
  }

  setTimeLeft(remainingMs) {
    this.timerText.setText(`Time: ${secondsLeft(remainingMs)}`);
    const urgent = remainingMs <= URGENT_TIME_MS;
    if (urgent !== this.urgent) {
      this.urgent = urgent;
      this.timerText.setColor(urgent ? UI_URGENT_COLOR : UI_TEXT_COLOR);
    }
  }

  setCombo(combo) {
    const label = combo > 1 ? `Combo x${combo}` : '';
    if (label === this.comboText.text) return;
    this.comboText.setText(label);
    if (label) {
      this.scene.tweens.add({ targets: this.comboText, scale: { from: 1.4, to: 1 }, duration: 180 });
    }
  }

  /** `fraction` of the power-up time left, 0 hides the bar. */
  setPowerup(fraction) {
    const visible = fraction > 0;
    this.powerupBack.setVisible(visible);
    this.powerupFill.setVisible(visible);
    this.powerupFill.width = POWERUP_BAR.width * Math.min(1, Math.max(0, fraction));
  }

  /** Centred panel with a logo-style title, body text and an optional blinking prompt line. */
  showOverlay(title, body, prompt = '') {
    const { width, height } = this.scene.scale;
    this.overlayTitle.setText(title);
    this.overlayTitleShadow.setText(title);
    this.overlayBody.setText(body);
    this.overlayPrompt.setText(prompt);

    const titleHeight = this.overlayTitle.height;
    const bodyHeight = body ? this.overlayBody.height + 16 : 0;
    const promptHeight = prompt ? this.overlayPrompt.height + 16 : 0;
    const panelHeight = 40 + titleHeight + 20 + bodyHeight + promptHeight + 16;
    const top = Math.round((height - panelHeight) / 2);
    const titleY = top + 36;
    this.titleY = titleY;
    this.overlayShownAt = this.scene.time.now;
    this.overlayTitle.setY(titleY);
    this.overlayTitleShadow.setY(titleY + TITLE_SHADOW_OFFSET);
    this.overlayPrompt.setVisible(true);
    this.overlayBody.setY(titleY + titleHeight + 20);
    this.overlayPrompt.setY(titleY + titleHeight + 20 + bodyHeight);
    this.overlayPanel.layout((width - OVERLAY_WIDTH) / 2, top, OVERLAY_WIDTH, panelHeight);
    this.overlay.setVisible(true);
  }

  hideOverlay() {
    this.overlay.setVisible(false);
  }

  /** Text that rises and fades at a world position, e.g. "+3" over a bumped car. */
  floatText(x, y, label, color = UI_TEXT_COLOR) {
    let text = this.floatPool.find((t) => !t.active);
    if (!text) {
      // Above the HUD plates, so labels near the top stay readable.
      text = this.scene.add.text(0, 0, '', textStyle(12)).setOrigin(0.5).setDepth(DEPTH.HUD + 1);
      this.floatPool.push(text);
    }
    text.setActive(true).setVisible(true).setAlpha(1).setColor(color).setText(label);
    // Keep the whole label inside the fence.
    const { width } = this.scene.scale;
    const half = text.width / 2 + ARENA_MARGIN;
    const startY = Math.max(y, ARENA_MARGIN + 40);
    text.setPosition(Math.min(Math.max(x, half), width - half), startY);
    this.scene.tweens.add({
      targets: text,
      y: startY - 36,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.setActive(false).setVisible(false),
    });
  }

  /** Big centred word that pops in and fades, e.g. "GO!". Drawn below the overlay. */
  banner(label) {
    const { width, height } = this.scene.scale;
    const text = this.scene.add
      .text(width / 2, height / 2, label, { ...textStyle(40, UI_TITLE_COLOR), strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(DEPTH.BANNER);
    this.scene.tweens.add({
      targets: text,
      scale: { from: 0.4, to: 1.3 },
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
