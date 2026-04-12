import { afterEach, describe, expect, it, vi } from 'vitest';

describe('planning route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/plan/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadPlanningPageServer?: ReturnType<typeof vi.fn>;
    savePlanningSlotPageServer?: ReturnType<typeof vi.fn>;
    saveWorkoutTemplatePageServer?: ReturnType<typeof vi.fn>;
    markPlanningSlotStatusPageServer?: ReturnType<typeof vi.fn>;
    movePlanningSlotPageServer?: ReturnType<typeof vi.fn>;
    deletePlanningSlotPageServer?: ReturnType<typeof vi.fn>;
    togglePlanningGroceryStatePageServer?: ReturnType<typeof vi.fn>;
    addManualPlanningGroceryItemPageServer?: ReturnType<typeof vi.fn>;
    removeManualPlanningGroceryItemPageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/plan/service', () => ({
      loadPlanningPageServer:
        overrides.loadPlanningPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-07',
          planNotice: '',
          workoutTemplateNotice: '',
          groceryNotice: '',
          weeklyPlan: null,
          weekDays: [],
          slots: [],
          groceryItems: [],
          groceryWarnings: [],
          exerciseCatalogItems: [],
          foodCatalogItems: [],
          recipeCatalogItems: [],
          workoutTemplates: [],
          exerciseSearchQuery: '',
          exerciseSearchResults: [],
          slotForm: {
            localDay: '2026-04-07',
            slotType: 'note',
            mealSource: 'recipe',
            recipeId: '',
            foodCatalogItemId: '',
            workoutTemplateId: '',
            title: '',
            notes: '',
          },
          workoutTemplateForm: { title: '', goal: '', exercises: [] },
        })),
      savePlanningSlotPageServer:
        overrides.savePlanningSlotPageServer ??
        vi.fn(async (state) => ({ ...state, planNotice: 'Plan slot saved.' })),
      saveWorkoutTemplatePageServer:
        overrides.saveWorkoutTemplatePageServer ??
        vi.fn(async (state) => ({ ...state, workoutTemplateNotice: 'Workout template saved.' })),
      markPlanningSlotStatusPageServer:
        overrides.markPlanningSlotStatusPageServer ??
        vi.fn(async (state) => ({ ...state, planNotice: 'Plan slot marked done.' })),
      movePlanningSlotPageServer:
        overrides.movePlanningSlotPageServer ??
        vi.fn(async (state) => ({ ...state, planNotice: 'Plan slot moved up.' })),
      deletePlanningSlotPageServer:
        overrides.deletePlanningSlotPageServer ??
        vi.fn(async (state) => ({ ...state, planNotice: 'Plan slot removed.' })),
      togglePlanningGroceryStatePageServer:
        overrides.togglePlanningGroceryStatePageServer ??
        vi.fn(async (state) => ({ ...state, groceryNotice: 'Grocery item updated.' })),
      addManualPlanningGroceryItemPageServer:
        overrides.addManualPlanningGroceryItemPageServer ??
        vi.fn(async (state) => ({ ...state, groceryNotice: 'Manual grocery item added.' })),
      removeManualPlanningGroceryItemPageServer:
        overrides.removeManualPlanningGroceryItemPageServer ??
        vi.fn(async (state) => ({ ...state, groceryNotice: 'Manual grocery item removed.' })),
    }));

    return await import('../../../../src/routes/api/plan/+server.ts');
  }

  it('loads planning page state through the server route', async () => {
    const loadPlanningPageServer = vi.fn(async () => ({ loading: false, localDay: '2026-04-07', slots: [] }));
    const { POST } = await importRoute({ loadPlanningPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ localDay: '2026-04-07', loading: false }));
    expect(loadPlanningPageServer).toHaveBeenCalledWith('2026-04-07', undefined);
  });

  it('dispatches planning write actions through the server route', async () => {
    const state = {
      loading: false,
      localDay: '2026-04-07',
      planNotice: '',
      workoutTemplateNotice: '',
      groceryNotice: '',
      weeklyPlan: null,
      weekDays: [],
      slots: [],
      groceryItems: [],
      groceryWarnings: [],
      exerciseCatalogItems: [],
      foodCatalogItems: [],
      recipeCatalogItems: [],
      workoutTemplates: [],
      exerciseSearchQuery: '',
      exerciseSearchResults: [],
      slotForm: {
        localDay: '2026-04-07',
        slotType: 'note',
        mealSource: 'recipe',
        recipeId: '',
        foodCatalogItemId: '',
        workoutTemplateId: '',
        title: '',
        notes: '',
      },
      workoutTemplateForm: { title: '', goal: '', exercises: [] },
    };
    const savePlanningSlotPageServer = vi.fn(async () => ({ ...state, planNotice: 'Plan slot saved.' }));
    const saveWorkoutTemplatePageServer = vi.fn(async () => ({ ...state, workoutTemplateNotice: 'Workout template saved.' }));
    const markPlanningSlotStatusPageServer = vi.fn(async () => ({ ...state, planNotice: 'Plan slot marked done.' }));
    const movePlanningSlotPageServer = vi.fn(async () => ({ ...state, planNotice: 'Plan slot moved up.' }));
    const deletePlanningSlotPageServer = vi.fn(async () => ({ ...state, planNotice: 'Plan slot removed.' }));
    const togglePlanningGroceryStatePageServer = vi.fn(async () => ({ ...state, groceryNotice: 'Grocery item updated.' }));
    const addManualPlanningGroceryItemPageServer = vi.fn(async () => ({ ...state, groceryNotice: 'Manual grocery item added.' }));
    const removeManualPlanningGroceryItemPageServer = vi.fn(async () => ({ ...state, groceryNotice: 'Manual grocery item removed.' }));
    const { POST } = await importRoute({
      savePlanningSlotPageServer,
      saveWorkoutTemplatePageServer,
      markPlanningSlotStatusPageServer,
      movePlanningSlotPageServer,
      deletePlanningSlotPageServer,
      togglePlanningGroceryStatePageServer,
      addManualPlanningGroceryItemPageServer,
      removeManualPlanningGroceryItemPageServer,
    });

    const saveSlotResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'saveSlot', state }) }) } as Parameters<typeof POST>[0]);
    expect(await saveSlotResponse.json()).toEqual(expect.objectContaining({ planNotice: 'Plan slot saved.' }));
    expect(savePlanningSlotPageServer).toHaveBeenCalledWith(state);

    const templateResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'saveWorkoutTemplate', state }) }) } as Parameters<typeof POST>[0]);
    expect(await templateResponse.json()).toEqual(expect.objectContaining({ workoutTemplateNotice: 'Workout template saved.' }));
    expect(saveWorkoutTemplatePageServer).toHaveBeenCalledWith(state);

    const markResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'markSlotStatus', state, slotId: 'slot-1', status: 'done' }) }) } as Parameters<typeof POST>[0]);
    expect(await markResponse.json()).toEqual(expect.objectContaining({ planNotice: 'Plan slot marked done.' }));
    expect(markPlanningSlotStatusPageServer).toHaveBeenCalledWith(state, 'slot-1', 'done');

    const moveResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'moveSlot', state, slotId: 'slot-1', direction: 'up' }) }) } as Parameters<typeof POST>[0]);
    expect(await moveResponse.json()).toEqual(expect.objectContaining({ planNotice: 'Plan slot moved up.' }));
    expect(movePlanningSlotPageServer).toHaveBeenCalledWith(state, 'slot-1', 'up');

    const deleteResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'deleteSlot', state, slotId: 'slot-1' }) }) } as Parameters<typeof POST>[0]);
    expect(await deleteResponse.json()).toEqual(expect.objectContaining({ planNotice: 'Plan slot removed.' }));
    expect(deletePlanningSlotPageServer).toHaveBeenCalledWith(state, 'slot-1');

    const toggleResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'toggleGrocery', state, itemId: 'grocery-1', patch: { checked: true, excluded: false, onHand: false } }) }) } as Parameters<typeof POST>[0]);
    expect(await toggleResponse.json()).toEqual(expect.objectContaining({ groceryNotice: 'Grocery item updated.' }));
    expect(togglePlanningGroceryStatePageServer).toHaveBeenCalledWith(state, 'grocery-1', { checked: true, excluded: false, onHand: false });

    const addResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'addManualGrocery', state, draft: { label: 'Bananas', quantityText: '3' } }) }) } as Parameters<typeof POST>[0]);
    expect(await addResponse.json()).toEqual(expect.objectContaining({ groceryNotice: 'Manual grocery item added.' }));
    expect(addManualPlanningGroceryItemPageServer).toHaveBeenCalledWith(state, { label: 'Bananas', quantityText: '3' });

    const removeResponse = await POST({ request: new Request('http://health.test/api/plan', { method: 'POST', body: JSON.stringify({ action: 'removeManualGrocery', state, itemId: 'grocery-1' }) }) } as Parameters<typeof POST>[0]);
    expect(await removeResponse.json()).toEqual(expect.objectContaining({ groceryNotice: 'Manual grocery item removed.' }));
    expect(removeManualPlanningGroceryItemPageServer).toHaveBeenCalledWith(state, 'grocery-1');
  });

  it('returns 400 for invalid planning action payloads', async () => {
    const loadPlanningPageServer = vi.fn();
    const { POST } = await importRoute({ loadPlanningPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/plan', {
        method: 'POST',
        body: JSON.stringify({ action: 'markSlotStatus', localDay: '2026-04-07' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid planning request payload.');
    expect(loadPlanningPageServer).not.toHaveBeenCalled();
  });
});
