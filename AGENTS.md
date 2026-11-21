# Bumper Cars

A browser arcade game built with **Phaser 3** (Arcade Physics), **Vite**, **Vitest** and **ESLint**, written in vanilla JavaScript ES modules. The player drives a bumper car around a fenced arena and scores by ramming wandering AI cars before a 90-second round ends. The look is cozy pixel art; every image and sound is generated at runtime.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:5173) |
| Tests with coverage | `npm test` |
| Tests in watch mode | `npm run test:watch` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

A change is done when `npm test`, `npm run lint` and `npm run build` all pass and the game has been played in a browser (see *Verifying in the browser*).

## Layout

```
src/
  main.js            Phaser.Game config; waits briefly for the pixel font, then boots
  config/constants.js  every tunable number, colour and render depth
  logic/             pure functions, no Phaser: unit-test these
    physics.js       steering, drag, facing, player/AI bump and wall-bounce responses
    gameLogic.js     cooldowns, combos, blinking, countdown seconds, free spawn points
  scenes/GameScene.js  round flow, input, physics wiring, effects
  ui/Hud.js          score, timer, combo, turbo bar, overlay, floating text
  sprites/Car.js     car sprite with a circular body confined to the arena
  utils/
    assets.js        canvas-drawn textures as data URLs
    audio.js         Web Audio synthesized sound effects
    highScore.js     best score in localStorage, failure-tolerant
tests/               one file per module; setup.vitest.js shims the Phaser global
```

## How the game works

- **Phases.** `GameScene.phase` is `ready` (title screen; AI cars roam), `playing`, `paused` or `over`. Each key press goes through `handleCommand`, which switches on the phase.
- **One clock.** `GameScene.clock` counts milliseconds of unpaused play and advances only in `simulate()`. Every gameplay timer is a deadline on it (`roundEndsAt`, `nextChestAt`, `powerupEndsAt`, per-car `lastScoredAt`/`dirChangeAt`), so pausing needs no bookkeeping. Don't use `this.time.now` or Phaser timers for gameplay.
- **Simulation vs. presentation.** `update()` runs `simulate()` only in `ready`/`playing`, and `updateVisuals()` in every phase. Tint, turbo bar, combo label and cooldown fading are derived from state there, so phase changes alter state (e.g. `powerupEndsAt = clock`), never the visuals directly.
- **Scoring.** A hit counts only if the player drove into the car (`SCORE_MIN_CLOSING_SPEED`) and that car is off its cooldown. Hits within `COMBO_WINDOW_MS` raise the multiplier. A flung car that hits the fence within `SLAM_WINDOW_MS` adds a slam bonus.
- **Tuning** lives entirely in `constants.js`. Change numbers there, not inline.

## Phaser gotchas (each one has bitten this codebase)

- **Never put cars in an Arcade *physics* group.** `physics.add.group()` re-applies its body defaults (bounce, world-bounds collision, drag…) to every sprite added, silently wiping what `createCarSprite` set. That once let AI cars drive off screen. AI cars use a plain `this.add.group()`, which colliders accept.
- **The arena is the world bounds.** There are no wall bodies. Fence hits arrive through the `worldbounds` event, because `createCarSprite` sets `body.onWorldBounds`.
- **Read the player's velocity from `playerVelocity`, not the body, in collide callbacks.** Arcade rewrites both bodies' velocities while separating them, before the callback runs.
- **Text is rasterized once.** That's why `main.js` waits for the web font before booting (with a timeout). Prefer reusing Text objects (`Hud.floatText` pools them) over creating one per event, and avoid `setColor`/`setText` calls that don't change anything.
- **`Phaser` is a global** in scene, HUD and sprite files. Importing `phaser` in `main.js` sets it up. Only `main.js` imports the package.
- `scene.restart()` rebuilds the physics world and resets the tween manager and keyboard listeners; nothing from the previous round needs manual cleanup.

## Conventions

- Keep `src/logic/` free of Phaser so it stays unit-testable. Put new math or rules there and call it from the scene.
- **No static asset files.** Draw images in `assets.js` and synthesize sounds in `audio.js`.
- ES modules, semicolons, `const` by default, max line length 120 (lint warns). Comment why, not what; document only non-obvious functions.
- Commit messages: short lowercase imperative summary (`add sound effects`, `update deps`), with an optional body.
- Phaser is pinned to 3.x. Moving to Phaser 4 is a separate migration (new renderer, API changes).

## Testing

- Pure modules (`logic/`, `highScore.js`) get direct unit tests, with table-style `it.each` where it fits.
- Scene, HUD and sprite tests build the object and stub only what it touches: mock cars with a `Map` behind `getData`/`setData`, a stub `hud`, `tweens`, `cameras` and so on (see `createScene()` in `tests/gameScene.test.js`). Set `scene.clock` instead of faking time.
- The Phaser global shim lives in `tests/setup.vitest.js`; extend it there rather than per file. `vi.mock` must sit at module top level (Vitest 5).
- Don't write tests that only re-assert constant values or exercise a mock.

## Verifying in the browser

Start the dev server and play: title screen, a round, pause (P), restart (R), game over, play again. Also resize the window, since the canvas uses `Scale.FIT`.

To inspect live state from a browser automation tool:
- Inject a `<script type="module">` that imports the page's own entry URL (read it from `script[src*="/src/main.js"]`; Vite appends `?t=…` after HMR). Then `await gameReady` and `game.scene.getScene('GameScene')`. Importing a different URL boots a second game.
- A hidden or backgrounded page runs at a few fps, and `MAX_FRAME_DT_MS` then slows game time. For reliable numbers, call `game.loop.sleep()` and step frames yourself with `game.step(t, 1000 / 60)`, setting `scene.cursors.*.isDown` to drive.
