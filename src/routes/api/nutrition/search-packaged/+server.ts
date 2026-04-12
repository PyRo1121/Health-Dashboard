import type { RequestHandler } from './$types';
import type { FoodLookupResult } from '$lib/features/nutrition/types';
import { nutritionQueryRequestSchema } from '$lib/features/nutrition/contracts';
import { searchPackagedFoodsServer } from '$lib/server/nutrition/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid packaged search request payload.', { status: 400 });
  }

  const parsed = nutritionQueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid packaged search request payload.', { status: 400 });
  }

  const query = parsed.data.query?.trim() ?? '';
  if (!query) {
    return Response.json([] satisfies FoodLookupResult[]);
  }

  return Response.json(await searchPackagedFoodsServer(query));
};
