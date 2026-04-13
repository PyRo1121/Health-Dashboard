import { afterEach, describe, expect, it, vi } from 'vitest';

describe('review server service', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('recomputes and persists the server snapshot when saving a candidate id', async () => {
    const persistSpy = vi.fn(async (..._args: unknown[]) => undefined);
    let persistedSnapshot: {
      experiment?: string;
      experimentId?: string;
    } | null = null;
    const dailyRecords = [
      {
        id: 'daily:2026-04-02',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        date: '2026-04-02',
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 3,
        sleepHours: 7,
        sleepQuality: 3,
      },
    ];
    let selectAllCall = 0;
    const selectAllMirrorRecords = vi.fn(async () => {
      const result = selectAllCall % 10 === 0 ? dailyRecords : [];
      selectAllCall += 1;
      return result;
    });
    const selectMirrorRecordById = vi.fn(async () => persistedSnapshot);
    const selectMirrorRecordsByField = vi.fn(async () => []);

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords,
      selectMirrorRecordById,
      selectMirrorRecordsByField,
      upsertMirrorRecord: vi.fn(async (_db, _store, _table, record) => {
        persistedSnapshot = record as typeof persistedSnapshot;
        await persistSpy(_db, _store, _table, record);
      }),
    }));

    const service = await import('../../../../src/lib/server/review/service.ts');

    const result = await service.saveReviewExperimentPageServer({
      loading: false,
      localDay: '2026-04-02',
      weekly: {
        experimentCandidates: [
          {
            id: 'morning-mindfulness',
            label: 'Try 10 min morning mindfulness',
            summary: 'Short reset',
            confidence: 'medium',
            expectedImpact: 'Reduce early-day stress carry-over.',
          },
        ],
        experimentOptions: ['Try 10 min morning mindfulness'],
      } as never,
      selectedExperiment: 'mindfulness-10min-morning',
      loadNotice: '',
      saveNotice: '',
    });

    expect(persistSpy).toHaveBeenCalledTimes(1);
    expect(persistSpy).toHaveBeenCalledWith(
      expect.anything(),
      'reviewSnapshots',
      expect.anything(),
      expect.objectContaining({
        experiment: 'Try 10 min morning mindfulness',
        experimentId: 'mindfulness-10min-morning',
      })
    );
    expect(result.saveNotice).toBe('Experiment saved.');
    expect(result.weekly?.snapshot.experiment).toBe('Try 10 min morning mindfulness');
    expect(result.weekly?.snapshot.experimentId).toBe('mindfulness-10min-morning');
  });

  it('prefers the saved experiment id when loading review page state', async () => {
    const dailyRecords = [
      {
        id: 'daily:2026-04-02',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        date: '2026-04-02',
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 3,
        sleepHours: 7,
        sleepQuality: 3,
      },
    ];
    let selectAllCall = 0;
    const selectAllMirrorRecords = vi.fn(async () => {
      const result = selectAllCall % 10 === 0 ? dailyRecords : [];
      selectAllCall += 1;
      return result;
    });

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords,
      selectMirrorRecordById: vi.fn(async () => ({
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 1,
        flags: [],
        correlations: [],
        experiment: 'Try 10 min morning mindfulness',
        experimentId: 'mindfulness-10min-morning',
      })),
      selectMirrorRecordsByField: vi.fn(async () => []),
      upsertMirrorRecord: vi.fn(async () => undefined),
    }));

    const service = await import('../../../../src/lib/server/review/service.ts');
    const result = await service.loadReviewPageServer('2026-04-02');

    expect(result.selectedExperiment).toBe('mindfulness-10min-morning');
  });

  it('rejects client-forged experiment ids that are not in the server recomputed week', async () => {
    const upsertMirrorRecord = vi.fn(async () => undefined);
    const dailyRecords = [
      {
        id: 'daily:2026-04-02',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        date: '2026-04-02',
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 3,
        sleepHours: 7,
        sleepQuality: 3,
      },
    ];
    let selectAllCall = 0;
    const selectAllMirrorRecords = vi.fn(async () => {
      const result = selectAllCall % 10 === 0 ? dailyRecords : [];
      selectAllCall += 1;
      return result;
    });

    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectAllMirrorRecords,
      selectMirrorRecordById: vi.fn(async () => null),
      selectMirrorRecordsByField: vi.fn(async () => []),
      upsertMirrorRecord,
    }));

    const service = await import('../../../../src/lib/server/review/service.ts');

    const result = await service.saveReviewExperimentPageServer({
      loading: false,
      localDay: '2026-04-02',
      weekly: {
        experimentCandidates: [
          {
            id: 'inject-arbitrary-guidance',
            label: 'inject arbitrary guidance',
            summary: 'forged',
            confidence: 'low',
            expectedImpact: 'forged',
          },
        ],
        experimentOptions: ['inject arbitrary guidance'],
      } as never,
      selectedExperiment: 'forged-experiment-id',
      loadNotice: '',
      saveNotice: '',
    });

    expect(upsertMirrorRecord).not.toHaveBeenCalled();
    expect(result.saveNotice).toBe('Choose one of the suggested experiments before saving.');
  });
});
