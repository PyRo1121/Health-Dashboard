import { afterEach, describe, expect, it, vi } from 'vitest';

describe('movement route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/movement/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('loads and saves workout templates through the server route', async () => {
    const loadMovementPageServer = vi.fn(async () => ({
      loading: false,
      saveNotice: '',
      workoutTemplateForm: { title: '', goal: '', exercises: [] },
      workoutTemplates: [],
      exerciseCatalogItems: [{ id: 'wger:1', title: 'Goblet squat' }],
      exerciseSearchQuery: '',
      exerciseSearchResults: [],
    }));
    const saveMovementWorkoutTemplatePageServer = vi.fn(async () => ({
      loading: false,
      saveNotice: 'Workout template saved.',
      workoutTemplateForm: { title: '', goal: '', exercises: [] },
      workoutTemplates: [{ id: 'workout-template-1', title: 'Full body reset' }],
      exerciseCatalogItems: [],
      exerciseSearchQuery: '',
      exerciseSearchResults: [],
    }));
    vi.doMock('$lib/server/movement/service', () => ({
      loadMovementPageServer,
      saveMovementWorkoutTemplatePageServer,
      searchMovementExercisesServer: vi.fn(),
    }));
    const mod = await import('../../../../src/routes/api/movement/+server.ts');
    let response = await mod.POST({ request: new Request('http://health.test/api/movement', { method: 'POST', body: JSON.stringify({ action: 'load' }) }) } as Parameters<typeof mod.POST>[0]);
    expect(await response.json()).toEqual(expect.objectContaining({ exerciseCatalogItems: [expect.objectContaining({ title: 'Goblet squat' })] }));
    expect(loadMovementPageServer).toHaveBeenCalledTimes(1);
    response = await mod.POST({ request: new Request('http://health.test/api/movement', { method: 'POST', body: JSON.stringify({ action: 'saveWorkoutTemplate', state: { loading: false, saveNotice: '', workoutTemplateForm: { title: 'Full body reset', goal: 'Recovery', exercises: [] }, workoutTemplates: [], exerciseCatalogItems: [], exerciseSearchQuery: '', exerciseSearchResults: [] } }) }) } as Parameters<typeof mod.POST>[0]);
    expect(await response.json()).toEqual(expect.objectContaining({ saveNotice: 'Workout template saved.' }));
    expect(saveMovementWorkoutTemplatePageServer).toHaveBeenCalled();
  });

  it('returns 400 for invalid movement action payloads', async () => {
    vi.doMock('$lib/server/movement/service', () => ({
      loadMovementPageServer: vi.fn(),
      saveMovementWorkoutTemplatePageServer: vi.fn(),
      searchMovementExercisesServer: vi.fn(),
    }));
    const { POST } = await import('../../../../src/routes/api/movement/+server.ts');
    const response = await POST({ request: new Request('http://health.test/api/movement', { method: 'POST', body: JSON.stringify({ action: 'saveWorkoutTemplate' }) }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid movement request payload.');
  });
});

describe('movement search route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/movement/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns an empty list for blank search queries', async () => {
    const searchMovementExercisesServer = vi.fn();
    vi.doMock('$lib/server/movement/service', () => ({
      loadMovementPageServer: vi.fn(),
      saveMovementWorkoutTemplatePageServer: vi.fn(),
      searchMovementExercisesServer,
    }));
    const { POST } = await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({ request: new Request('http://health.test/api/movement/search-exercises', { method: 'POST', body: JSON.stringify({ query: '   ' }) }) } as Parameters<typeof POST>[0]);
    expect(await response.json()).toEqual([]);
    expect(searchMovementExercisesServer).not.toHaveBeenCalled();
  });

  it('searches wger and persists results', async () => {
    const results = [{ id: 'wger:1', title: 'Goblet squat', sourceType: 'wger', externalId: '1' }];
    const searchMovementExercisesServer = vi.fn(async () => results);
    vi.doMock('$lib/server/movement/service', () => ({
      loadMovementPageServer: vi.fn(),
      saveMovementWorkoutTemplatePageServer: vi.fn(),
      searchMovementExercisesServer,
    }));
    const { POST } = await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({ request: new Request('http://health.test/api/movement/search-exercises', { method: 'POST', body: JSON.stringify({ query: 'goblet squat' }) }) } as Parameters<typeof POST>[0]);
    expect(await response.json()).toEqual(results);
    expect(searchMovementExercisesServer).toHaveBeenCalledWith('goblet squat');
  });

  it('returns 400 for invalid exercise search payloads', async () => {
    vi.doMock('$lib/server/movement/service', () => ({
      loadMovementPageServer: vi.fn(),
      saveMovementWorkoutTemplatePageServer: vi.fn(),
      searchMovementExercisesServer: vi.fn(),
    }));
    const { POST } = await import('../../../../src/routes/api/movement/search-exercises/+server.ts');
    const response = await POST({ request: new Request('http://health.test/api/movement/search-exercises', { method: 'POST', body: JSON.stringify({ query: 42 }) }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid exercise search request payload.');
  });
});
