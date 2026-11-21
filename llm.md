# Bumper Cars Project Context

## Project Overview
"Bumper Cars" is a browser-based arcade game built with **Phaser 3**. It features a "cozy" pixel art aesthetic inspired by Stardew Valley. The game involves driving a bumper car in an enclosed arena, bumping into AI cars to score points within a time limit.

## Tech Stack
- **Runtime:** Browser (Vanilla JS + Phaser 3)
- **Build Tool:** Vite
- **Testing:** Vitest
- **Linting:** ESLint

## Key Commands
- **Start Dev Server:** `npm run dev` (runs on http://localhost:5173)
- **Run Tests:** `npm test` (runs Vitest with coverage)
- **Lint Code:** `npm run lint`

## Project Structure
- `src/`
  - `config/` - Constants and configuration (`constants.js`)
  - `logic/` - Pure logic, decoupled from Phaser for easier testing: scoring, combos and spawning (`gameLogic.js`), driving and collision response (`physics.js`)
  - `scenes/` - Phaser Scenes (`GameScene.js` handles the round flow, input and physics wiring)
  - `sprites/` - Phaser GameObjects/Sprites (`Car.js`)
  - `ui/` - HUD and overlays (`Hud.js`)
  - `utils/` - **Runtime asset generation** (`assets.js`), synthesized sounds (`audio.js`), best-score storage (`highScore.js`)
  - `main.js` - Game entry point and config
- `tests/` - Unit and integration tests mirroring the src structure

## Architectural Patterns
1.  **Runtime Asset Generation:**
    -   There are NO external image files. All assets (cars, floor, fences) are generated programmatically via Canvas API in `src/utils/assets.js` and loaded as base64 textures.
    -   **Do not add static image files.** Modify `assets.js` to change visuals.

2.  **Logic Separation:**
    -   Core math and scoring logic reside in `src/logic/gameLogic.js`.
    -   `GameScene.js` handles the Phaser-specific implementation (physics, input, rendering).
    -   Keep logic pure where possible to facilitate testing.

3.  **Physics:**
    -   Uses **Phaser Arcade Physics**; the arena is the world bounds (`worldbounds` event), there are no wall bodies.
    -   AI cars live in a plain `this.add.group()`: adding a sprite to an Arcade *physics* group re-applies the group's body defaults and would wipe what `createCarSprite` set up.
    -   Drag and steering are computed in `logic/physics.js`, not by Arcade drag. Car collision callbacks overwrite velocities with the results of `playerBump` / `aiBump`.

4.  **State Management:**
    -   `GameScene.phase` is one of `ready` (title), `playing`, `paused`, `over`.
    -   All gameplay timing uses `GameScene.clock`, milliseconds of unpaused play advanced in `update()`, so pausing needs no timer bookkeeping. Don't use `this.time.now` for gameplay timers.

## Code Style & Conventions
-   **ES Modules:** Use `import`/`export` syntax.
-   **Formatting:** Follow standard JS conventions. Semicolons are used.
-   **Variables:** `const` for constants, `let` for mutables. Avoid `var`.
-   **Comments:** JSDoc style for functions is encouraged but not strictly enforced if code is self-explanatory.
-   **Linter:** Ensure code passes `npm run lint` before finishing tasks.

## Testing Strategy
-   **Unit Tests:** Focus on `src/logic/` and `src/utils/`.
-   **Integration Tests:** Verify Scene setup and physics interactions where possible.
-   **Mocking:** The `canvas` context is often mocked in tests for asset generation checks.
