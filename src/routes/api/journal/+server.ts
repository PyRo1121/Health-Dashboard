import type { RequestHandler } from './$types';
import { journalRequestSchema } from '$lib/features/journal/contracts';
import {
  deleteJournalPageEntryServer,
  hydrateJournalIntentPageServer,
  loadJournalPageServer,
  saveJournalPageServer,
} from '$lib/server/journal/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid journal request payload.', { status: 400 });
  }

  const parsed = journalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid journal request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadJournalPageServer(parsed.data.localDay, parsed.data.state));
    case 'hydrateIntent':
      return Response.json(
        await hydrateJournalIntentPageServer(parsed.data.state, parsed.data.intent)
      );
    case 'save':
      return Response.json(await saveJournalPageServer(parsed.data.state));
    case 'delete':
      return Response.json(await deleteJournalPageEntryServer(parsed.data.state, parsed.data.id));
  }
};
