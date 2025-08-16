import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 5173,
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.vitest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage'
    }
  },
});


