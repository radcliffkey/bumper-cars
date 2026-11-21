import Phaser from 'phaser';
import { createCarSprite } from '../sprites/Car.js';
import { Hud, cssColor } from '../ui/Hud.js';
import { generatePixelAssets } from '../utils/assets.js';
import { loadBestScore, recordScore } from '../utils/highScore.js';
import {
  playBump,
  playScore,
  playWallHit,
  playPowerup,
  playGameOver,
  playExplosion,
  playTick,
  playStart,
  resumeAudio,
} from '../utils/audio.js';
import {
  blinkOn,
  comboExpired,
  cooldownElapsed,
  findFreeSpawnPoint,
  nextCombo,
  secondsLeft,
} from '../logic/gameLogic.js';
import { steer, cruise, facingOf, playerBump, aiBump, bounceOffWall } from '../logic/physics.js';
import {
  ARENA_MARGIN,
  SPAWN_PADDING,
  ROUND_DURATION_MS,
  URGENT_TIME_MS,
  MAX_FRAME_DT_MS,
  PLAYER_ACCEL,
  PLAYER_MAX_SPEED,
  PLAYER_DRAG,
  PLAYER_WALL_BOUNCE,
  RECOIL_FORCE,
  AI_COUNT,
  AI_BASE_SPEED,
  AI_DRAG,
  AI_MIN_WALL_SPEED,
  AI_DIRECTION_INTERVAL_MS_BASE,
  AI_DIRECTION_INTERVAL_MS_JITTER,
  AI_BUMP_STEER_DELAY_MS,
  AI_STUCK_POSITION_TOLERANCE_PX,
  AI_STUCK_TIME_MS,
  AI_RESPAWN_CLEARANCE_PX,
  AI_COLORS,
  CAR_BODY_RADIUS,
  SCORING_COOLDOWN_MS,
  SCORE_MIN_CLOSING_SPEED,
  SLAM_WINDOW_MS,
  SLAM_BONUS,
  SHAKE_COOLDOWN_MS,
  SOUND_COOLDOWN_MS,
  CHEST_SPAWN_INTERVAL_MS,
  CHEST_LIFETIME_MS,
  CHEST_BLINK_MS,
  CHEST_BODY_RADIUS,
  CHEST_SPAWN_INSET,
  POWERUP_DURATION_MS,
  POWERUP_SPEED_MULTIPLIER,
  POWERUP_RECOIL_MULTIPLIER,
  FLOOR_NOISE_OVERLAY_ALPHA,
  DEPTH,
  POWERUP_COLOR,
  SLAM_COLOR,
  SPARK_COLOR,
  CHEST_BURST_COLOR,
} from '../config/constants.js';

export const Phase = Object.freeze({
  READY: 'ready', // title screen; AI cars roam, the player waits
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
});

const RESTART_DELAY_MS = 600; // ignore keys held from the last moments of a round
const RESTART_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyR', 'Pointer']);
const TURBO_BLINK_MS = 1000; // the tint blinks during the last second of turbo
const COOLDOWN_ALPHA = 0.55;

const TITLE_TEXT = [
  'Bump cars to score',
  'Chain hits for combos',
  'Fling cars into the fence: SLAM!',
  'Grab chests for turbo',
  '',
  'Arrows / WASD: drive   P: pause',
  '',
  'Press any key to start',
].join('\n');

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.resetState();
  }

  /** Runs on construction and on every restart (Phaser reuses the scene instance). */
  resetState() {
    this.phase = Phase.READY;
    this.score = 0;
    this.combo = 0;
    this.lastScoreAt = null;
    // Milliseconds of unpaused play. All gameplay timing uses deadlines on this clock, so
    // pausing needs no timer bookkeeping. Round deadlines are set when the round starts.
    this.clock = 0;
    this.roundEndsAt = Infinity;
    this.nextChestAt = Infinity;
    this.chestExpiresAt = 0;
    this.powerupEndsAt = 0;
    this.lastAt = {}; // per-effect timestamps for cooledDown()
    // The player's velocity as last driven. Arcade rewrites body velocities while separating
    // colliding bodies, before the collide callback runs, so bumps read this instead.
    this.playerVelocity = { x: 0, y: 0 };
    this.canRestart = false;
    this.player = null;
    this.aiCars = null;
    this.chest = null;
    this.hud = null;
  }

  preload() {
    const assets = generatePixelAssets();
    Object.entries(assets).forEach(([key, dataUrl]) => this.load.image(key, dataUrl));
  }

  create(data = {}) {
    this.resetState();
    this.createArena();
    this.createCars();
    this.createChest();
    this.hud = new Hud(this);
    this.hud.setTimeLeft(ROUND_DURATION_MS);
    this.createInput();

    this.physics.add.collider(this.player, this.aiCars, this.handleCarCollision, undefined, this);
    this.physics.add.collider(this.aiCars, this.aiCars, this.handleCarCollision, undefined, this);
    this.physics.add.overlap(this.player, this.chest, this.collectChest, undefined, this);
    this.physics.world.on('worldbounds', this.handleWorldBounds, this);

    if (data.skipTitle) {
      this.startRound();
    } else {
      this.hud.showOverlay('BUMPER CARS', `${TITLE_TEXT}\n\nBest: ${loadBestScore()}`);
    }
  }

  createArena() {
    const { width, height } = this.scale;
    this.add.tileSprite(0, 0, width, height, 'floor_wood').setOrigin(0, 0);
    this.add
      .tileSprite(0, 0, width, height, 'floor_noise')
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(FLOOR_NOISE_OVERLAY_ALPHA);

    const m = ARENA_MARGIN;
    [
      [0, 0, width, m],
      [0, height - m, width, m],
      [0, 0, m, height],
      [width - m, 0, m, height],
    ].forEach(([x, y, w, h]) => this.add.tileSprite(x, y, w, h, 'fence_tile').setOrigin(0, 0).setDepth(DEPTH.FENCE));

    this.physics.world.setBounds(m, m, width - m * 2, height - m * 2);
  }

  createCars() {
    const { width, height } = this.scale;
    this.player = createCarSprite(this, width / 2, height / 2, 'player_down', PLAYER_WALL_BOUNCE);
    this.player.setData('facing', 'down');

    // A plain group: an Arcade physics group would overwrite each car's body settings.
    this.aiCars = this.add.group();
    for (let i = 0; i < AI_COUNT; i += 1) {
      const spawn = this.findSpawnPoint(CAR_BODY_RADIUS);
      const base = `ai${i % AI_COLORS.length}`;
      const ai = createCarSprite(this, spawn.x, spawn.y, `${base}_down`, 1);
      ai.setData({ ai: true, base, facing: 'down', lastScoredAt: null, flungAt: null });
      this.aiCars.add(ai);
      this.resetAiTracking(ai);
      this.driveRandomly(ai);
    }
  }

  createChest() {
    this.chest = this.physics.add.sprite(0, 0, 'bonus_chest');
    this.chest.setCircle(CHEST_BODY_RADIUS, 0, 0);
    this.chest.setImmovable(true);
    this.chest.setDepth(DEPTH.CHEST);
    this.chest.disableBody(true, true);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown', (event) => this.handleCommand(event.code));
    this.input.on('pointerdown', () => this.handleCommand('Pointer'));
  }

  /** What a key press (by `KeyboardEvent.code`, or 'Pointer' for a click) does in each phase. */
  handleCommand(code) {
    resumeAudio();
    switch (this.phase) {
      case Phase.READY:
        this.startRound();
        break;
      case Phase.PLAYING:
      case Phase.PAUSED:
        if (code === 'KeyP') this.togglePause();
        else if (code === 'KeyR') this.restart();
        break;
      case Phase.OVER:
        if (this.canRestart && RESTART_KEYS.has(code)) this.restart();
        break;
    }
  }

  restart() {
    this.scene.restart({ skipTitle: true });
  }

  startRound() {
    this.phase = Phase.PLAYING;
    // The clock already runs on the title screen, so round deadlines start from now.
    this.roundEndsAt = this.clock + ROUND_DURATION_MS;
    this.nextChestAt = this.clock + CHEST_SPAWN_INTERVAL_MS;
    this.hud.hideOverlay();
    this.hud.banner('GO!');
    playStart();
  }

  togglePause() {
    if (this.phase === Phase.PLAYING) {
      this.phase = Phase.PAUSED;
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.hud.showOverlay('PAUSED', 'P: resume   R: restart');
    } else if (this.phase === Phase.PAUSED) {
      this.phase = Phase.PLAYING;
      this.physics.world.resume();
      this.tweens.resumeAll();
      this.hud.hideOverlay();
    }
  }

  endRound() {
    this.phase = Phase.OVER;
    this.physics.world.pause();
    this.hideChest();
    this.powerupEndsAt = this.clock;
    this.combo = 0;

    const isBest = recordScore(this.score);
    const bestLine = isBest ? 'NEW BEST!' : `Best: ${loadBestScore()}`;
    this.hud.showOverlay('GAME OVER', `Score: ${this.score}\n${bestLine}\n\nSpace / Enter: play again`);
    this.time.delayedCall(RESTART_DELAY_MS, () => {
      this.canRestart = true;
    });
    playGameOver();
  }

  update(_time, delta) {
    if (this.phase === Phase.READY || this.phase === Phase.PLAYING) {
      this.simulate(Math.min(delta, MAX_FRAME_DT_MS));
    }
    this.updateVisuals();
  }

  simulate(dtMs) {
    this.clock += dtMs;
    const playing = this.phase === Phase.PLAYING;
    if (playing) {
      this.updateRoundTimer(dtMs);
      if (this.phase === Phase.OVER) return;
      this.updateChest();
      if (comboExpired(this.clock, this.lastScoreAt)) this.combo = 0;
    }
    this.updatePlayer(dtMs / 1000, playing);
    this.updateAiCars(dtMs / 1000);
  }

  updateRoundTimer(dtMs) {
    const remaining = Math.max(0, this.roundEndsAt - this.clock);
    if (secondsLeft(remaining) !== secondsLeft(remaining + dtMs)) {
      this.hud.setTimeLeft(remaining);
      if (remaining > 0 && remaining <= URGENT_TIME_MS) playTick();
    }
    if (remaining <= 0) this.endRound();
  }

  /** Display state derived from game state; runs in every phase so nothing needs a manual reset. */
  updateVisuals() {
    const turboLeft = Math.max(0, this.powerupEndsAt - this.clock);
    const tinted = turboLeft > 0 && (turboLeft >= TURBO_BLINK_MS || blinkOn(turboLeft, 100));
    if (tinted) this.player.setTint(POWERUP_COLOR);
    else this.player.clearTint();
    this.hud.setPowerup(turboLeft / POWERUP_DURATION_MS);
    this.hud.setCombo(this.combo);

    const showCooldowns = this.phase === Phase.PLAYING || this.phase === Phase.PAUSED;
    this.aiCars.getChildren().forEach((ai) => {
      const onCooldown = !cooldownElapsed(this.clock, ai.getData('lastScoredAt'), SCORING_COOLDOWN_MS);
      ai.setAlpha(showCooldowns && onCooldown ? COOLDOWN_ALPHA : 1);
    });
  }

  isPoweredUp() {
    return this.clock < this.powerupEndsAt;
  }

  /** True (and restarts the cooldown) when the effect named `key` may fire again. */
  cooledDown(key, cooldownMs) {
    if (!cooldownElapsed(this.clock, this.lastAt[key], cooldownMs)) return false;
    this.lastAt[key] = this.clock;
    return true;
  }

  /** Drives the player from the keys, or just lets them coast when `acceptInput` is false. */
  updatePlayer(dtSec, acceptInput) {
    const boost = this.isPoweredUp() ? POWERUP_SPEED_MULTIPLIER : 1;
    const input = acceptInput ? this.readDriveInput() : { x: 0, y: 0 };
    this.playerVelocity = steer(this.player.body.velocity, input, dtSec, {
      accel: PLAYER_ACCEL * boost,
      maxSpeed: PLAYER_MAX_SPEED * boost,
      drag: PLAYER_DRAG,
    });
    this.player.setVelocity(this.playerVelocity.x, this.playerVelocity.y);
    this.faceCar(this.player, input, 'player');
  }

  readDriveInput() {
    const { cursors, wasd } = this;
    return {
      x: Number(cursors.right.isDown || wasd.D.isDown) - Number(cursors.left.isDown || wasd.A.isDown),
      y: Number(cursors.down.isDown || wasd.S.isDown) - Number(cursors.up.isDown || wasd.W.isDown),
    };
  }

  updateAiCars(dtSec) {
    this.aiCars.getChildren().forEach((ai) => {
      if (this.clock >= ai.getData('dirChangeAt')) {
        this.driveRandomly(ai);
      } else {
        const v = cruise(ai.body.velocity, dtSec, AI_DRAG, AI_BASE_SPEED);
        ai.setVelocity(v.x, v.y);
      }
      this.faceCar(ai, ai.body.velocity, ai.getData('base'));
      this.checkStuck(ai);
    });
  }

  faceCar(car, direction, textureBase) {
    const facing = facingOf(direction, car.getData('facing'));
    if (facing && facing !== car.getData('facing')) {
      car.setData('facing', facing);
      car.setTexture(`${textureBase}_${facing}`);
    }
  }

  driveRandomly(ai) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    ai.setVelocity(Math.cos(angle) * AI_BASE_SPEED, Math.sin(angle) * AI_BASE_SPEED);
    const interval = AI_DIRECTION_INTERVAL_MS_BASE + Phaser.Math.Between(0, AI_DIRECTION_INTERVAL_MS_JITTER);
    ai.setData('dirChangeAt', this.clock + interval);
  }

  /** Cars that sit still for too long (wedged in a corner or pile-up) pop and reappear. */
  checkStuck(ai) {
    const dx = ai.x - ai.getData('lastPosX');
    const dy = ai.y - ai.getData('lastPosY');
    if (dx * dx + dy * dy > AI_STUCK_POSITION_TOLERANCE_PX ** 2) {
      this.resetAiTracking(ai);
    } else if (this.clock - ai.getData('stuckSinceAt') >= AI_STUCK_TIME_MS) {
      this.explodeAndRespawn(ai);
    }
  }

  resetAiTracking(ai) {
    ai.setData({ lastPosX: ai.x, lastPosY: ai.y, stuckSinceAt: this.clock });
  }

  explodeAndRespawn(ai) {
    this.burst(ai.x, ai.y, 0xffffff, 0, 30);
    playExplosion();
    const spawn = this.findSpawnPoint(CAR_BODY_RADIUS, ai);
    ai.body.reset(spawn.x, spawn.y);
    ai.setData('flungAt', null);
    this.resetAiTracking(ai);
    this.driveRandomly(ai);
  }

  /** A random point at least `inset` inside the spawn area, away from every car except `exclude`. */
  findSpawnPoint(inset, exclude = null) {
    const { width, height } = this.scale;
    const m = SPAWN_PADDING + inset;
    const bounds = { minX: m, maxX: width - m, minY: m, maxY: height - m };
    const cars = [this.player, ...this.aiCars.getChildren()].filter((c) => c !== exclude);
    return findFreeSpawnPoint(bounds, cars, AI_RESPAWN_CLEARANCE_PX, Phaser.Math.Between);
  }

  handleCarCollision(a, b) {
    const aIsAi = Boolean(a.getData('ai'));
    const bIsAi = Boolean(b.getData('ai'));
    if (aIsAi && bIsAi) {
      const result = aiBump(a, a.body.velocity, b, b.body.velocity);
      a.setVelocity(result.a.x, result.a.y);
      b.setVelocity(result.b.x, result.b.y);
      return;
    }
    const [player, ai] = aIsAi ? [b, a] : [a, b];
    this.bumpAi(player, ai);
  }

  bumpAi(player, ai) {
    const multiplier = this.isPoweredUp() ? POWERUP_RECOIL_MULTIPLIER : 1;
    const result = playerBump(player, this.playerVelocity, ai, multiplier);
    ai.setVelocity(result.ai.x, result.ai.y);
    player.setVelocity(result.player.x, result.player.y);
    this.playerVelocity = result.player;
    // Let the fling play out instead of the AI immediately picking a new heading.
    ai.setData('dirChangeAt', Math.max(ai.getData('dirChangeAt'), this.clock + AI_BUMP_STEER_DELAY_MS));

    const impact = result.recoil / RECOIL_FORCE;
    if (this.cooledDown('shake', SHAKE_COOLDOWN_MS)) {
      this.cameras.main.shake(120 + 40 * impact, Math.min(0.03, 0.008 * impact));
    }
    if (this.cooledDown('bumpSound', SOUND_COOLDOWN_MS)) playBump();

    const drivenIntoIt = result.closingSpeed >= SCORE_MIN_CLOSING_SPEED;
    if (this.phase !== Phase.PLAYING || !drivenIntoIt) return;
    if (!cooldownElapsed(this.clock, ai.getData('lastScoredAt'), SCORING_COOLDOWN_MS)) return;

    ai.setData({ lastScoredAt: this.clock, flungAt: this.clock });
    this.combo = nextCombo(this.combo, this.clock, this.lastScoreAt);
    const contactX = (player.x + ai.x) / 2;
    const contactY = (player.y + ai.y) / 2;
    this.burst(contactX, contactY, SPARK_COLOR, Math.round(4 + 2 * impact), 0);
    this.addPoints(this.combo, ai.x, ai.y - 24, `+${this.combo}`);
    playScore(this.combo);
  }

  addPoints(points, x, y, label, color) {
    this.score += points;
    this.lastScoreAt = this.clock;
    this.hud.setScore(this.score);
    this.hud.floatText(x, y, label, color);
  }

  /** Arcade has already reflected the car (by its bounce); this adds feel and slam scoring. */
  handleWorldBounds(body, up, down, left, right) {
    const car = body.gameObject;
    if (!car || this.phase === Phase.OVER) return;
    const normal = { x: left ? 1 : right ? -1 : 0, y: up ? 1 : down ? -1 : 0 };

    if (car === this.player) {
      const away = body.velocity.x * normal.x + body.velocity.y * normal.y;
      if (away > 40 && this.cooledDown('wallSound', SOUND_COOLDOWN_MS)) playWallHit();
      return;
    }

    const v = bounceOffWall(body.velocity, normal, AI_MIN_WALL_SPEED);
    car.setVelocity(v.x, v.y);

    const flungAt = car.getData('flungAt');
    if (this.phase === Phase.PLAYING && flungAt != null && this.clock - flungAt <= SLAM_WINDOW_MS) {
      car.setData('flungAt', null);
      this.addPoints(SLAM_BONUS, car.x, car.y - 24, `SLAM! +${SLAM_BONUS}`, cssColor(SLAM_COLOR));
      this.burst(car.x - normal.x * CAR_BODY_RADIUS, car.y - normal.y * CAR_BODY_RADIUS, SLAM_COLOR, 8, 0);
      playWallHit();
    }
  }

  updateChest() {
    if (!this.chest.active) {
      if (this.clock >= this.nextChestAt) this.spawnChest();
      return;
    }
    const left = this.chestExpiresAt - this.clock;
    if (left <= 0) this.hideChest();
    else this.chest.setVisible(left >= CHEST_BLINK_MS || blinkOn(left, 120));
  }

  spawnChest() {
    const { x, y } = this.findSpawnPoint(CHEST_SPAWN_INSET);
    this.chest.enableBody(true, x, y, true, true);
    this.chestExpiresAt = this.clock + CHEST_LIFETIME_MS;
    this.tweens.add({ targets: this.chest, y: y - 5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  hideChest() {
    this.tweens.killTweensOf(this.chest);
    this.chest.disableBody(true, true);
    this.nextChestAt = this.clock + CHEST_SPAWN_INTERVAL_MS;
  }

  collectChest() {
    if (!this.chest.active || this.phase !== Phase.PLAYING) return;
    const { x, y } = this.chest;
    this.burst(x, y, CHEST_BURST_COLOR, 8, 20);
    this.hideChest();
    this.powerupEndsAt = this.clock + POWERUP_DURATION_MS;
    this.hud.floatText(x, y - 20, 'TURBO!', cssColor(POWERUP_COLOR));
    playPowerup();
  }

  /** Square pixel sparks flying out from a point plus an optional expanding flash. */
  burst(x, y, color, sparks, flashRadius) {
    for (let i = 0; i < sparks; i += 1) {
      const angle = (Math.PI * 2 * i) / sparks;
      const spark = this.add.rectangle(x, y, 4, 4, color).setDepth(DEPTH.EFFECTS);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 36,
        y: y + Math.sin(angle) * 36,
        alpha: 0,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
    if (flashRadius > 0) {
      const flash = this.add.circle(x, y, flashRadius, color, 0.8).setDepth(DEPTH.EFFECTS);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2.5,
        duration: 350,
        ease: 'Cubic.easeOut',
        onComplete: () => flash.destroy(),
      });
    }
  }
}
