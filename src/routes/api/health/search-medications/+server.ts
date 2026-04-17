import type { RequestHandler } from './$types';
import { z } from 'zod';
import { searchRxNormMedicationSuggestionsWithMetadata } from '$lib/server/health/rxnorm';
import { createExternalSourceMetadata } from '$lib/core/domain/external-sources';

const medicationSearchRequestSchema = z.object({
  query: z.string(),
});

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid medication search request payload.', { status: 400 });
  }

  const parsed = medicationSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid medication search request payload.', { status: 400 });
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
    return Response.json(await searchRxNormMedicationSuggestionsWithMetadata(query));
  } catch {
    return Response.json({
      suggestions: [],
      notice: 'RxNorm suggestions unavailable right now.',
      metadata: createExternalSourceMetadata('rxnorm', 'none', 'degraded'),
    });
  }
};
