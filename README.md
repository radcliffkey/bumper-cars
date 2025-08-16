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

- Arrow keys to drive.

### Gameplay

- Bump AI cars to gain points.
- Timer counts down from 60s; when it reaches zero, the game ends and shows your final score.

### Assets

All assets are generated at runtime in `src/utils/assets.js` using small canvas drawings exported as Base64. They are fed into Phaser's texture manager with `textures.addBase64`. If you later replace them with real spritesheets, load them in `preload()` and update keys accordingly.

### Tests

Run unit tests:

```bash
npm test
```

The tests cover pure logic in `src/logic/gameLogic.js`.

### Linting

```bash
npm run lint
```


