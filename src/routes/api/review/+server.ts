import type { RequestHandler } from './$types';
import {
  loadReviewPageServer,
  saveReviewExperimentPageServer,
} from '$lib/server/review/service';
import { reviewRequestSchema } from '$lib/features/review/contracts';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid review request payload.', { status: 400 });
  }

  const parsed = reviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid review request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadReviewPageServer(parsed.data.localDay));
    case 'saveExperiment':
      return Response.json(await saveReviewExperimentPageServer(parsed.data.state));
  }
};
