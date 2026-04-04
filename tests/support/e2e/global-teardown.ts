import { rmSync } from 'node:fs';

const paths = [
	'/tmp/personal-health-cockpit-playwright.sqlite',
	'/tmp/personal-health-cockpit-playwright.sqlite-shm',
	'/tmp/personal-health-cockpit-playwright.sqlite-wal',
	'.playwright-mode'
];

export default async function globalTeardown() {
	for (const path of paths) {
		rmSync(path, { force: true });
	}
}
