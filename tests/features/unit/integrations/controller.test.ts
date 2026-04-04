import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { loadIntegrationsPage } from '$lib/features/integrations/controller';
import { commitImportBatch, previewImport } from '$lib/features/imports/service';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';

describe('integrations controller', () => {
	const getDb = useTestHealthDb('integrations-page-controller');

	it('loads integrations controller state from imported events', async () => {
		const db = getDb();
		const batch = await previewImport(db, {
			sourceType: 'healthkit-companion',
			rawText: HEALTHKIT_BUNDLE_JSON
		});
		await commitImportBatch(db, batch.id);

		const state = await loadIntegrationsPage(db);
		expect(state.loading).toBe(false);
		expect(state.summary.importedEvents).toBe(3);
	});
});
