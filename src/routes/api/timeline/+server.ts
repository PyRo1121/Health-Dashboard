import { z } from 'zod';
import type { RequestHandler } from './$types';
import {
  loadTimelinePageServer,
  type TimelineEventItem,
  type TimelineSourceFilter,
} from '$lib/server/timeline/service';

const timelinePageStateSchema = z.object({
  loading: z.boolean(),
  filter: z.custom<TimelineSourceFilter>(),
  items: z.array(z.custom<TimelineEventItem>()),
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

  return Response.json(await loadTimelinePageServer(parsed.data.state));
};
