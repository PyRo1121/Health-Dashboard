import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

function createNutritionRouteState() {
  return {
    loading: false,
    localDay: '2026-04-04',
    saveNotice: '',
    searchNotice: '',
    packagedNotice: '',
    recipeNotice: '',
    summary: {
      calories: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
      entries: [],
    },
    favoriteMeals: [],
    catalogItems: [],
    recipeCatalogItems: [],
    plannedMeal: null,
    plannedMealIssue: '',
    plannedMealSlotId: null,
    searchQuery: '',
    matches: [],
    packagedQuery: '',
    barcodeQuery: '',
    packagedMatches: [],
    recipeQuery: '',
    recipeMatches: [],
    selectedMatch: null,
    form: {
      mealType: 'breakfast',
      name: '',
      calories: '0',
      protein: '0',
      fiber: '0',
      carbs: '0',
      fat: '0',
      notes: '',
    },
    recommendationContext: {
      anxietyCount: 0,
      symptomCount: 0,
    },
  };
}

describe('nutrition action route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/nutrition/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadNutritionPage?: ReturnType<typeof vi.fn>;
    saveNutritionMeal?: ReturnType<typeof vi.fn>;
    planNutritionMeal?: ReturnType<typeof vi.fn>;
    saveNutritionRecurringMeal?: ReturnType<typeof vi.fn>;
    saveNutritionCatalogItem?: ReturnType<typeof vi.fn>;
    clearNutritionPlannedMeal?: ReturnType<typeof vi.fn>;
    reuseNutritionMeal?: ReturnType<typeof vi.fn>;
  }) {
    const db = overrides.db ?? ({} as HealthDatabase);
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

    const pageState = createNutritionRouteState();

    vi.doMock('$lib/features/nutrition/controller', () => ({
      loadNutritionPage: overrides.loadNutritionPage ?? vi.fn(async () => pageState),
      saveNutritionMeal:
        overrides.saveNutritionMeal ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Meal saved.',
        })),
      planNutritionMeal:
        overrides.planNutritionMeal ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Planned next meal saved.',
        })),
      saveNutritionRecurringMeal:
        overrides.saveNutritionRecurringMeal ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Recurring meal saved.',
        })),
      saveNutritionCatalogItem:
        overrides.saveNutritionCatalogItem ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Saved to custom food catalog.',
        })),
      clearNutritionPlannedMeal:
        overrides.clearNutritionPlannedMeal ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Planned meal cleared.',
        })),
      reuseNutritionMeal:
        overrides.reuseNutritionMeal ??
        vi.fn(async () => ({
          ...pageState,
          saveNotice: 'Recurring meal reused.',
        })),
    }));

    return {
      pageState,
      route: await import('../../../../src/routes/api/nutrition/+server.ts'),
    };
  }

  it('loads nutrition page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadNutritionPage = vi.fn(async () => createNutritionRouteState());
    const {
      pageState,
      route: { POST },
    } = await importRoute({ db, loadNutritionPage });

    const response = await POST({
      request: new Request('http://health.test/api/nutrition', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state: pageState }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-04',
        loading: false,
      })
    );
    expect(loadNutritionPage).toHaveBeenCalledWith(db, '2026-04-04', pageState);
  });

  it('dispatches nutrition write actions through the action route', async () => {
    const db = {} as HealthDatabase;
    const {
      pageState,
      route: { POST },
    } = await importRoute({ db });

    const saveMealResponse = await POST({
      request: new Request('http://health.test/api/nutrition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveMeal',
          state: pageState,
          draft: {
            localDay: '2026-04-04',
            mealType: 'breakfast',
            name: 'Greek yogurt bowl',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
            notes: '',
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(saveMealResponse.status).toBe(200);
    expect(await saveMealResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Meal saved.' })
    );

    const saveCatalogResponse = await POST({
      request: new Request('http://health.test/api/nutrition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveCatalogItem',
          state: pageState,
          draft: {
            name: 'Greek yogurt bowl',
            calories: 310,
            protein: 24,
            fiber: 6,
            carbs: 34,
            fat: 8,
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(saveCatalogResponse.status).toBe(200);
    expect(await saveCatalogResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Saved to custom food catalog.' })
    );
  });

  it('returns 400 for invalid nutrition action payloads', async () => {
    const loadNutritionPage = vi.fn();
    const {
      route: { POST },
    } = await importRoute({ loadNutritionPage });

    const response = await POST({
      request: new Request('http://health.test/api/nutrition', {
        method: 'POST',
        body: JSON.stringify({
          action: 'planMeal',
          localDay: '2026-04-04',
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid nutrition request payload.');
    expect(loadNutritionPage).not.toHaveBeenCalled();
  });
});
