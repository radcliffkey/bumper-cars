import Phaser from 'phaser';
import { createCarSprite } from '../sprites/Car.js';
import { Hud } from '../ui/Hud.js';
import { cssColor } from '../utils/color.js';
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
import { carFlipped, carTextureKey } from '../utils/carArt.js';
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
  BURST_COLORS,
  SLAM_FLASH_COOLDOWN_MS,
  DUST_MIN_SPEED,
  DUST_INTERVAL_MS,
  CAR_SHADOW_OFFSET_Y,
  CHEST_SHADOW_OFFSET_Y,
  PIXEL_SCALE,
} from '../config/constants.js';

export const Phase = Object.freeze({
  READY: 'ready', // title screen; AI cars roam, the player waits
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
});

const RESTART_DELAY_MS = 600; // ignore keys held from the last moments of a round
const RESTART_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyR', 'Pointer']);
const TURBO_BLINK_MS = 1000; // the turbo look blinks during the last second
const HIT_FLASH_MS = 80;
const BOB_FRAME_MS = 160; // drivers bob while their car moves
const BOB_MIN_SPEED = 20;
// Particle textures are 2x2 art pixels; scaling between whole art-pixel sizes keeps them on the grid.
const BURST_PARTICLES = {
  speed: { min: 60, max: 170 },
  lifespan: 380,
  scale: { start: PIXEL_SCALE, end: PIXEL_SCALE / 2 },
  alpha: { start: 1, end: 0.3 },
};

const TITLE_TEXT = [
  'Bump cars to score',
  'Chain hits for combos',
  'Fling cars into the fence: SLAM!',
  'Grab chests for turbo',
  '',
  'Drive: arrows or WASD',
  'Pause: P, restart: R',
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
    // preload runs again on every restart; the textures are already there by then.
    if (this.textures.exists('floor_wood')) return;
    const assets = generatePixelAssets();
    Object.entries(assets).forEach(([key, dataUrl]) => this.load.image(key, dataUrl));
  }

  create(data = {}) {
    this.resetState();
    this.createArena();
    this.createCars();
    this.createChest();
    this.createEffects();
    this.hud = new Hud(this);
    this.hud.setTimeLeft(ROUND_DURATION_MS);
    this.createInput();

    this.physics.add.collider(this.player, this.aiCars, this.handleCarCollision, undefined, this);
    this.physics.add.collider(this.aiCars, this.aiCars, this.handleCarCollision, undefined, this);
    this.physics.add.overlap(this.player, this.chest, this.collectChest, undefined, this);
    this.physics.world.on('worldbounds', this.handleWorldBounds, this);
    // Visuals follow the physics step, which moves the sprites after update() has run;
    // otherwise shadows and depth order trail the cars by a frame.
    this.events.on('postupdate', this.updateVisuals, this);
    this.events.once('shutdown', () => this.events.off('postupdate', this.updateVisuals, this));

    if (data.skipTitle) {
      this.startRound();
    } else {
      this.hud.showOverlay('BUMPER CARS', `${TITLE_TEXT}\n\nBest: ${loadBestScore()}`, 'Press any key to start');
    }
  }

  createArena() {
    const { width, height } = this.scale;
    // Arena art is drawn at 1px and shown at PIXEL_SCALE, the same pixel size as the cars.
    this.add.tileSprite(0, 0, width, height, 'floor_wood').setOrigin(0, 0).setTileScale(PIXEL_SCALE);
    this.add
      .tileSprite(0, 0, width, height, 'floor_noise')
      .setOrigin(0, 0)
      .setTileScale(PIXEL_SCALE)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setAlpha(FLOOR_NOISE_OVERLAY_ALPHA);

    const m = ARENA_MARGIN;
    // A soft shadow cast by the top and left fences onto the floor.
    this.add.rectangle(m, m, width - m * 2, 4, 0x000000, 0.25).setOrigin(0, 0).setDepth(DEPTH.FENCE);
    this.add.rectangle(m, m + 4, 4, height - m * 2 - 4, 0x000000, 0.25).setOrigin(0, 0).setDepth(DEPTH.FENCE);
    [
      [0, 0, width, m, 'fence_h'],
      [0, height - m, width, m, 'fence_h'],
      [0, 0, m, height, 'fence_v'],
      [width - m, 0, m, height, 'fence_v'],
    ].forEach(([x, y, w, h, key]) =>
      this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0).setTileScale(PIXEL_SCALE).setDepth(DEPTH.FENCE),
    );
    [
      [0, 0],
      [width - m, 0],
      [0, height - m],
      [width - m, height - m],
    ].forEach(([x, y]) =>
      this.add.image(x, y, 'fence_corner').setOrigin(0, 0).setScale(PIXEL_SCALE).setDepth(DEPTH.FENCE),
    );

    this.physics.world.setBounds(m, m, width - m * 2, height - m * 2);
  }

  createCars() {
    const { width, height } = this.scale;
    this.player = createCarSprite(this, width / 2, height / 2, 'player_down_0', PLAYER_WALL_BOUNCE);
    this.player.setData({ facing: 'down', bobOffset: 0, flashUntil: 0, shadow: this.addShadow('car_shadow') });

    // A plain group: an Arcade physics group would overwrite each car's body settings.
    this.aiCars = this.add.group();
    for (let i = 0; i < AI_COUNT; i += 1) {
      const spawn = this.findSpawnPoint(CAR_BODY_RADIUS);
      const base = `ai${i % AI_COLORS.length}`;
      const ai = createCarSprite(this, spawn.x, spawn.y, `${base}_down_0`, 1);
      ai.setData({
        ai: true,
        base,
        facing: 'down',
        lastScoredAt: null,
        flungAt: null,
        bobOffset: (i + 1) * 70,
        flashUntil: 0,
        shadow: this.addShadow('car_shadow'),
      });
      this.aiCars.add(ai);
      this.resetAiTracking(ai);
      this.driveRandomly(ai);
    }
  }

  createChest() {
    this.chest = this.physics.add.sprite(0, 0, 'bonus_chest');
    this.chest.setScale(PIXEL_SCALE);
    this.chest.setCircle(CHEST_BODY_RADIUS / PIXEL_SCALE, 0, 0);
    this.chest.setImmovable(true);
    this.chest.setDepth(DEPTH.CHEST);
    this.chest.disableBody(true, true);
    this.chestShadow = this.addShadow('chest_shadow').setVisible(false);
  }

  addShadow(texture) {
    return this.add.image(0, 0, texture).setScale(PIXEL_SCALE).setDepth(DEPTH.SHADOW);
  }

  /** Pooled particle emitters, one per baked colour (Canvas can't tint particles). */
  createEffects() {
    const emitter = (texture, depth, config) =>
      this.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth);
    this.emitters = {
      ...Object.fromEntries(
        Object.keys(BURST_COLORS).map((kind) => [kind, emitter(`px_${kind}`, DEPTH.EFFECTS, BURST_PARTICLES)]),
      ),
      dust: emitter('px_dust', DEPTH.DUST, {
        speed: { min: 8, max: 28 },
        lifespan: 450,
        scale: { start: PIXEL_SCALE, end: PIXEL_SCALE / 2 },
        alpha: { start: 0.7, end: 0 },
      }),
    };
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
      Object.values(this.emitters).forEach((e) => e.pause());
      this.hud.showOverlay('PAUSED', 'P: resume\nR: restart');
    } else if (this.phase === Phase.PAUSED) {
      this.phase = Phase.PLAYING;
      this.physics.world.resume();
      this.tweens.resumeAll();
      Object.values(this.emitters).forEach((e) => e.resume());
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
    this.hud.showOverlay('GAME OVER', `Score: ${this.score}\n${bestLine}`, 'Space / Enter: play again');
    this.time.delayedCall(RESTART_DELAY_MS, () => {
      this.canRestart = true;
    });
    playGameOver();
  }

  update(_time, delta) {
    if (this.phase === Phase.READY || this.phase === Phase.PLAYING) {
      this.simulate(Math.min(delta, MAX_FRAME_DT_MS));
    }
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

  /**
   * Display state derived from game state. Runs after every physics step, in every phase,
   * so nothing needs a manual reset.
   */
  updateVisuals() {
    const turboLeft = Math.max(0, this.powerupEndsAt - this.clock);
    const turbo = turboLeft > 0 && (turboLeft >= TURBO_BLINK_MS || blinkOn(turboLeft, 100));
    this.dressCar(this.player, 'player', { turbo });
    this.hud.setPowerup(turboLeft / POWERUP_DURATION_MS);
    this.hud.setCombo(this.combo);

    const showCooldowns = this.phase === Phase.PLAYING || this.phase === Phase.PAUSED;
    this.aiCars.getChildren().forEach((ai) => {
      const onCooldown = !cooldownElapsed(this.clock, ai.getData('lastScoredAt'), SCORING_COOLDOWN_MS);
      this.dressCar(ai, ai.getData('base'), { cool: showCooldowns && onCooldown });
    });

    if (this.chest.active) {
      const frame = blinkOn(this.clock, 400) ? 'bonus_chest' : 'bonus_chest_glint';
      if (this.chest.texture.key !== frame) this.chest.setTexture(frame);
    }

    // Fade the HUD plates while a car drives under them; UI blinking runs on scene time so
    // prompts keep blinking while the game is paused or over.
    this.hud.update(this.time.now, [this.player, ...this.aiCars.getChildren()]);
  }

  /**
   * The car's texture for its facing, bob frame, hit flash and `look` (turbo or cooldown),
   * its depth by y (lower cars in front) and its shadow underneath.
   */
  dressCar(car, base, look = {}) {
    const { x: vx, y: vy } = car.body.velocity;
    const moving = Math.hypot(vx, vy) > BOB_MIN_SPEED;
    const frame = moving && !blinkOn(this.clock + car.getData('bobOffset'), BOB_FRAME_MS) ? 1 : 0;
    const flash = this.clock < car.getData('flashUntil');
    const facing = car.getData('facing');
    const key = carTextureKey(base, facing, { ...look, frame, flash });
    if (car.texture.key !== key) car.setTexture(key);
    car.setFlipX(carFlipped(facing));
    car.setDepth(DEPTH.CARS + car.y / this.scale.height);
    car.getData('shadow').setPosition(car.x, car.y + CAR_SHADOW_OFFSET_Y);
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
    this.updateFacing(this.player, input);
    if (acceptInput) this.kickUpDust();
  }

  /** Dust puffs behind the player while driving fast. */
  kickUpDust() {
    const { x: vx, y: vy } = this.playerVelocity;
    const speed = Math.hypot(vx, vy);
    if (speed < DUST_MIN_SPEED || !this.cooledDown('dust', DUST_INTERVAL_MS)) return;
    const behind = CAR_BODY_RADIUS * 0.8;
    this.emitters.dust.emitParticleAt(
      this.player.x - (vx / speed) * behind,
      this.player.y + CAR_SHADOW_OFFSET_Y - (vy / speed) * behind,
      1,
    );
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
      this.updateFacing(ai, ai.body.velocity);
      this.checkStuck(ai);
    });
  }

  updateFacing(car, direction) {
    const facing = facingOf(direction, car.getData('facing'));
    if (facing) car.setData('facing', facing);
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
    this.burst(ai.x, ai.y, 'white', 10, true);
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
    ai.setData('flashUntil', this.clock + HIT_FLASH_MS);
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
    this.burst(contactX, contactY, 'spark', Math.round(4 + 2 * impact));
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
      this.addPoints(SLAM_BONUS, car.x, car.y - 24, `SLAM! +${SLAM_BONUS}`, SLAM_COLOR);
      this.burst(car.x - normal.x * CAR_BODY_RADIUS, car.y - normal.y * CAR_BODY_RADIUS, 'slam', 12);
      this.cameras.main.shake(160, 0.012);
      this.lastAt.shake = this.clock;
      if (this.cooledDown('flash', SLAM_FLASH_COOLDOWN_MS)) this.cameras.main.flash(90, 255, 236, 200);
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
    else {
      const visible = left >= CHEST_BLINK_MS || blinkOn(left, 120);
      this.chest.setVisible(visible);
      this.chestShadow.setVisible(visible);
    }
  }

  spawnChest() {
    const { x, y } = this.findSpawnPoint(CHEST_SPAWN_INSET);
    this.chest.enableBody(true, x, y, true, true);
    this.chestShadow.setPosition(x, y + CHEST_SHADOW_OFFSET_Y).setVisible(true);
    this.chestExpiresAt = this.clock + CHEST_LIFETIME_MS;
    this.tweens.add({ targets: this.chest, y: y - 5, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  hideChest() {
    this.tweens.killTweensOf(this.chest);
    this.chest.disableBody(true, true);
    this.chestShadow.setVisible(false);
    this.nextChestAt = this.clock + CHEST_SPAWN_INTERVAL_MS;
  }

  collectChest() {
    if (!this.chest.active || this.phase !== Phase.PLAYING) return;
    const { x, y } = this.chest;
    this.burst(x, y, 'gold', 14, true);
    this.hideChest();
    this.powerupEndsAt = this.clock + POWERUP_DURATION_MS;
    this.hud.floatText(x, y - 20, 'TURBO!', cssColor(POWERUP_COLOR));
    playPowerup();
  }

  /** Pixel sparks of the named emitter flying out from a point, plus an optional pixel ring "pop". */
  burst(x, y, kind, count, ring = false) {
    this.emitters[kind].explode(count, x, y);
    if (!ring) return;
    const pop = this.add.image(x, y, 'pop_ring').setDepth(DEPTH.EFFECTS).setScale(PIXEL_SCALE);
    this.tweens.add({
      targets: pop,
      scale: PIXEL_SCALE * 2,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => pop.destroy(),
    });
  }
}
