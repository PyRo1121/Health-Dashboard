import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'component',
      environment: 'jsdom',
      include: ['tests/core/component/**/*.spec.ts', 'tests/features/component/**/*.spec.ts'],
      expect: { requireAssertions: true },
      setupFiles: ['tests/support/setup.ts'],
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        exclude: ['tests/**', '**/*.d.ts', 'vite.config.*', 'vitest.*.config.ts'],
      },
    },
  })
);
