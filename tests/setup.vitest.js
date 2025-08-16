// Minimal Phaser global shim to allow importing scene files in unit tests without a browser
// Extend in specific tests if they need more surface area
global.Phaser = global.Phaser || {
  BlendModes: { MULTIPLY: 'MULTIPLY' },
  Math: {
    Between: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),
    FloatBetween: (min, max) => min + Math.random() * (max - min),
  },
};


