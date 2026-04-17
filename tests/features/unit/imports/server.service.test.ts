import { afterEach, describe, expect, it, vi } from 'vitest';

describe('imports server service', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/schema');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.doUnmock('$lib/server/review/service');
    vi.doUnmock('$lib/features/imports/analyze');
    vi.doUnmock('$lib/features/imports/parsers');
    vi.doUnmock('$lib/features/integrations/connectors/healthkit');
    vi.doUnmock('$lib/features/integrations/connectors/smart-fhir');
    vi.doUnmock('$lib/features/integrations/identity/patient-match');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('keeps import preview ephemeral without writing batches or artifacts', async () => {
    const transaction = vi.fn((callback: (tx: { mocked: true }) => unknown) => callback({ mocked: true }));
    const upsertMirrorRecord = vi.fn();
    const upsertMirrorRecords = vi.fn();

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { transaction } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { importBatches: {}, importArtifacts: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords: vi.fn(async () => []),
      selectMirrorRecordById: vi.fn(async () => undefined),
      selectMirrorRecordsByField: vi.fn(async () => []),
      selectMirrorRecordsByFieldValues: vi.fn(async () => []),
      upsertMirrorRecord,
      upsertMirrorRecordSync: upsertMirrorRecord,
      upsertMirrorRecords,
      upsertMirrorRecordsSync: upsertMirrorRecords,
    }));
    vi.doMock('$lib/server/review/service', () => ({
      refreshWeeklyReviewArtifactsForDaysServer: vi.fn(),
    }));
    vi.doMock('$lib/features/imports/analyze', () => ({
      analyzeImportPayload: vi.fn(() => ({
        sourceType: 'day-one-json',
        summary: {
          status: 'ready',
        },
        journalEntries: [
          {
            id: 'entry-1',
            createdAt: '2026-04-02T09:00:00Z',
            updatedAt: '2026-04-02T09:00:00Z',
            localDay: '2026-04-02',
            entryType: 'freeform',
            body: 'Morning reflection',
            tags: [],
            linkedEventIds: [],
          },
        ],
      })),
    }));
    vi.doMock('$lib/features/imports/parsers', () => ({
      parseAppleHealthXml: vi.fn(),
      parseDayOneExport: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/connectors/healthkit', () => ({
      importHealthKitCompanionBundle: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/connectors/smart-fhir', () => ({
      importSmartFhirSandboxBundle: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/identity/patient-match', () => ({
      resolveClinicalPatientMatch: vi.fn(),
    }));

    const { previewImportServer } =
      await import('../../../../src/lib/server/imports/service.ts');

    await previewImportServer({
      sourceType: 'day-one-json',
      rawText: '{"entries":[]}',
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(upsertMirrorRecord).not.toHaveBeenCalled();
    expect(upsertMirrorRecords).not.toHaveBeenCalled();
  });

  it('does not refresh review artifacts if import commit persistence fails inside the transaction', async () => {
    const transaction = vi.fn((callback: (tx: { mocked: true }) => unknown) => callback({ mocked: true }));
    const upsertMirrorRecord = vi.fn(() => {
      throw new Error('write failed');
    });
    const refreshWeeklyReviewArtifactsForDaysServer = vi.fn();

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { transaction } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { importBatches: {}, importArtifacts: {}, healthEvents: {}, journalEntries: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords: vi.fn(async () => []),
      selectMirrorRecordById: vi.fn(async () => ({
        id: 'batch-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        sourceType: 'healthkit-companion',
        status: 'staged',
      })),
      selectMirrorRecordsByField: vi.fn(async () => [
        {
          id: 'artifact-1',
          batchId: 'batch-1',
          artifactType: 'healthEvent',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          fingerprint: 'fp-1',
          payload: {
            id: 'event-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            localDay: '2026-04-02',
            sourceType: 'import',
            sourceApp: 'Test',
            confidence: 1,
            eventType: 'step-count',
            value: 1000,
          },
          recordJson: '',
        },
      ]),
      selectMirrorRecordsByFieldValues: vi.fn(async () => []),
      upsertMirrorRecord,
      upsertMirrorRecordSync: upsertMirrorRecord,
      upsertMirrorRecords: vi.fn(),
      upsertMirrorRecordsSync: vi.fn(),
    }));
    vi.doMock('$lib/server/review/service', () => ({
      refreshWeeklyReviewArtifactsForDaysServer,
    }));
    vi.doMock('$lib/features/imports/analyze', () => ({
      analyzeImportPayload: vi.fn(() => ({
        sourceType: 'healthkit-companion',
        summary: { status: 'ready' },
        healthEvents: [
          {
            id: 'event-1',
            createdAt: '2026-04-02T08:00:00.000Z',
            updatedAt: '2026-04-02T08:00:00.000Z',
            localDay: '2026-04-02',
            sourceType: 'import',
            sourceApp: 'Test',
            confidence: 1,
            eventType: 'step-count',
            value: 1000,
          },
        ],
      })),
    }));
    vi.doMock('$lib/features/imports/parsers', () => ({
      parseAppleHealthXml: vi.fn(),
      parseDayOneExport: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/connectors/healthkit', () => ({
      importHealthKitCompanionBundle: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/connectors/smart-fhir', () => ({
      importSmartFhirSandboxBundle: vi.fn(),
    }));
    vi.doMock('$lib/features/integrations/identity/patient-match', () => ({
      resolveClinicalPatientMatch: vi.fn(),
    }));

    const { commitImportBatchServer } =
      await import('../../../../src/lib/server/imports/service.ts');

    await expect(
      commitImportBatchServer({
        sourceType: 'healthkit-companion',
        rawText: '{}',
      })
    ).rejects.toThrow('write failed');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(refreshWeeklyReviewArtifactsForDaysServer).not.toHaveBeenCalled();
  });
});
