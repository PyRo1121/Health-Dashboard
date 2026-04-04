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
			setupFiles: ['tests/support/setup.ts']
		}
	})
);
