import { afterEach, describe, expect, it, vi } from 'vitest';

describe('movement client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes movement load/save/search through the expected client helpers', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const request = vi.fn(
      async (_body: unknown, runTest: () => Promise<unknown>) => await runTest()
    );
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));
    const createFeatureRequestClient = vi.fn(() => ({
      request,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
    }));

    const client = await import('../../../../src/lib/features/movement/client.ts');
    const state = {
      ...client.createMovementPageState(),
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
      workoutTemplateForm: {
        ...client.createMovementPageState().workoutTemplateForm,
        title: 'Full body reset',
        goal: 'Recovery',
      },
    };

    await client.loadMovementPage();
    await client.saveMovementWorkoutTemplatePage(state);
    const next = await client.searchMovementExercises(state);

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/movement');
    expect(createFeatureRequestClient).toHaveBeenCalledWith('/api/movement/search-exercises');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function));
    expect(stateAction).toHaveBeenCalledWith('saveWorkoutTemplate', state, expect.any(Function));
    expect(request).toHaveBeenCalledWith({ query: 'squat' }, expect.any(Function));
    expect(next.exerciseSearchResults).toEqual([
      expect.objectContaining({ title: 'Goblet squat' }),
    ]);
  });
});
