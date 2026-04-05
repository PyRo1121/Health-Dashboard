import type { HealthDatabase } from '$lib/core/db/types';
import type { GroceryItem, RecipeCatalogItem, WeeklyPlan } from '$lib/core/domain/types';
import { listRecipeCatalogItems } from '$lib/features/nutrition/service';
import { ensureWeeklyPlan } from '$lib/features/planning/service';
import { deriveWeeklyGroceriesWithWarnings, setGroceryItemState } from './service';

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
  const next = await loadGroceriesPage(db, state.localDay);
  return {
    ...next,
    saveNotice: 'Grocery item updated.',
  };
}
