import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  addManualGroceryItemPage,
  loadGroceriesPage,
  removeManualGroceryItemPage,
  toggleGroceryItemPage,
  type ManualGroceryDraft,
  type GroceriesPageState,
} from '$lib/features/groceries/controller';

type GroceriesRequest =
  | { action: 'load'; localDay: string }
  | {
      action: 'toggle';
      state: GroceriesPageState;
      itemId: string;
      patch: { checked: boolean; excluded: boolean; onHand: boolean };
    }
  | {
      action: 'addManual';
      state: GroceriesPageState;
      draft: ManualGroceryDraft;
    }
  | {
      action: 'removeManual';
      state: GroceriesPageState;
      itemId: string;
    };

export const POST = createDbActionPostHandler<GroceriesRequest, GroceriesPageState>({
  load: (db, body) => loadGroceriesPage(db, body.localDay),
  toggle: (db, body) => toggleGroceryItemPage(db, body.state, body.itemId, body.patch),
  addManual: (db, body) => addManualGroceryItemPage(db, body.state, body.draft),
  removeManual: (db, body) => removeManualGroceryItemPage(db, body.state, body.itemId),
});
