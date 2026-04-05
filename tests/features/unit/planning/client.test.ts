import { afterEach, describe, expect, it, vi } from 'vitest';

describe('planning client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('searches movement exercises through the request client and applies results', async () => {
    const request = vi.fn(
      async (_body: unknown, runTest: () => Promise<unknown>) => await runTest()
    );
    const createFeatureRequestClient = vi.fn(() => ({ request }));
    const createFeatureActionClient = vi.fn(() => ({
      action: vi.fn(),
      stateAction: vi.fn(),
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
    }));

    const { createPlanningPageState, searchPlanningExercises } =
      await import('../../../../src/lib/features/planning/client.ts');

    const state = {
      ...createPlanningPageState(),
      exerciseSearchQuery: 'squat',
      exerciseCatalogItems: [
        {
          id: 'wger:1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          sourceType: 'wger' as const,
          externalId: '1',
          title: 'Goblet squat',
          muscleGroups: ['Quadriceps'],
          equipment: ['Dumbbell'],
        },
      ],
    };

    const next = await searchPlanningExercises(state);

    expect(createFeatureRequestClient).toHaveBeenCalledWith('/api/movement/search-exercises');
    expect(request).toHaveBeenCalledWith({ query: 'squat' }, expect.any(Function));
    expect(next.exerciseSearchResults).toEqual([
      expect.objectContaining({ title: 'Goblet squat' }),
    ]);
  });
});
