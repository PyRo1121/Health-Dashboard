import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { loadIntegrationsPage } from '$lib/features/integrations/controller';
import { commitImportBatch, previewImport } from '$lib/features/imports/store';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';

describe('integrations controller', () => {
  const getDb = useTestHealthDb();

  it('loads integrations controller state from imported events', async () => {
    const db = getDb();
    await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    await commitImportBatch(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });

    const state = await loadIntegrationsPage(db);
    expect(state.loading).toBe(false);
    expect(state.summary.importedEvents).toBe(3);
  });
});
