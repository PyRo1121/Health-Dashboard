import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  deleteJournalPageEntry,
  loadJournalPage,
  saveJournalPage,
  type JournalPageState,
} from '$lib/features/journal/controller';

type JournalRequest =
  | { action: 'load'; localDay: string; state: JournalPageState }
  | { action: 'save'; state: JournalPageState }
  | { action: 'delete'; state: JournalPageState; id: string };

export const POST = createDbActionPostHandler<JournalRequest, JournalPageState>({
  load: (db, body) => loadJournalPage(db, body.localDay, body.state),
  save: (db, body) => saveJournalPage(db, body.state),
  delete: (db, body) => deleteJournalPageEntry(db, body.state, body.id),
});
