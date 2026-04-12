import type { RequestHandler } from './$types';
import { assessmentsRequestSchema } from '$lib/features/assessments/contracts';
import {
  loadAssessmentsPageServer,
  saveAssessmentsProgressPageServer,
  submitAssessmentsPageServer,
} from '$lib/server/assessments/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid assessments request payload.', { status: 400 });
  }

  const parsed = assessmentsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid assessments request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(
        await loadAssessmentsPageServer(parsed.data.localDay, parsed.data.state)
      );
    case 'saveProgress':
      return Response.json(await saveAssessmentsProgressPageServer(parsed.data.state));
    case 'submit':
      return Response.json(await submitAssessmentsPageServer(parsed.data.state));
  }
};
