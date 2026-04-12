import type { RequestHandler } from './$types';
import { groceriesRequestSchema } from '$lib/features/groceries/contracts';
import {
  addManualGroceryItemPageServer,
  loadGroceriesPageServer,
  removeManualGroceryItemPageServer,
  toggleGroceryItemPageServer,
} from '$lib/server/groceries/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid groceries request payload.', { status: 400 });
  }

  const parsed = groceriesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid groceries request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadGroceriesPageServer(parsed.data.localDay));
    case 'toggle':
      return Response.json(
        await toggleGroceryItemPageServer(parsed.data.state, parsed.data.itemId, parsed.data.patch)
      );
    case 'addManual':
      return Response.json(
        await addManualGroceryItemPageServer(parsed.data.state, parsed.data.draft)
      );
    case 'removeManual':
      return Response.json(
        await removeManualGroceryItemPageServer(parsed.data.state, parsed.data.itemId)
      );
  }
};
