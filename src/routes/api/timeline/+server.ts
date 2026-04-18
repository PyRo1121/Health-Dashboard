import { z } from 'zod';
import type { RequestHandler } from './$types';
import type { TimelinePageState } from '$lib/features/timeline/controller';
import { sourceTypes } from '$lib/core/domain/types';
import { loadTimelinePageServer } from '$lib/server/timeline/service';

const timelineEventSchema = z
  .object({
    sourceType: z.enum(sourceTypes),
  })
  .passthrough();

const timelineEventItemSchema = z
  .object({
    event: timelineEventSchema,
    label: z.string(),
    valueLabel: z.string(),
    sourceLabel: z.string(),
  })
  .passthrough();

const timelinePageStateSchema = z.object({
  loading: z.boolean(),
  filter: z.union([z.literal('all'), z.enum(sourceTypes)]),
  items: z.array(timelineEventItemSchema),
});

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid timeline request payload.', { status: 400 });
  }

  const parsed = z
    .object({
      action: z.literal('load'),
      state: timelinePageStateSchema,
    })
    .safeParse(body);

  if (!parsed.success) {
    return new Response('Invalid timeline request payload.', { status: 400 });
  }

  return Response.json(
    await loadTimelinePageServer(parsed.data.state as unknown as TimelinePageState)
  );
};
