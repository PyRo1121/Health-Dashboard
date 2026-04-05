import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  deleteJournalPageEntry,
  hydrateJournalIntentPage,
  loadJournalPage,
  saveJournalPage,
  type JournalPageState,
} from '$lib/features/journal/controller';
import type { JournalIntent } from '$lib/features/journal/navigation';

type JournalRequest =
  | { action: 'load'; localDay: string; state: JournalPageState }
  | { action: 'hydrateIntent'; state: JournalPageState; intent: JournalIntent }
  | { action: 'save'; state: JournalPageState }
  | { action: 'delete'; state: JournalPageState; id: string };

export const POST = createDbActionPostHandler<JournalRequest, JournalPageState>({
  load: (db, body) => loadJournalPage(db, body.localDay, body.state),
  hydrateIntent: (db, body) => hydrateJournalIntentPage(db, body.state, body.intent),
  save: (db, body) => saveJournalPage(db, body.state),
  delete: (db, body) => deleteJournalPageEntry(db, body.state, body.id),
});
