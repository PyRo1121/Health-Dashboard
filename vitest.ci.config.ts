import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'ci-config',
      environment: 'node',
      include: ['tests/ci/**/*.test.ts'],
      expect: { requireAssertions: true },
    },
  })
);
