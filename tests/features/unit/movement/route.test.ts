import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('movement route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/movement/controller');
    vi.doUnmock('$lib/features/movement/service');
    vi.doUnmock('$lib/server/db/client');
    vi.doUnmock('$lib/server/http/action-route');
    vi.doUnmock('$lib/server/movement/wger');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('loads movement page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadMovementPage = vi.fn(async () => ({
      loading: false,
      saveNotice: '',
      workoutTemplateForm: { title: '', goal: '', exercises: [] },
      workoutTemplates: [],
      exerciseCatalogItems: [{ id: 'wger:1', title: 'Goblet squat' }],
      exerciseSearchQuery: '',
      exerciseSearchResults: [],
    }));
    const saveMovementWorkoutTemplatePage = vi.fn();
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0],
        _deps: Parameters<typeof actual.createDbActionPostHandler>[1],
        options: Parameters<typeof actual.createDbActionPostHandler>[2]
      ) =>
        actual.createDbActionPostHandler(
          handlers,
          {
            withDb: async (run) => await run(db),
            toResponse: (body) => Response.json(body),
          },
          options
        ),
    }));
    vi.doMock('$lib/features/movement/controller', () => ({
      loadMovementPage,
      saveMovementWorkoutTemplatePage,
    }));

    const { POST } = await import('../../../../src/routes/api/movement/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement', {
        method: 'POST',
        body: JSON.stringify({ action: 'load' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        exerciseCatalogItems: [expect.objectContaining({ title: 'Goblet squat' })],
      })
    );
    expect(loadMovementPage).toHaveBeenCalledWith(db);
    expect(saveMovementWorkoutTemplatePage).not.toHaveBeenCalled();
  });

  it('saves a workout template through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      saveNotice: '',
      workoutTemplateForm: {
        title: 'Full body reset',
        goal: 'Recovery',
        exercises: [{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 }],
      },
      workoutTemplates: [],
      exerciseCatalogItems: [],
      exerciseSearchQuery: '',
      exerciseSearchResults: [],
    };
    const loadMovementPage = vi.fn();
    const saveMovementWorkoutTemplatePage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Workout template saved.',
      workoutTemplates: [{ id: 'workout-template-1', title: 'Full body reset' }],
    }));
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0],
        _deps: Parameters<typeof actual.createDbActionPostHandler>[1],
        options: Parameters<typeof actual.createDbActionPostHandler>[2]
      ) =>
        actual.createDbActionPostHandler(
          handlers,
          {
            withDb: async (run) => await run(db),
            toResponse: (body) => Response.json(body),
          },
          options
        ),
    }));
    vi.doMock('$lib/features/movement/controller', () => ({
      loadMovementPage,
      saveMovementWorkoutTemplatePage,
    }));

    const { POST } = await import('../../../../src/routes/api/movement/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveWorkoutTemplate', state }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        saveNotice: 'Workout template saved.',
        workoutTemplates: [expect.objectContaining({ title: 'Full body reset' })],
      })
    );
    expect(saveMovementWorkoutTemplatePage).toHaveBeenCalledWith(db, state);
    expect(loadMovementPage).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid movement action payloads', async () => {
    const db = {} as HealthDatabase;
    const loadMovementPage = vi.fn();
    const saveMovementWorkoutTemplatePage = vi.fn();
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0],
        _deps: Parameters<typeof actual.createDbActionPostHandler>[1],
        options: Parameters<typeof actual.createDbActionPostHandler>[2]
      ) =>
        actual.createDbActionPostHandler(
          handlers,
          {
            withDb: async (run) => await run(db),
            toResponse: (body) => Response.json(body),
          },
          options
        ),
    }));
    vi.doMock('$lib/features/movement/controller', () => ({
      loadMovementPage,
      saveMovementWorkoutTemplatePage,
    }));

    const { POST } = await import('../../../../src/routes/api/movement/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveWorkoutTemplate' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid movement request payload.');
    expect(loadMovementPage).not.toHaveBeenCalled();
    expect(saveMovementWorkoutTemplatePage).not.toHaveBeenCalled();
  });
});

describe('movement search route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/movement/service');
    vi.doUnmock('$lib/server/db/client');
    vi.doUnmock('$lib/server/movement/wger');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns an empty list for blank search queries', async () => {
    const searchWgerExercises = vi.fn();
    const upsertExerciseCatalogItems = vi.fn();
    const withServerHealthDb = vi.fn();

    vi.doMock('$lib/server/movement/wger', () => ({ searchWgerExercises }));
    vi.doMock('$lib/features/movement/service', () => ({ upsertExerciseCatalogItems }));
    vi.doMock('$lib/server/db/client', () => ({ withServerHealthDb }));

    const { POST } =
      await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement/search-exercises', {
        method: 'POST',
        body: JSON.stringify({ query: '   ' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(searchWgerExercises).not.toHaveBeenCalled();
    expect(upsertExerciseCatalogItems).not.toHaveBeenCalled();
    expect(withServerHealthDb).not.toHaveBeenCalled();
  });

  it('searches wger and persists the normalized results', async () => {
    const db = {} as HealthDatabase;
    const results = [
      {
        id: 'wger:1',
        title: 'Goblet squat',
        sourceType: 'wger',
        externalId: '1',
      },
    ];
    const searchWgerExercises = vi.fn(async () => results);
    const upsertExerciseCatalogItems = vi.fn(
      async (_db: HealthDatabase, items: typeof results) => items
    );
    const withServerHealthDb = vi.fn(
      async (run: (db: HealthDatabase) => Promise<unknown>) => await run(db)
    );

    vi.doMock('$lib/server/movement/wger', () => ({ searchWgerExercises }));
    vi.doMock('$lib/features/movement/service', () => ({ upsertExerciseCatalogItems }));
    vi.doMock('$lib/server/db/client', () => ({ withServerHealthDb }));

    const { POST } =
      await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement/search-exercises', {
        method: 'POST',
        body: JSON.stringify({ query: 'goblet squat' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(results);
    expect(searchWgerExercises).toHaveBeenCalledWith('goblet squat');
    expect(withServerHealthDb).toHaveBeenCalledOnce();
    expect(upsertExerciseCatalogItems).toHaveBeenCalledWith(db, results);
  });

  it('returns 400 for invalid exercise search payloads', async () => {
    const searchWgerExercises = vi.fn();
    const upsertExerciseCatalogItems = vi.fn();
    const withServerHealthDb = vi.fn();

    vi.doMock('$lib/server/movement/wger', () => ({ searchWgerExercises }));
    vi.doMock('$lib/features/movement/service', () => ({ upsertExerciseCatalogItems }));
    vi.doMock('$lib/server/db/client', () => ({ withServerHealthDb }));

    const { POST } =
      await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/movement/search-exercises', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid exercise search request payload.');
    expect(searchWgerExercises).not.toHaveBeenCalled();
    expect(upsertExerciseCatalogItems).not.toHaveBeenCalled();
    expect(withServerHealthDb).not.toHaveBeenCalled();
  });
});
