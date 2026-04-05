import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createGroceriesPageState,
  loadGroceriesPage as loadGroceriesPageController,
  toggleGroceryItemPage as toggleGroceryItemPageController,
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
