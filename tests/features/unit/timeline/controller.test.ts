import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  createTimelinePageState,
  loadTimelinePage,
  setTimelineFilter,
} from '$lib/features/timeline/controller';
import { commitImportBatch, previewImport } from '$lib/features/imports/store';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';

describe('timeline controller', () => {
  const getDb = useTestHealthDb();

  it('loads timeline controller state from imported events', async () => {
    const db = getDb();
    const batch = await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    await commitImportBatch(db, batch.id);

    let state = setTimelineFilter(createTimelinePageState(), 'native-companion');
    state = await loadTimelinePage(db, state);
    expect(state.loading).toBe(false);
    expect(state.items).toHaveLength(3);
  });
});
