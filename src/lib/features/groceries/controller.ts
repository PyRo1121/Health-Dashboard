import type { GroceryItem, RecipeCatalogItem, WeeklyPlan } from '$lib/core/domain/types';
import {
  listRecipeCatalogItems,
  type RecipeCatalogItemsStore,
} from '$lib/features/nutrition/store';
import { ensureWeeklyPlan, type WeeklyPlansStore } from '$lib/features/planning/service';
import { refreshWeeklyReviewArtifactsSafely, type ReviewStorage } from '$lib/features/review/service';
import {
  deriveWeeklyGroceriesWithWarnings,
  removeManualGroceryItem,
  saveManualGroceryItem,
  setGroceryItemState,
  type GroceryServiceStore,
} from './service';

export interface GroceriesPageStorage
  extends WeeklyPlansStore,
    RecipeCatalogItemsStore,
    GroceryServiceStore,
    ReviewStorage {}

export interface ManualGroceryDraft {
  label: string;
  quantityText: string;
}

export interface GroceryDraftState {
  manualLabel: string;
  manualQuantityText: string;
}

export interface GroceriesPageState {
  loading: boolean;
  localDay: string;
  saveNotice: string;
  weeklyPlan: WeeklyPlan | null;
  groceryItems: GroceryItem[];
  groceryWarnings: string[];
  recipeCatalogItems: RecipeCatalogItem[];
}

export function createGroceriesPageState(): GroceriesPageState {
  return {
    loading: true,
    localDay: '',
    saveNotice: '',
    weeklyPlan: null,
    groceryItems: [],
    groceryWarnings: [],
    recipeCatalogItems: [],
  };
}

export function createGroceryDraftState(): GroceryDraftState {
  return {
    manualLabel: '',
    manualQuantityText: '',
  };
}

export async function loadGroceriesPage(
  store: GroceriesPageStorage,
  localDay: string
): Promise<GroceriesPageState> {
  const weeklyPlan = await ensureWeeklyPlan(store, localDay);
  const recipeCatalogItems = await listRecipeCatalogItems(store);
  const groceryResult = await deriveWeeklyGroceriesWithWarnings(
    store,
    weeklyPlan.id,
    recipeCatalogItems
  );

  return {
    loading: false,
    localDay,
    saveNotice: '',
    weeklyPlan,
    groceryItems: groceryResult.items,
    groceryWarnings: groceryResult.warnings,
    recipeCatalogItems,
  };
}

async function refreshGroceriesPageAfterMutation(
  store: GroceriesPageStorage,
  state: GroceriesPageState,
  saveNotice: string
): Promise<GroceriesPageState> {
  await refreshWeeklyReviewArtifactsSafely(store, state.localDay);
  const next = await loadGroceriesPage(store, state.localDay);
  return {
    ...next,
    saveNotice,
  };
}

export async function toggleGroceryItemPage(
  store: GroceriesPageStorage,
  state: GroceriesPageState,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<GroceriesPageState> {
  await setGroceryItemState(store, itemId, patch);
  return await refreshGroceriesPageAfterMutation(store, state, 'Grocery item updated.');
}

export async function addManualGroceryItemPage(
  store: GroceriesPageStorage,
  state: GroceriesPageState,
  draft: ManualGroceryDraft
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

  await saveManualGroceryItem(store, state.weeklyPlan.id, {
    rawLabel: [draft.quantityText.trim(), draft.label.trim()].filter(Boolean).join(' '),
  });
  return await refreshGroceriesPageAfterMutation(store, state, 'Manual grocery item added.');
}

export async function removeManualGroceryItemPage(
  store: GroceriesPageStorage,
  state: GroceriesPageState,
  itemId: string
): Promise<GroceriesPageState> {
  await removeManualGroceryItem(store, itemId);
  return await refreshGroceriesPageAfterMutation(store, state, 'Manual grocery item removed.');
}
