import type { RequestHandler } from './$types';
import { groceriesRequestSchema } from '$lib/features/groceries/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  addManualGroceryItemPageServer,
  loadGroceriesPageServer,
  removeManualGroceryItemPageServer,
  toggleGroceryItemPageServer,
} from '$lib/server/groceries/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: groceriesRequestSchema,
  invalidMessage: 'Invalid groceries request payload.',
  handlers: {
    load: async (data) => await loadGroceriesPageServer(data.localDay),
    toggle: async (data) => await toggleGroceryItemPageServer(data.state, data.itemId, data.patch),
    addManual: async (data) => await addManualGroceryItemPageServer(data.state, data.draft),
    removeManual: async (data) => await removeManualGroceryItemPageServer(data.state, data.itemId),
  },
});
