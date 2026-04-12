import type { RequestHandler } from './$types';
import type { ExerciseCatalogItem } from '$lib/core/domain/types';
import { movementQueryRequestSchema } from '$lib/features/movement/contracts';
import { searchMovementExercisesServer } from '$lib/server/movement/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid exercise search request payload.', { status: 400 });
  }

  const parsed = movementQueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid exercise search request payload.', { status: 400 });
  }

  const query = parsed.data.query?.trim() ?? '';
  if (!query) {
    return Response.json([] satisfies ExerciseCatalogItem[]);
  }

  return Response.json(await searchMovementExercisesServer(query));
};
