import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['src/tests/**', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});

