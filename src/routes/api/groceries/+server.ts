import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  addManualGroceryItemPage,
  loadGroceriesPage,
  removeManualGroceryItemPage,
  toggleGroceryItemPage,
  type GroceriesPageState,
} from '$lib/features/groceries/controller';
import { groceriesRequestSchema, type GroceriesRequest } from '$lib/features/groceries/contracts';

export const POST = createDbActionPostHandler<GroceriesRequest, GroceriesPageState>(
  {
    load: (db, body) => loadGroceriesPage(db, body.localDay),
    toggle: (db, body) => toggleGroceryItemPage(db, body.state, body.itemId, body.patch),
    addManual: (db, body) => addManualGroceryItemPage(db, body.state, body.draft),
    removeManual: (db, body) => removeManualGroceryItemPage(db, body.state, body.itemId),
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = groceriesRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid groceries request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid groceries request payload.', { status: 400 }),
  }
);
