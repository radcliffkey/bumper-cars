import { createCarSprite } from '../sprites/Car.js';
import { generatePixelAssets } from '../utils/assets.js';
import { canScoreHit } from '../logic/gameLogic.js';
import {
  ARENA_MARGIN,
  WALL_THICKNESS,
  GAME_DURATION_SECONDS,
  PLAYER_MAX_SPEED,
  AI_BASE_SPEED,
  RECOIL_FORCE,
  UI_FONT_FAMILY,
  AI_DIRECTION_INTERVAL_MS_BASE,
  AI_DIRECTION_INTERVAL_MS_JITTER,
  SCORING_COOLDOWN_MS,
} from '../config/constants.js';

const ARENA_PADDING = ARENA_MARGIN * 2; // inner padding for spawning

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.score = 0;
    this.timeLeft = GAME_DURATION_SECONDS;
    this.gameOver = false;
    this.player = null;
    this.aiCars = null;
    this.walls = null;
  }

  preload() {
    // Generate base64 pixel-art textures at runtime and add to texture manager
    const assets = generatePixelAssets();
    Object.keys(assets).forEach((key) => {
      // Use Loader with data URLs so preload waits for decoding
      this.load.image(key, assets[key]);
    });
  }

  create() {
    const { width, height } = this.scale;

    // Reset state when the scene restarts (constructor does not run on restart)
    this.score = 0;
    this.timeLeft = GAME_DURATION_SECONDS;
    this.gameOver = false;

    // Floor: layered wood + subtle noise for texture
    const floor = this.add.tileSprite(0, 0, width, height, 'floor_wood').setOrigin(0, 0);
    floor.setDepth(0);
    const floorNoise = this.add.tileSprite(0, 0, width, height, 'floor_noise').setOrigin(0, 0);
    floorNoise.setBlendMode(Phaser.BlendModes.MULTIPLY);
    floorNoise.setAlpha(0.35);
    floorNoise.setDepth(0.1);

    // Fence borders (visual only; collisions use world bounds)
    const topFence = this.add.tileSprite(0, 0, width, ARENA_MARGIN, 'fence_tile').setOrigin(0, 0);
    const bottomFence = this.add.tileSprite(0, height - ARENA_MARGIN, width, ARENA_MARGIN, 'fence_tile').setOrigin(0, 0);
    const leftFence = this.add.tileSprite(0, 0, ARENA_MARGIN, height, 'fence_tile').setOrigin(0, 0);
    const rightFence = this.add.tileSprite(width - ARENA_MARGIN, 0, ARENA_MARGIN, height, 'fence_tile').setOrigin(0, 0);
    topFence.setDepth(1);
    bottomFence.setDepth(1);
    leftFence.setDepth(1);
    rightFence.setDepth(1);

    // Physics world bounds inside the fence
    this.physics.world.setBounds(ARENA_MARGIN, ARENA_MARGIN, width - ARENA_MARGIN * 2, height - ARENA_MARGIN * 2);
    this.physics.world.setBoundsCollision(true, true, true, true);

    // Invisible physics walls to guarantee containment and bounce
    this.walls = this.physics.add.staticGroup();
    const innerWidth = width - ARENA_MARGIN * 2;
    const innerHeight = height - ARENA_MARGIN * 2;
    const wallThickness = WALL_THICKNESS;
    const topWall = this.add
      .rectangle(ARENA_MARGIN + innerWidth / 2, ARENA_MARGIN, innerWidth, wallThickness, 0x000000, 0)
      .setOrigin(0.5);
    const bottomWall = this.add
      .rectangle(
        ARENA_MARGIN + innerWidth / 2,
        ARENA_MARGIN + innerHeight,
        innerWidth,
        wallThickness,
        0x000000,
        0,
      )
      .setOrigin(0.5);
    const leftWall = this.add
      .rectangle(ARENA_MARGIN, ARENA_MARGIN + innerHeight / 2, wallThickness, innerHeight, 0x000000, 0)
      .setOrigin(0.5);
    const rightWall = this.add
      .rectangle(
        ARENA_MARGIN + innerWidth,
        ARENA_MARGIN + innerHeight / 2,
        wallThickness,
        innerHeight,
        0x000000,
        0,
      )
      .setOrigin(0.5);
    this.physics.add.existing(topWall, true);
    this.physics.add.existing(bottomWall, true);
    this.physics.add.existing(leftWall, true);
    this.physics.add.existing(rightWall, true);
    // Encode surface normals for billiard-like reflection
    topWall.setData('nx', 0).setData('ny', 1);
    bottomWall.setData('nx', 0).setData('ny', -1);
    leftWall.setData('nx', 1).setData('ny', 0);
    rightWall.setData('nx', -1).setData('ny', 0);
    this.walls.addMultiple([topWall, bottomWall, leftWall, rightWall]);

    // Player
    this.player = createCarSprite(this, width / 2, height / 2, 'player_down');
    this.player.setCollideWorldBounds(true);
    this.player.body.onWorldBounds = true;
    this.player.setBounce(0);
    this.player.setDepth(2);
    this.player.setData('lastDir', 'down');
    this.cursors = this.input.keyboard.createCursorKeys();

    // AI cars
    this.aiCars = this.physics.add.group();
    const aiCount = 10;
    for (let i = 0; i < aiCount; i += 1) {
      const base = `ai${i % 10}`;
      const ai = createCarSprite(
        this,
        Phaser.Math.Between(ARENA_PADDING, width - ARENA_PADDING),
        Phaser.Math.Between(ARENA_PADDING, height - ARENA_PADDING),
        `${base}_down`,
      );
      ai.setCollideWorldBounds(true);
      ai.body.onWorldBounds = true;
      ai.setBounce(0);
      ai.setData('ai', true);
      ai.setData('dirChangeAt', 0);
      ai.setData('base', base);
      ai.setData('lastScoredAt', null);
      ai.setDepth(2);
      this.aiCars.add(ai);
    }

    // Collisions
    this.physics.add.collider(this.player, this.walls, this.handleWallCollision, undefined, this);
    this.physics.add.collider(this.aiCars, this.walls, this.handleWallCollision, undefined, this);
    // Apply billiard-like impulse transfer for car-to-car collisions
    this.physics.add.collider(this.player, this.aiCars, this.handleCarCollision, undefined, this);
    this.physics.add.collider(this.aiCars, this.aiCars, this.handleCarCollision, undefined, this);

    // UI
    this.scoreText = this.add.text(12, 8, 'Score: 0', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '12px',
      color: '#ffe6a7',
      stroke: '#5a3e2b',
      strokeThickness: 2,
      padding: { x: 2, y: 2 },
    }).setDepth(100).setScrollFactor(0);
    this.timerText = this.add.text(width - 160, 8, 'Time: 60', {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '12px',
      color: '#ffe6a7',
      stroke: '#5a3e2b',
      strokeThickness: 2,
      padding: { x: 2, y: 2 },
    }).setDepth(100).setScrollFactor(0);

    this.time.addEvent({ delay: 1000, loop: true, callback: this.tickTimer, callbackScope: this });

    // Respond to world bounds just in case; pick a new inward direction
    this.physics.world.on('worldbounds', (body) => {
      const obj = body.gameObject;
      if (!obj) return;
      // Do not randomize car directions; wall collisions handle reflection
      const isCar = (obj.getData && obj.getData('ai')) || obj === this.player;
      if (isCar) return;
    });

    // Ensure web font is applied once loaded
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.scoreText.setFontFamily(UI_FONT_FAMILY);
        this.timerText.setFontFamily(UI_FONT_FAMILY);
      });
    }
  }

  tickTimer() {
    if (this.gameOver) return;
    this.timeLeft -= 1;
    this.timerText.setText(`Time: ${this.timeLeft}`);
    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  endGame() {
    this.gameOver = true;
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      `Game Over!\nScore: ${this.score}\nPress Space or Enter to restart`,
      {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 20,
      color: '#fff5d6',
      align: 'center',
      stroke: '#5a3e2b',
      strokeThickness: 3,
      padding: { x: 4, y: 4 },
    }
    ).setOrigin(0.5).setDepth(200);
    this.player.setVelocity(0, 0);
    this.aiCars.children.iterate((ai) => ai.setVelocity(0, 0));

    // Allow quick restart using Space or Enter
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart();
    });
    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.restart();
    });
  }

  handleCarCollision(a, b) {
    if (this.gameOver) return;
    if (!a || !b || !a.body || !b.body) return;

    // Compute normalized collision normal from a -> b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distSq = dx * dx + dy * dy;
    if (distSq === 0) return; // avoid division by zero
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    // Tangent vector (perpendicular)
    const tx = -ny;
    const ty = nx;

    // Classification
    const aIsAi = a.getData && a.getData('ai');
    const bIsAi = b.getData && b.getData('ai');
    const aIsPlayer = !aIsAi;
    const bIsPlayer = !bIsAi;

    // If a player is involved, use strong impulse (fling effect)
    if ((aIsPlayer && bIsAi) || (bIsPlayer && aIsAi)) {
      const playerObj = aIsPlayer ? a : b;
      const aiObj = aIsPlayer ? b : a;
      const p2a_dx = aiObj.x - playerObj.x;
      const p2a_dy = aiObj.y - playerObj.y;
      const p2a_lenSq = p2a_dx * p2a_dx + p2a_dy * p2a_dy;
      // Scale impulse by player's incoming speed for a stronger, speed-dependent fling
      const pvx = playerObj.body.velocity.x || 0;
      const pvy = playerObj.body.velocity.y || 0;
      const playerSpeed = Math.sqrt(pvx * pvx + pvy * pvy);
      const recoil = Math.max(RECOIL_FORCE, playerSpeed * 1.1);
      if (p2a_lenSq > 0) {
        const p2a_len = Math.sqrt(p2a_lenSq);
        const pnx = p2a_dx / p2a_len;
        const pny = p2a_dy / p2a_len;
        aiObj.setVelocity(pnx * recoil, pny * recoil);
        playerObj.setVelocity(-pnx * recoil, -pny * recoil);
      } else {
        // fallback to collision normal
        aiObj.setVelocity(nx * recoil, ny * recoil);
        playerObj.setVelocity(-nx * recoil, -ny * recoil);
      }
    } else {
      // AI vs AI: billiard-like impulse exchange with extra outward impulse and minimum bump speed
      const vax = a.body.velocity.x;
      const vay = a.body.velocity.y;
      const vbx = b.body.velocity.x;
      const vby = b.body.velocity.y;

      const va_n = vax * nx + vay * ny;
      const va_t = vax * tx + vay * ty;
      const vb_n = vbx * nx + vby * ny;
      const vb_t = vbx * tx + vby * ty;

      const minBump = Math.max(80, RECOIL_FORCE * 0.5);
      if (va_n - vb_n > 0) {
        const va_n_prime = vb_n;
        const vb_n_prime = va_n;

        let vax_prime = va_n_prime * nx + va_t * tx;
        let vay_prime = va_n_prime * ny + va_t * ty;
        let vbx_prime = vb_n_prime * nx + vb_t * tx;
        let vby_prime = vb_n_prime * ny + vb_t * ty;

        // Add outward impulse proportional to closing speed to exaggerate fling
        const closingSpeed = Math.abs(va_n - vb_n);
        const impulse = Math.max(RECOIL_FORCE * 0.8, closingSpeed * 1.2);
        vax_prime -= nx * impulse;
        vay_prime -= ny * impulse;
        vbx_prime += nx * impulse;
        vby_prime += ny * impulse;

        // Ensure a minimum bump speed so they don't stall
        const aSpeed = Math.hypot(vax_prime, vay_prime);
        const bSpeed = Math.hypot(vbx_prime, vby_prime);
        if (aSpeed < minBump) {
          const boost = minBump - aSpeed;
          vax_prime -= nx * boost;
          vay_prime -= ny * boost;
        }
        if (bSpeed < minBump) {
          const boost = minBump - bSpeed;
          vbx_prime += nx * boost;
          vby_prime += ny * boost;
        }

        a.setVelocity(vax_prime, vay_prime);
        b.setVelocity(vbx_prime, vby_prime);
      } else {
        // Not closing, but still overlapping or grazing: nudge apart to avoid sticking
        const nudge = minBump;
        a.setVelocity(a.body.velocity.x - nx * nudge, a.body.velocity.y - ny * nudge);
        b.setVelocity(b.body.velocity.x + nx * nudge, b.body.velocity.y + ny * nudge);
      }
    }

    // Scoring: if player hits an AI, award point with cooldown
    const now = this.time.now;

    if (aIsPlayer && bIsAi) {
      const lastScoredAt = b.getData('lastScoredAt');
      if (canScoreHit(now, lastScoredAt, SCORING_COOLDOWN_MS)) {
        b.setData('lastScoredAt', now);
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
      }
    } else if (bIsPlayer && aIsAi) {
      const lastScoredAt = a.getData('lastScoredAt');
      if (canScoreHit(now, lastScoredAt, SCORING_COOLDOWN_MS)) {
        a.setData('lastScoredAt', now);
        this.score += 1;
        this.scoreText.setText(`Score: ${this.score}`);
      }
    }
  }

  handleWallCollision(car, wall) {
    if (this.gameOver) return;
    if (!car || !car.body) return;
    const vx = car.body.velocity.x || 0;
    const vy = car.body.velocity.y || 0;
    // Get wall normal from metadata or infer by orientation
    let nx = wall.getData && wall.getData('nx');
    let ny = wall.getData && wall.getData('ny');
    if (typeof nx !== 'number' || typeof ny !== 'number') {
      if ((wall.width || 0) > (wall.height || 0)) {
        // horizontal wall
        ny = car.y < wall.y ? -1 : 1;
        nx = 0;
      } else {
        // vertical wall
        nx = car.x < wall.x ? -1 : 1;
        ny = 0;
      }
    }
    // Reflect velocity across wall normal: v' = v - 2*(v·n)*n
    const dot = vx * nx + vy * ny;
    let rx = vx - 2 * dot * nx;
    let ry = vy - 2 * dot * ny;
    // Ensure a minimum speed away from the wall
    const minWallBump = Math.max(120, RECOIL_FORCE * 0.8);
    const speed = Math.hypot(rx, ry);
    if (speed < minWallBump) {
      // If nearly zero, go straight along tangent if dot ~ 0 else along reflected normal
      if (Math.abs(dot) > 0.01) {
        rx = -nx * minWallBump;
        ry = -ny * minWallBump;
      } else {
        // Use a tangent direction to avoid re-penetration
        const tx = -ny;
        const ty = nx;
        rx = tx * minWallBump;
        ry = ty * minWallBump;
      }
    }
    car.setVelocity(rx, ry);
    // Slightly separate from wall to avoid sticking
    car.x += nx * 2;
    car.y += ny * 2;
  }

  update(time, _delta) {
    if (this.gameOver) return;

    // player controls
    const speed = PLAYER_MAX_SPEED;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown) vx -= speed;
    if (this.cursors.right.isDown) vx += speed;
    if (this.cursors.up.isDown) vy -= speed;
    if (this.cursors.down.isDown) vy += speed;
    this.player.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      if (dir !== this.player.getData('lastDir')) {
        this.player.setTexture(`player_${dir}`);
        this.player.setData('lastDir', dir);
      }
    }

    // AI logic: change direction periodically and on wall hits
    this.aiCars.children.iterate((ai) => {
      if (!ai) return;
      const now = time;
      const changeInterval = AI_DIRECTION_INTERVAL_MS_BASE + Phaser.Math.Between(0, AI_DIRECTION_INTERVAL_MS_JITTER);
      if (now > ai.getData('dirChangeAt')) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const aiSpeed = AI_BASE_SPEED;
        ai.setVelocity(Math.cos(angle) * aiSpeed, Math.sin(angle) * aiSpeed);
        ai.setData('dirChangeAt', now + changeInterval);
      }
      if (ai.body && (ai.body.velocity.x !== 0 || ai.body.velocity.y !== 0)) {
        const dir = Math.abs(ai.body.velocity.x) > Math.abs(ai.body.velocity.y)
          ? (ai.body.velocity.x > 0 ? 'right' : 'left')
          : (ai.body.velocity.y > 0 ? 'down' : 'up');
        const base = ai.getData('base');
        const desired = `${base}_${dir}`;
        if (ai.texture.key !== desired) ai.setTexture(desired);
      }

      // Clamp inside bounds and nudge inward if necessary
      const minX = 16 + 12;
      const maxX = this.scale.width - 16 - 12;
      const minY = 16 + 12;
      const maxY = this.scale.height - 16 - 12;
      if (ai.x < minX) {
        ai.x = minX;
        ai.setVelocity(Math.abs(ai.body.velocity.x), ai.body.velocity.y);
      } else if (ai.x > maxX) {
        ai.x = maxX;
        ai.setVelocity(-Math.abs(ai.body.velocity.x), ai.body.velocity.y);
      }
      if (ai.y < minY) {
        ai.y = minY;
        ai.setVelocity(ai.body.velocity.x, Math.abs(ai.body.velocity.y));
      } else if (ai.y > maxY) {
        ai.y = maxY;
        ai.setVelocity(ai.body.velocity.x, -Math.abs(ai.body.velocity.y));
      }
    });
  }
}


