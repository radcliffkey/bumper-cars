import { secondsLeft } from '../logic/gameLogic.js';
import {
  DEPTH,
  POWERUP_COLOR,
  UI_FONT_FAMILY,
  UI_TEXT_COLOR,
  UI_TEXT_STROKE,
  UI_URGENT_COLOR,
  URGENT_TIME_MS,
} from '../config/constants.js';

const POWERUP_BAR = { width: 120, height: 8 };

/** CSS form of a 0xRRGGBB colour, for Phaser text styles. */
export function cssColor(rgb) {
  return `#${rgb.toString(16).padStart(6, '0')}`;
}

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

/** Score, timer, combo and power-up readouts plus the centred title/pause/game-over overlay. */
export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.urgent = false;
    this.floatPool = []; // reused so frequent "+N" labels don't create a texture each time
    const { width, height } = scene.scale;

    this.scoreText = scene.add.text(12, 6, 'Score: 0', textStyle(12)).setDepth(DEPTH.HUD);
    this.comboText = scene.add.text(12, 26, '', textStyle(10, '#ffd34d')).setDepth(DEPTH.HUD);
    this.timerText = scene.add.text(width - 12, 6, '', textStyle(12)).setOrigin(1, 0).setDepth(DEPTH.HUD);

    const barX = width - 12 - POWERUP_BAR.width;
    this.powerupBack = scene.add
      .rectangle(barX, 28, POWERUP_BAR.width, POWERUP_BAR.height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD);
    this.powerupFill = scene.add
      .rectangle(barX, 28, POWERUP_BAR.width, POWERUP_BAR.height, POWERUP_COLOR)
      .setOrigin(0, 0)
      .setDepth(DEPTH.HUD);
    this.setPowerup(0);

    const dim = scene.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0, 0);
    this.overlayTitle = scene.add.text(width / 2, height / 2 - 140, '', textStyle(28, '#fff5d6')).setOrigin(0.5);
    this.overlayBody = scene.add
      .text(width / 2, height / 2 - 90, '', { ...textStyle(12, '#fff5d6'), lineSpacing: 10 })
      .setOrigin(0.5, 0);
    this.overlay = scene.add
      .container(0, 0, [dim, this.overlayTitle, this.overlayBody])
      .setDepth(DEPTH.OVERLAY)
      .setVisible(false);
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

  showOverlay(title, body) {
    this.overlayTitle.setText(title);
    this.overlayBody.setText(body);
    this.overlay.setVisible(true);
  }

  hideOverlay() {
    this.overlay.setVisible(false);
  }

  /** Text that rises and fades at a world position, e.g. "+3" over a bumped car. */
  floatText(x, y, label, color = UI_TEXT_COLOR) {
    let text = this.floatPool.find((t) => !t.active);
    if (!text) {
      text = this.scene.add.text(0, 0, '', textStyle(12)).setOrigin(0.5).setDepth(DEPTH.EFFECTS);
      this.floatPool.push(text);
    }
    text.setActive(true).setVisible(true).setPosition(x, y).setAlpha(1).setColor(color).setText(label);
    this.scene.tweens.add({
      targets: text,
      y: y - 36,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.setActive(false).setVisible(false),
    });
  }

  /** Big centred word that pops in and fades, e.g. "GO!". */
  banner(label) {
    const { width, height } = this.scene.scale;
    const text = this.scene.add
      .text(width / 2, height / 2, label, textStyle(40, '#fff5d6'))
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY);
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
