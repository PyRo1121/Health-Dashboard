import type { RequestHandler } from './$types';
import type { RecipeCatalogItem } from '$lib/core/domain/types';
import { nutritionQueryRequestSchema } from '$lib/features/nutrition/contracts';
import { searchRecipesServer } from '$lib/server/nutrition/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid recipe search request payload.', { status: 400 });
  }

  const parsed = nutritionQueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid recipe search request payload.', { status: 400 });
  }

  const query = parsed.data.query?.trim() ?? '';
  if (!query) {
    return Response.json([] satisfies RecipeCatalogItem[]);
  }

  return Response.json(await searchRecipesServer(query));
};
