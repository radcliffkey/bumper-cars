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
  - `logic/` - Pure game logic, decoupled from Phaser for easier testing (`gameLogic.js`)
  - `scenes/` - Phaser Scenes (e.g., `GameScene.js` handles the main loop, input, and physics)
  - `sprites/` - Phaser GameObjects/Sprites (`Car.js`)
  - `utils/` - Helpers, specifically **runtime asset generation** (`assets.js`)
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
    -   Uses **Phaser Arcade Physics**.
    -   Custom collision resolution (`handleCarCollision` in `GameScene.js`) implements billiard-like bounce physics with vector math, rather than relying solely on Arcade Physics default bounce.

4.  **State Management:**
    -   Game state (score, time, paused) is managed directly within `GameScene`.

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
