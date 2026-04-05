import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadGroceriesPage,
  toggleGroceryItemPage,
  type GroceriesPageState,
} from '$lib/features/groceries/controller';

type GroceriesRequest =
  | { action: 'load'; localDay: string }
  | {
      action: 'toggle';
      state: GroceriesPageState;
      itemId: string;
      patch: { checked: boolean; excluded: boolean; onHand: boolean };
    };

export const POST = createDbActionPostHandler<GroceriesRequest, GroceriesPageState>({
  load: (db, body) => loadGroceriesPage(db, body.localDay),
  toggle: (db, body) => toggleGroceryItemPage(db, body.state, body.itemId, body.patch),
});
