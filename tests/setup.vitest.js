import { vi } from 'vitest';

// The real Phaser bundle needs a browser; unit tests get a minimal stand-in with just the
// surface the scene uses at import time and in the code under test. Extend it here.
vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    BlendModes: { MULTIPLY: 'MULTIPLY' },
    Math: {
      Between: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),
      FloatBetween: (min, max) => min + Math.random() * (max - min),
    },
  },
}));
