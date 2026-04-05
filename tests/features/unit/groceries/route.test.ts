import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('groceries route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/groceries/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadGroceriesPage?: ReturnType<typeof vi.fn>;
    toggleGroceryItemPage?: ReturnType<typeof vi.fn>;
    addManualGroceryItemPage?: ReturnType<typeof vi.fn>;
    removeManualGroceryItemPage?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/groceries/controller', () => ({
      loadGroceriesPage:
        overrides.loadGroceriesPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: '',
        })),
      toggleGroceryItemPage:
        overrides.toggleGroceryItemPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: 'Grocery item updated.',
        })),
      addManualGroceryItemPage:
        overrides.addManualGroceryItemPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: 'Manual grocery item added.',
        })),
      removeManualGroceryItemPage:
        overrides.removeManualGroceryItemPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: 'Manual grocery item removed.',
        })),
    }));

    return await import('../../../../src/routes/api/groceries/+server.ts');
  }

  it('loads grocery page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadGroceriesPage = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-07',
      weeklyPlan: { id: 'weekly-plan-1', weekStart: '2026-04-07', title: 'This Week' },
      groceryItems: [{ id: 'grocery-1', label: 'soy sauce' }],
      groceryWarnings: [],
      recipeCatalogItems: [],
      saveNotice: '',
    }));
    const { POST } = await importRoute({ db, loadGroceriesPage });

    const response = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-07',
        groceryItems: [expect.objectContaining({ label: 'soy sauce' })],
      })
    );
    expect(loadGroceriesPage).toHaveBeenCalledWith(db, '2026-04-07');
  });

  it('toggles grocery state through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-07',
      weeklyPlan: null,
      groceryItems: [{ id: 'grocery-1', checked: false, excluded: false, onHand: false }],
      groceryWarnings: [],
      recipeCatalogItems: [],
      saveNotice: '',
    };
    const toggleGroceryItemPage = vi.fn(async () => ({
      ...state,
      groceryItems: [{ id: 'grocery-1', checked: true, excluded: false, onHand: true }],
      saveNotice: 'Grocery item updated.',
    }));
    const { POST } = await importRoute({ db, toggleGroceryItemPage });

    const response = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({
          action: 'toggle',
          state,
          itemId: 'grocery-1',
          patch: { checked: true, excluded: false, onHand: true },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        saveNotice: 'Grocery item updated.',
        groceryItems: [expect.objectContaining({ checked: true, onHand: true })],
      })
    );
    expect(toggleGroceryItemPage).toHaveBeenCalledWith(db, state, 'grocery-1', {
      checked: true,
      excluded: false,
      onHand: true,
    });
  });

  it('adds and removes manual grocery items through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-07',
      weeklyPlan: null,
      groceryItems: [],
      groceryWarnings: [],
      recipeCatalogItems: [],
      saveNotice: '',
    };
    const addManualGroceryItemPage = vi.fn(async () => ({
      ...state,
      groceryItems: [{ id: 'grocery-1', label: 'Paper towels', manual: true }],
      saveNotice: 'Manual grocery item added.',
    }));
    const removeManualGroceryItemPage = vi.fn(async () => ({
      ...state,
      groceryItems: [],
      saveNotice: 'Manual grocery item removed.',
    }));
    const { POST } = await importRoute({
      db,
      addManualGroceryItemPage,
      removeManualGroceryItemPage,
    });

    const addResponse = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({
          action: 'addManual',
          state,
          draft: { label: 'Paper towels', quantityText: '' },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(addResponse.status).toBe(200);
    expect(await addResponse.json()).toEqual(
      expect.objectContaining({
        saveNotice: 'Manual grocery item added.',
        groceryItems: [expect.objectContaining({ label: 'Paper towels', manual: true })],
      })
    );
    expect(addManualGroceryItemPage).toHaveBeenCalledWith(db, state, {
      label: 'Paper towels',
      quantityText: '',
    });

    const removeResponse = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({
          action: 'removeManual',
          state,
          itemId: 'grocery-1',
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(removeResponse.status).toBe(200);
    expect(await removeResponse.json()).toEqual(
      expect.objectContaining({
        saveNotice: 'Manual grocery item removed.',
        groceryItems: [],
      })
    );
    expect(removeManualGroceryItemPage).toHaveBeenCalledWith(db, state, 'grocery-1');
  });

  it('returns 400 for invalid grocery action payloads', async () => {
    const loadGroceriesPage = vi.fn();
    const { POST } = await importRoute({ loadGroceriesPage });

    const response = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid groceries request payload.');
    expect(loadGroceriesPage).not.toHaveBeenCalled();
  });
});
