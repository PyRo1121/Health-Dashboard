import type { HealthDbJournalEntriesStore } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { JournalEntry } from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { updateRecordMeta } from '$lib/core/shared/records';

export type JournalEntriesStore = HealthDbJournalEntriesStore;

export interface JournalDraft {
  id?: string;
  localDay: string;
  entryType: JournalEntry['entryType'];
  title?: string;
  body: string;
  tags: string[];
  linkedEventIds: string[];
}

export function buildJournalEntryRecord(
  draft: JournalDraft,
  existing: JournalEntry | null | undefined,
  timestamp: string = nowIso()
): JournalEntry {
  const recordId = draft.id ?? createRecordId('journal');

  return {
    ...updateRecordMeta(existing, recordId, timestamp),
    localDay: draft.localDay,
    entryType: draft.entryType,
    title: draft.title,
    body: draft.body,
    tags: draft.tags,
    linkedEventIds: draft.linkedEventIds,
  };
}

export async function saveJournalEntry(
  store: JournalEntriesStore,
  draft: JournalDraft
): Promise<JournalEntry> {
  const existing = draft.id ? await store.journalEntries.get(draft.id) : null;
  const entry = buildJournalEntryRecord(draft, existing);

  await store.journalEntries.put(entry);
  return entry;
}

export async function deleteJournalEntry(store: JournalEntriesStore, id: string): Promise<void> {
  await store.journalEntries.delete(id);
}

export function sortJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listJournalEntriesForDay(
  store: JournalEntriesStore,
  localDay: string
): Promise<JournalEntry[]> {
  return sortJournalEntries(
    await store.journalEntries.where('localDay').equals(localDay).toArray()
  );
}
