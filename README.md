## Bumper Cars

A simple browser-based bumper cars game with a cozy pixel art vibe inspired by Stardew Valley.

### Framework Choice

We use **Phaser 3** because it provides:
- **Built-in 2D physics** (Arcade) suitable for simple collision and recoil.
- **Scene system** for clean separation of boot/gameplay.
- **Texture manager** that allows loading base64 textures at runtime, which we use for generated pixel art assets.

### Getting Started

Prerequisites: Node.js 18+

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open the browser if it doesn't open automatically: `http://localhost:5173`.

### Controls

- Arrow keys or WASD to drive. The car has momentum, so plan your turns.
- P to pause, R to restart, Space/Enter to play again after a round.

### Gameplay

- Drive into AI cars to score. Each car can only score once every 2 seconds; cars on cooldown are drawn faded.
- Chain hits within 2.5 seconds to build a combo (up to x5). Each hit is worth the current combo.
- Fling a car into the fence right after hitting it for a SLAM bonus.
- Grab the bonus chest before it disappears for a few seconds of turbo: faster driving and harder bumps.
- A round lasts 90 seconds. Your best score is kept in the browser.

### Assets

All assets are generated at runtime in `src/utils/assets.js` using small canvas drawings exported as Base64. They are fed into Phaser's loader as data URLs in `GameScene.preload()`. If you later replace them with real spritesheets, load them in `preload()` and update keys accordingly.

### Tests

Run unit tests:

```bash
npm test
```

The tests cover the pure logic in `src/logic/` and the scene, HUD and sprite wiring with Phaser mocked out.

### Linting

```bash
npm run lint
```


