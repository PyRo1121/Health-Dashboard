import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  addManualGroceryItemPage as addManualGroceryItemPageController,
  createGroceriesPageState,
  loadGroceriesPage as loadGroceriesPageController,
  removeManualGroceryItemPage as removeManualGroceryItemPageController,
  toggleGroceryItemPage as toggleGroceryItemPageController,
  type ManualGroceryDraft,
  type GroceriesPageState,
} from './controller';

export { createGroceriesPageState };

const groceriesClient = createFeatureActionClient('/api/groceries');

export async function loadGroceriesPage(localDay = currentLocalDay()): Promise<GroceriesPageState> {
  return await groceriesClient.action('load', (db) => loadGroceriesPageController(db, localDay), {
    localDay,
  });
}

export async function toggleGroceryItemPage(
  state: GroceriesPageState,
  itemId: string,
  patch: { checked: boolean; excluded: boolean; onHand: boolean }
): Promise<GroceriesPageState> {
  return await groceriesClient.stateAction(
    'toggle',
    state,
    (db) => toggleGroceryItemPageController(db, state, itemId, patch),
    { itemId, patch }
  );
}

export async function addManualGroceryItemPage(
  state: GroceriesPageState,
  draft: ManualGroceryDraft
): Promise<GroceriesPageState> {
  return await groceriesClient.stateAction(
    'addManual',
    state,
    (db) => addManualGroceryItemPageController(db, state, draft),
    { draft }
  );
}

export async function removeManualGroceryItemPage(
  state: GroceriesPageState,
  itemId: string
): Promise<GroceriesPageState> {
  return await groceriesClient.stateAction(
    'removeManual',
    state,
    (db) => removeManualGroceryItemPageController(db, state, itemId),
    { itemId }
  );
}
