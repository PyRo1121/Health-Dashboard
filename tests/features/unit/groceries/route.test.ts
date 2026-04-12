import { afterEach, describe, expect, it, vi } from 'vitest';

describe('groceries route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/groceries/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadGroceriesPageServer?: ReturnType<typeof vi.fn>;
    toggleGroceryItemPageServer?: ReturnType<typeof vi.fn>;
    addManualGroceryItemPageServer?: ReturnType<typeof vi.fn>;
    removeManualGroceryItemPageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/groceries/service', () => ({
      loadGroceriesPageServer:
        overrides.loadGroceriesPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: '',
        })),
      toggleGroceryItemPageServer:
        overrides.toggleGroceryItemPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: 'Grocery item updated.',
        })),
      addManualGroceryItemPageServer:
        overrides.addManualGroceryItemPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          weeklyPlan: null,
          groceryItems: [],
          groceryWarnings: [],
          recipeCatalogItems: [],
          saveNotice: 'Manual grocery item added.',
        })),
      removeManualGroceryItemPageServer:
        overrides.removeManualGroceryItemPageServer ??
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

  it('loads groceries through the server route', async () => {
    const loadGroceriesPageServer = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-07',
      weeklyPlan: { id: 'weekly-plan-1' },
      groceryItems: [{ id: 'grocery-1', label: 'soy sauce' }],
      groceryWarnings: [],
      recipeCatalogItems: [],
      saveNotice: '',
    }));
    const { POST } = await importRoute({ loadGroceriesPageServer });
    const response = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await response.json()).toEqual(
      expect.objectContaining({ groceryItems: [expect.objectContaining({ label: 'soy sauce' })] })
    );
    expect(loadGroceriesPageServer).toHaveBeenCalledWith('2026-04-07');
  });

  it('dispatches grocery mutations through the server route', async () => {
    const state = {
      loading: false,
      localDay: '2026-04-07',
      weeklyPlan: null,
      groceryItems: [],
      groceryWarnings: [],
      recipeCatalogItems: [],
      saveNotice: '',
    };
    const toggleGroceryItemPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Grocery item updated.',
    }));
    const addManualGroceryItemPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Manual grocery item added.',
    }));
    const removeManualGroceryItemPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Manual grocery item removed.',
    }));
    const { POST } = await importRoute({
      toggleGroceryItemPageServer,
      addManualGroceryItemPageServer,
      removeManualGroceryItemPageServer,
    });
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/groceries', {
            method: 'POST',
            body: JSON.stringify({
              action: 'toggle',
              state,
              itemId: 'grocery-1',
              patch: { checked: true, excluded: false, onHand: true },
            }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: 'Grocery item updated.' }));
    expect(toggleGroceryItemPageServer).toHaveBeenCalledWith(state, 'grocery-1', {
      checked: true,
      excluded: false,
      onHand: true,
    });
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/groceries', {
            method: 'POST',
            body: JSON.stringify({
              action: 'addManual',
              state,
              draft: { label: 'Paper towels', quantityText: '' },
            }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: 'Manual grocery item added.' }));
    expect(addManualGroceryItemPageServer).toHaveBeenCalledWith(state, {
      label: 'Paper towels',
      quantityText: '',
    });
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/groceries', {
            method: 'POST',
            body: JSON.stringify({ action: 'removeManual', state, itemId: 'grocery-1' }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: 'Manual grocery item removed.' }));
    expect(removeManualGroceryItemPageServer).toHaveBeenCalledWith(state, 'grocery-1');
  });

  it('returns 400 for invalid groceries payloads', async () => {
    const { POST } = await importRoute({});
    const response = await POST({
      request: new Request('http://health.test/api/groceries', {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid groceries request payload.');
  });
});
