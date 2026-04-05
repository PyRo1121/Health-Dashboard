import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  beginJournalSave,
  createJournalPageState,
  deleteJournalPageEntry as deleteJournalPageEntryController,
  hydrateJournalIntentPage as hydrateJournalIntentPageController,
  loadJournalPage as loadJournalPageController,
  saveJournalPage as saveJournalPageController,
  toggleJournalContextEvent as toggleJournalContextEventController,
  type JournalPageState,
} from './controller';
import type { JournalIntent } from './navigation';

export { beginJournalSave, createJournalPageState };

const journalClient = createFeatureActionClient('/api/journal');

export async function loadJournalPage(
  state: JournalPageState,
  localDay = currentLocalDay()
): Promise<JournalPageState> {
  return await journalClient.stateAction(
    'load',
    state,
    (db) => loadJournalPageController(db, localDay, state),
    { localDay }
  );
}

export async function saveJournalPage(state: JournalPageState): Promise<JournalPageState> {
  return await journalClient.stateAction('save', state, (db) =>
    saveJournalPageController(db, state)
  );
}

export async function hydrateJournalIntent(
  state: JournalPageState,
  intent: JournalIntent
): Promise<JournalPageState> {
  return await journalClient.stateAction(
    'hydrateIntent',
    state,
    (db) => hydrateJournalIntentPageController(db, state, intent),
    { intent }
  );
}

export function toggleJournalContextEvent(
  state: JournalPageState,
  eventId: string
): JournalPageState {
  return toggleJournalContextEventController(state, eventId);
}

export async function deleteJournalPageEntry(
  state: JournalPageState,
  id: string
): Promise<JournalPageState> {
  return await journalClient.stateAction(
    'delete',
    state,
    (db) => deleteJournalPageEntryController(db, state, id),
    { id }
  );
}
