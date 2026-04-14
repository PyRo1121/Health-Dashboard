import type { RequestHandler } from './$types';
import { journalRequestSchema } from '$lib/features/journal/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  deleteJournalPageEntryServer,
  hydrateJournalIntentPageServer,
  loadJournalPageServer,
  saveJournalPageServer,
} from '$lib/server/journal/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: journalRequestSchema,
  invalidMessage: 'Invalid journal request payload.',
  handlers: {
    load: async (data) => await loadJournalPageServer(data.localDay, data.state),
    hydrateIntent: async (data) => await hydrateJournalIntentPageServer(data.state, data.intent),
    save: async (data) => await saveJournalPageServer(data.state),
    delete: async (data) => await deleteJournalPageEntryServer(data.state, data.id),
  },
});
