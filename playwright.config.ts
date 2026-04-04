import { defineConfig } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
	testDir: 'tests',
	testMatch: ['core/e2e/**/*.e2e.ts', 'features/e2e/**/*.e2e.ts'],
	globalTeardown: './tests/support/e2e/global-teardown.ts',
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
	retries: isCi ? 1 : 0,
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:4173',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	webServer: {
		command:
			'rm -f /tmp/personal-health-cockpit-playwright.sqlite .playwright-mode && ' +
			'touch .playwright-mode && ' +
			'bun run build && bun run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: false
	}
});
