import { browser } from '$app/environment';
import { exportHealthDbSnapshot, hasLegacyHealthDbData } from '$lib/core/db/client';
import { postJson } from '$lib/core/http/client';

const MIGRATION_FLAG = 'health-storage-backend-v1-sqlite';

export async function migrateLegacyIndexedDbToSqlite(): Promise<void> {
	if (!browser) return;
	if (import.meta.env.MODE.startsWith('test')) return;
	if (navigator.webdriver) return;
	if (localStorage.getItem(MIGRATION_FLAG) === 'done') return;

	const hasLegacyData = await hasLegacyHealthDbData();
	if (!hasLegacyData) {
		localStorage.setItem(MIGRATION_FLAG, 'done');
		return;
	}

	const snapshot = await exportHealthDbSnapshot();
	await postJson('/api/db/migrate', {
		snapshot
	});
	localStorage.setItem(MIGRATION_FLAG, 'done');
}
