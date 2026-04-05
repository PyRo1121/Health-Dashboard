import { afterEach, describe, expect, it, vi } from 'vitest';

describe('groceries client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes groceries actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/groceries/client.ts');
    const state: ReturnType<typeof client.createGroceriesPageState> = {
      ...client.createGroceriesPageState(),
      localDay: '2026-04-07',
      groceryItems: [
        {
          id: 'grocery-1',
          createdAt: '2026-04-07T00:00:00.000Z',
          updatedAt: '2026-04-07T00:00:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          ingredientKey: 'soy-sauce',
          label: 'soy sauce',
          checked: false,
          excluded: false,
          onHand: false,
          sourceRecipeIds: [],
        },
      ],
      groceryWarnings: [],
      recipeCatalogItems: [],
      weeklyPlan: null,
    };

    await client.loadGroceriesPage('2026-04-07');
    await client.toggleGroceryItemPage(state, 'grocery-1', {
      checked: true,
      excluded: false,
      onHand: true,
    });

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/groceries');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function), { localDay: '2026-04-07' });
    expect(stateAction).toHaveBeenCalledWith('toggle', state, expect.any(Function), {
      itemId: 'grocery-1',
      patch: { checked: true, excluded: false, onHand: true },
    });
  });
});
