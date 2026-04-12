import type { RequestHandler } from './$types';
import { movementRequestSchema } from '$lib/features/movement/contracts';
import {
  loadMovementPageServer,
  saveMovementWorkoutTemplatePageServer,
} from '$lib/server/movement/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid movement request payload.', { status: 400 });
  }

  const parsed = movementRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid movement request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadMovementPageServer());
    case 'saveWorkoutTemplate':
      return Response.json(await saveMovementWorkoutTemplatePageServer(parsed.data.state));
  }
};
