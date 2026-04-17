import type { RequestHandler } from './$types';
import { z } from 'zod';
import { searchClinicalConditionSuggestionsWithMetadata } from '$lib/server/health/clinical-tables';
import { createExternalSourceMetadata } from '$lib/core/domain/external-sources';

const symptomSearchRequestSchema = z.object({
  query: z.string(),
});

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid symptom search request payload.', { status: 400 });
  }

  const parsed = symptomSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid symptom search request payload.', { status: 400 });
  }

  const query = parsed.data.query.trim();
  if (!query) {
    return Response.json({
      suggestions: [],
      notice: '',
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    });
  }

  try {
    return Response.json(await searchClinicalConditionSuggestionsWithMetadata(query));
  } catch {
    return Response.json({
      suggestions: [],
      notice: 'Clinical condition suggestions unavailable right now.',
      metadata: createExternalSourceMetadata('clinical-tables-conditions', 'none', 'degraded'),
    });
  }
};
