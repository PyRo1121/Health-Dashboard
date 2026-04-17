import { afterEach, describe, expect, it, vi } from 'vitest';

describe('movement search service', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/movement/wger');
    vi.doUnmock('$lib/server/planning/store');
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/schema');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns cached local exercise matches before calling wger', async () => {
    const searchWgerExercises = vi.fn(async () => [
      {
        id: 'wger:remote-1',
        createdAt: '1970-01-01T00:00:00.000Z',
        updatedAt: '1970-01-01T00:00:00.000Z',
        sourceType: 'wger' as const,
        externalId: 'remote-1',
        title: 'Remote Goblet squat',
        muscleGroups: ['Quadriceps'],
        equipment: ['Dumbbell'],
      },
    ]);
    vi.doMock('$lib/server/movement/wger', () => ({
      searchWgerExercises,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listWorkoutTemplatesServer: vi.fn(async () => []),
      saveWorkoutTemplateServer: vi.fn(),
      listExerciseCatalogItemsServer: vi.fn(async () => [
        {
          id: 'wger:1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          sourceType: 'wger' as const,
          externalId: '1',
          title: 'Goblet squat',
          muscleGroups: ['Quadriceps'],
          equipment: ['Dumbbell'],
          instructions: 'Stand tall and squat deep.',
        },
      ]),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { exerciseCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      upsertMirrorRecord: vi.fn(async () => undefined),
    }));

    const { searchMovementExercisesServer } =
      await import('../../../../src/lib/server/movement/service.ts');

    await expect(searchMovementExercisesServer('squat')).resolves.toEqual([
      expect.objectContaining({
        id: 'wger:1',
        title: 'Goblet squat',
      }),
    ]);
    expect(searchWgerExercises).not.toHaveBeenCalled();
  });

  it('returns an empty list when wger fails and no local cache exists', async () => {
    const searchWgerExercises = vi.fn(async () => {
      throw new Error('wger request failed with 500');
    });
    const upsertMirrorRecord = vi.fn(async () => undefined);

    vi.doMock('$lib/server/movement/wger', () => ({
      searchWgerExercises,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listWorkoutTemplatesServer: vi.fn(async () => []),
      saveWorkoutTemplateServer: vi.fn(),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { exerciseCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      upsertMirrorRecord,
    }));

    const { searchMovementExercisesServer } =
      await import('../../../../src/lib/server/movement/service.ts');

    await expect(searchMovementExercisesServer('goblet squat')).resolves.toEqual([]);
    expect(upsertMirrorRecord).not.toHaveBeenCalled();
  });

  it('returns an empty list when wger returns no matches and the local cache is empty', async () => {
    const searchWgerExercises = vi.fn(async () => []);
    const upsertMirrorRecord = vi.fn(async () => undefined);

    vi.doMock('$lib/server/movement/wger', () => ({
      searchWgerExercises,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listWorkoutTemplatesServer: vi.fn(async () => []),
      saveWorkoutTemplateServer: vi.fn(),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { exerciseCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      upsertMirrorRecord,
    }));

    const { searchMovementExercisesServer } =
      await import('../../../../src/lib/server/movement/service.ts');

    await expect(searchMovementExercisesServer('goblet squat')).resolves.toEqual([]);
    expect(searchWgerExercises).toHaveBeenCalledTimes(1);
    expect(upsertMirrorRecord).not.toHaveBeenCalled();
  });
});
