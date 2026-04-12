import type { HealthDbHealthEventsStore } from '$lib/core/db/types';
import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import {
  createEmptyJournalDraft,
  createJournalContextRows,
  normalizeJournalDraft,
  type JournalLinkedContextRow,
} from './model';
import {
  deleteJournalEntry,
  listJournalEntriesForDay,
  saveJournalEntry,
  type JournalDraft,
  type JournalEntriesStore,
} from '$lib/features/journal/service';
import type { JournalIntent } from './navigation';

export interface JournalPageStorage extends JournalEntriesStore, HealthDbHealthEventsStore {}

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
  store: JournalPageStorage,
  localDay: string
): Promise<HealthEvent[]> {
  return (await store.healthEvents.where('localDay').equals(localDay).toArray()).sort(
    (left, right) =>
      (right.sourceTimestamp ?? right.updatedAt).localeCompare(
        left.sourceTimestamp ?? left.updatedAt
      )
  );
}

async function loadJournalContextRows(
  store: JournalPageStorage,
  localDay: string,
  linkedEventIds: string[]
): Promise<JournalLinkedContextRow[]> {
  return createJournalContextRows(await listLinkedJournalEvents(store, localDay), linkedEventIds);
}

export async function loadJournalPage(
  store: JournalPageStorage,
  localDay: string,
  state: JournalPageState
): Promise<JournalPageState> {
  const loaded = await loadLocalDayPageState(
    state,
    localDay,
    (day) => listJournalEntriesForDay(store, day),
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

  return {
    ...loaded,
    linkedContextRows: await loadJournalContextRows(store, localDay, loaded.draft.linkedEventIds),
  };
}

export function beginJournalSave(state: JournalPageState): JournalPageState {
  return {
    ...state,
    saving: true,
    saveNotice: '',
  };
}

async function refreshJournalEntries(
  store: JournalPageStorage,
  state: JournalPageState,
  overrides: Partial<JournalPageState> = {}
): Promise<JournalPageState> {
  const next = await reloadLocalDayPageState(
    state,
    (localDay) => listJournalEntriesForDay(store, localDay),
    (current, entries) => ({
      ...current,
      entries,
    }),
    overrides
  );

  return {
    ...next,
    linkedContextRows: await loadJournalContextRows(
      store,
      next.localDay,
      next.draft.linkedEventIds
    ),
  };
}

export async function saveJournalPage(
  store: JournalPageStorage,
  state: JournalPageState
): Promise<JournalPageState> {
  const saved = await saveJournalEntry(store, normalizeJournalDraft(state.draft, state.localDay));
  return await refreshJournalEntries(store, state, {
    saving: false,
    saveNotice: saved.title ? `${saved.title} saved.` : 'Entry saved.',
    draft: createEmptyJournalDraft(state.localDay),
    linkedContextRows: [],
  });
}

export async function deleteJournalPageEntry(
  store: JournalPageStorage,
  state: JournalPageState,
  id: string
): Promise<JournalPageState> {
  await deleteJournalEntry(store, id);
  return await refreshJournalEntries(store, state);
}

export async function hydrateJournalIntentPage(
  store: JournalPageStorage,
  state: JournalPageState,
  intent: JournalIntent
): Promise<JournalPageState> {
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
    linkedContextRows: await loadJournalContextRows(store, intent.localDay, intent.linkedEventIds),
  };
}

export function toggleJournalContextEvent(
  state: JournalPageState,
  eventId: string
): JournalPageState {
  const linkedEventIds = state.draft.linkedEventIds.includes(eventId)
    ? state.draft.linkedEventIds.filter((id) => id !== eventId)
    : [...state.draft.linkedEventIds, eventId];

  return {
    ...state,
    draft: {
      ...state.draft,
      linkedEventIds,
    },
    linkedContextRows: state.linkedContextRows.map((row) =>
      row.id === eventId ? { ...row, selected: !row.selected } : row
    ),
  };
}
