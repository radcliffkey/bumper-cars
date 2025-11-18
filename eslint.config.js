import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ["dist/"]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        Phaser: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "max-len": ["warn", { "code": 120, "tabWidth": 2, "ignoreStrings": true, "ignoreTemplateLiterals": true, "ignoreComments": true }]
    }
  },
  {
    files: ["tests/**/*.js", "**/*.test.js"],
    languageOptions: {
      globals: {
        global: "writable",
        globalThis: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        vi: "readonly"
      }
    }
  }
];

