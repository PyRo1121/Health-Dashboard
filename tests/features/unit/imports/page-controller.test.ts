import { describe, expect, it } from 'vitest';
import type { ImportBatch } from '$lib/core/domain/types';
import type { ImportPayloadSummary } from '$lib/features/imports/service';
import {
  applyImportsManualPayloadEdit,
  clearImportsLoadedPayload,
  commitImportsPage,
  createImportsPageState,
  finalizeImportsManualPayload,
  loadImportsFilePayload,
  loadImportsSamplePayload,
  previewImportsPage,
  refreshImportsPage,
  setImportsPageDragState,
  setImportsPageSourceType,
} from '$lib/features/imports/page-controller';

const READY_SUMMARY: ImportPayloadSummary = {
  inferredSourceType: 'healthkit-companion',
  status: 'ready',
  headline: 'Ready',
  detail: 'Looks valid.',
  itemCount: 3,
  itemLabel: 'records',
};

const STAGED_BATCH: ImportBatch = {
  id: 'batch-1',
  createdAt: '2026-04-02T08:00:00.000Z',
  updatedAt: '2026-04-02T08:00:00.000Z',
  sourceType: 'healthkit-companion',
  status: 'staged',
};

describe('imports page controller', () => {
  it('creates the default page state and updates source/drag state', () => {
    const initial = createImportsPageState();
    expect(initial.loading).toBe(true);
    expect(initial.intake.sourceType).toBe('healthkit-companion');
    expect(setImportsPageSourceType(initial, 'day-one-json').intake.sourceType).toBe(
      'day-one-json'
    );
    expect(setImportsPageDragState(initial, true).isDragActive).toBe(true);
  });

  it('applies manual payload edits and clears loaded payload state', () => {
    const edited = applyImportsManualPayloadEdit(createImportsPageState(), '{"entries":[]}');
    expect(edited.intake.payload).toContain('"entries"');
    expect(edited.intake.isManualAnalysisPending).toBe(true);

    const finalized = finalizeImportsManualPayload(edited, {
      ...READY_SUMMARY,
      inferredSourceType: 'day-one-json',
    });
    expect(finalized.intake.sourceType).toBe('day-one-json');

    const cleared = clearImportsLoadedPayload(finalized);
    expect(cleared.intake.payload).toBe('');
    expect(cleared.intake.payloadSummary).toBeNull();
  });

  it('loads sample and file payloads into intake state', async () => {
    const sampleState = loadImportsSamplePayload(
      createImportsPageState(),
      {
        filename: 'sample-healthkit-bundle.json',
        notice: 'Loaded sample bundle into the import payload.',
        build: () => ({ connector: 'healthkit-ios' }),
      },
      (rawText) => ({
        ...READY_SUMMARY,
        detail: rawText,
      })
    );
    expect(sampleState.intake.selectedFileName).toBe('sample-healthkit-bundle.json');

    const file = new File(['{"connector":"healthkit-ios"}'], 'bundle.json', {
      type: 'application/json',
    });
    const fileState = await loadImportsFilePayload(
      createImportsPageState(),
      file,
      () => READY_SUMMARY
    );
    expect(fileState.intake.selectedFileName).toBe('bundle.json');
    expect(fileState.intake.payloadSummary).toEqual(READY_SUMMARY);
  });

  it('refreshes, previews, and commits through async dependencies', async () => {
    const batches = [{ ...STAGED_BATCH }];
    const refreshed = await refreshImportsPage(createImportsPageState(), async () => batches);
    expect(refreshed.loading).toBe(false);
    expect(refreshed.batches).toEqual(batches);

    const previewed = await previewImportsPage(
      applyImportsManualPayloadEdit(createImportsPageState(), '{"entries":[]}'),
      {
        getOwnerProfile: () => null,
        listImportBatches: async () => batches,
        previewImport: async ({ sourceType }) => ({
          ...STAGED_BATCH,
          sourceType,
        }),
      }
    );
    expect(previewed.intake.latestPreview?.status).toBe('staged');
    expect(previewed.batches).toEqual(batches);

    const committed = await commitImportsPage(
      {
        ...previewed,
        intake: {
          ...previewed.intake,
          latestPreview: STAGED_BATCH,
        },
      },
      {
        listImportBatches: async () => batches,
        commitImportBatch: async (batchId) => {
          expect(batchId).toBe('batch-1');
          return {
            ...STAGED_BATCH,
            status: 'committed',
          };
        },
      }
    );
    expect(committed.intake.latestPreview?.status).toBe('committed');
    expect(committed.intake.saveNotice).toBe('Import committed.');
  });
});
