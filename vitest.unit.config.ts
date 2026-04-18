import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'unit',
      environment: 'node',
      include: ['tests/core/unit/**/*.test.ts', 'tests/features/unit/**/*.test.ts'],
      expect: { requireAssertions: true },
      setupFiles: ['tests/support/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        exclude: [
          '.github/**',
          'scripts/**',
          'tests/**',
          '**/*.d.ts',
          'vite.config.*',
          'vitest.*.config.ts',
        ],
      },
    },
  })
);
