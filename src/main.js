import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GAME_WIDTH, GAME_HEIGHT, UI_FONT_FAMILY } from './config/constants.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#3b2f2f',
  scale: {
    mode: Phaser.Scale.FIT, // fill the window while keeping the arena's aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [GameScene],
};

// Phaser rasterizes text once, so wait for the pixel font before starting, but never long:
// on a slow connection a fallback font beats a blank page.
const FONT_TIMEOUT_MS = 1500;
const fontLoad = globalThis.document?.fonts?.load(`12px ${UI_FONT_FAMILY}`) ?? Promise.resolve();
const fontTimeout = new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
export const gameReady = Promise.race([fontLoad.catch(() => {}), fontTimeout]).then(() => new Phaser.Game(config));
