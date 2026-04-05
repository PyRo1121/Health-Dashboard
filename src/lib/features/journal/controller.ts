import type { HealthDatabase } from '$lib/core/db/types';
import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';
import type { JournalEntry } from '$lib/core/domain/types';
import {
  createEmptyJournalDraft,
  createJournalLinkedContextRows,
  normalizeJournalDraft,
  type JournalLinkedContextRow,
} from './model';
import {
  deleteJournalEntry,
  listJournalEntriesForDay,
  saveJournalEntry,
  type JournalDraft,
} from '$lib/features/journal/service';
import type { JournalIntent } from './navigation';

export interface JournalPageState {
  loading: boolean;
  saving: boolean;
  localDay: string;
  saveNotice: string;
  entries: JournalEntry[];
  draft: JournalDraft;
  linkedContextRows: JournalLinkedContextRow[];
}

export function createJournalPageState(): JournalPageState {
  return createLocalDayPageState({
    saving: false,
    entries: [],
    draft: createEmptyJournalDraft(''),
    linkedContextRows: [],
  });
}

async function listLinkedJournalEvents(
  db: HealthDatabase,
  linkedEventIds: string[]
): Promise<import('$lib/core/domain/types').HealthEvent[]> {
  const events = await Promise.all(linkedEventIds.map((id) => db.healthEvents.get(id)));
  return events.filter((event): event is NonNullable<typeof event> => Boolean(event));
}

export async function loadJournalPage(
  db: HealthDatabase,
  localDay: string,
  state: JournalPageState
): Promise<JournalPageState> {
  return await loadLocalDayPageState(
    state,
    localDay,
    (day) => listJournalEntriesForDay(db, day),
    (current, nextLocalDay, entries) => ({
      ...current,
      loading: false,
      localDay: nextLocalDay,
      entries,
      linkedContextRows: [],
      draft: {
        ...current.draft,
        localDay: nextLocalDay,
      },
    })
  );
}

export function beginJournalSave(state: JournalPageState): JournalPageState {
  return {
    ...state,
    saving: true,
    saveNotice: '',
  };
}

async function refreshJournalEntries(
  db: HealthDatabase,
  state: JournalPageState,
  overrides: Partial<JournalPageState> = {}
): Promise<JournalPageState> {
  return await reloadLocalDayPageState(
    state,
    (localDay) => listJournalEntriesForDay(db, localDay),
    (current, entries) => ({
      ...current,
      entries,
    }),
    overrides
  );
}

export async function saveJournalPage(
  db: HealthDatabase,
  state: JournalPageState
): Promise<JournalPageState> {
  const saved = await saveJournalEntry(db, normalizeJournalDraft(state.draft, state.localDay));
  return await refreshJournalEntries(db, state, {
    saving: false,
    saveNotice: saved.title ? `${saved.title} saved.` : 'Entry saved.',
    draft: createEmptyJournalDraft(state.localDay),
    linkedContextRows: [],
  });
}

export async function deleteJournalPageEntry(
  db: HealthDatabase,
  state: JournalPageState,
  id: string
): Promise<JournalPageState> {
  await deleteJournalEntry(db, id);
  return await refreshJournalEntries(db, state);
}

export async function hydrateJournalIntentPage(
  db: HealthDatabase,
  state: JournalPageState,
  intent: JournalIntent
): Promise<JournalPageState> {
  const linkedEvents = await listLinkedJournalEvents(db, intent.linkedEventIds);

  return {
    ...state,
    loading: false,
    localDay: intent.localDay,
    saveNotice:
      intent.source === 'today-recovery'
        ? 'Loaded from today recovery.'
        : 'Loaded from review context.',
    draft: {
      ...state.draft,
      localDay: intent.localDay,
      entryType: intent.entryType,
      title: intent.title,
      body: intent.body,
      linkedEventIds: [...intent.linkedEventIds],
    },
    linkedContextRows: createJournalLinkedContextRows(linkedEvents),
  };
}
