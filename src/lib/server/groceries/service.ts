import {
  createGroceriesPageState,
  type GroceriesPageState,
} from '$lib/features/groceries/controller';
import {
  ensureWeeklyPlanServer,
  listRecipeCatalogItemsServer,
  listWeeklyPlanSlotsServer,
} from '$lib/server/planning/store';
import {
  removeManualGroceryItemServer,
  saveManualGroceryItemServer,
  setGroceryItemStateServer,
  syncDerivedGroceriesServer,
} from '$lib/server/groceries/store';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';

function createLoadedGroceriesPageState(
  localDay: string,
  state: GroceriesPageState,
  data: {
    weeklyPlan: NonNullable<GroceriesPageState['weeklyPlan']>;
    groceryItems: GroceriesPageState['groceryItems'];
    groceryWarnings: string[];
    recipeCatalogItems: GroceriesPageState['recipeCatalogItems'];
  },
  saveNotice = ''
): GroceriesPageState {
  return {
    ...state,
    loading: false,
    localDay,
    saveNotice,
    weeklyPlan: data.weeklyPlan,
    groceryItems: data.groceryItems,
    groceryWarnings: data.groceryWarnings,
    recipeCatalogItems: data.recipeCatalogItems,
  };
}

export async function loadGroceriesPageServer(localDay: string): Promise<GroceriesPageState> {
  const weeklyPlan = await ensureWeeklyPlanServer(localDay);
  const [recipeCatalogItems, slots] = await Promise.all([
    listRecipeCatalogItemsServer(),
    listWeeklyPlanSlotsServer(weeklyPlan.id),
  ]);
  const groceryResult = await syncDerivedGroceriesServer(weeklyPlan.id, slots);

  return createLoadedGroceriesPageState(localDay, createGroceriesPageState(), {
    weeklyPlan,
    groceryItems: groceryResult.items,
    groceryWarnings: groceryResult.warnings,
    recipeCatalogItems,
  });
}

async function refreshGroceriesPageAfterMutationServer(
  state: GroceriesPageState,
  saveNotice: string
): Promise<GroceriesPageState> {
  await refreshWeeklyReviewArtifactsServer(state.localDay);
  const next = await loadGroceriesPageServer(state.localDay);
  return {
    ...next,
    saveNotice,
  };
}

export async function toggleGroceryItemPageServer(
  state: GroceriesPageState,
  itemId: string,
  patch: Parameters<typeof setGroceryItemStateServer>[1]
): Promise<GroceriesPageState> {
  await setGroceryItemStateServer(itemId, patch);
  return await refreshGroceriesPageAfterMutationServer(state, 'Grocery item updated.');
}

export async function addManualGroceryItemPageServer(
  state: GroceriesPageState,
  draft: { label: string; quantityText: string }
): Promise<GroceriesPageState> {
  if (!state.weeklyPlan) {
    return state;
  }

  if (!draft.label.trim()) {
    return {
      ...state,
      saveNotice: 'Manual grocery label is required.',
    };
  }

  await saveManualGroceryItemServer(
    state.weeklyPlan.id,
    [draft.quantityText.trim(), draft.label.trim()].filter(Boolean).join(' ')
  );
  return await refreshGroceriesPageAfterMutationServer(state, 'Manual grocery item added.');
}

export async function removeManualGroceryItemPageServer(
  state: GroceriesPageState,
  itemId: string
): Promise<GroceriesPageState> {
  await removeManualGroceryItemServer(itemId);
  return await refreshGroceriesPageAfterMutationServer(state, 'Manual grocery item removed.');
}
