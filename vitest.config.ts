import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@rubiks-learning/cube-core': fileURLToPath(
        new URL('./packages/cube-core/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    passWithNoTests: true,
  },
});
