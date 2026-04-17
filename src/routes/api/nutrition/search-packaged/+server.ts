import type { RequestHandler } from './$types';
import { nutritionQueryRequestSchema } from '$lib/features/nutrition/contracts';
import type { SearchPackagedResponse } from '$lib/server/nutrition/service';
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
    return Response.json({
      matches: [],
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    } satisfies SearchPackagedResponse);
  }

  return Response.json(await searchPackagedFoodsServer(query));
};
