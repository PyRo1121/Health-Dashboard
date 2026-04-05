import type { HealthDatabase } from '$lib/core/db/types';
import type { GroceryItem, RecipeCatalogItem, WeeklyPlan } from '$lib/core/domain/types';
import { listRecipeCatalogItems } from '$lib/features/nutrition/service';
import { ensureWeeklyPlan } from '$lib/features/planning/service';
import { refreshWeeklyReviewArtifacts } from '$lib/features/review/service';
import {
  deriveWeeklyGroceriesWithWarnings,
  removeManualGroceryItem,
  saveManualGroceryItem,
  setGroceryItemState,
} from './service';

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
  db: HealthDatabase,
  localDay: string
): Promise<GroceriesPageState> {
  const weeklyPlan = await ensureWeeklyPlan(db, localDay);
  const recipeCatalogItems = await listRecipeCatalogItems(db);
  const groceryResult = await deriveWeeklyGroceriesWithWarnings(
    db,
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

export async function toggleGroceryItemPage(
  db: HealthDatabase,
  state: GroceriesPageState,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<GroceriesPageState> {
  await setGroceryItemState(db, itemId, patch);
  await refreshWeeklyReviewArtifacts(db, state.localDay);
  const next = await loadGroceriesPage(db, state.localDay);
  return {
    ...next,
    saveNotice: 'Grocery item updated.',
  };
}

export async function addManualGroceryItemPage(
  db: HealthDatabase,
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

  await saveManualGroceryItem(db, state.weeklyPlan.id, {
    rawLabel: [draft.quantityText.trim(), draft.label.trim()].filter(Boolean).join(' '),
  });
  await refreshWeeklyReviewArtifacts(db, state.localDay);
  const next = await loadGroceriesPage(db, state.localDay);
  return {
    ...next,
    saveNotice: 'Manual grocery item added.',
  };
}

export async function removeManualGroceryItemPage(
  db: HealthDatabase,
  state: GroceriesPageState,
  itemId: string
): Promise<GroceriesPageState> {
  await removeManualGroceryItem(db, itemId);
  await refreshWeeklyReviewArtifacts(db, state.localDay);
  const next = await loadGroceriesPage(db, state.localDay);
  return {
    ...next,
    saveNotice: 'Manual grocery item removed.',
  };
}
