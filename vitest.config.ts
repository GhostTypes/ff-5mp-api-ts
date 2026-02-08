import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/firmware-test.ts'],
      thresholds: {
        branches: 40,
        functions: 20,
        lines: 30,
        statements: 30,
      },
    },
  },
});
