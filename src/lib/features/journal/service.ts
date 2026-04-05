import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { JournalEntry } from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { updateRecordMeta } from '$lib/core/shared/records';

export interface JournalDraft {
  id?: string;
  localDay: string;
  entryType: JournalEntry['entryType'];
  title?: string;
  body: string;
  tags: string[];
  linkedEventIds: string[];
}

export async function saveJournalEntry(
  db: HealthDatabase,
  draft: JournalDraft
): Promise<JournalEntry> {
  const existing = draft.id ? await db.journalEntries.get(draft.id) : null;
  const timestamp = nowIso();
  const recordId = draft.id ?? createRecordId('journal');

  const entry: JournalEntry = {
    ...updateRecordMeta(existing, recordId, timestamp),
    localDay: draft.localDay,
    entryType: draft.entryType,
    title: draft.title,
    body: draft.body,
    tags: draft.tags,
    linkedEventIds: draft.linkedEventIds,
  };

  await db.journalEntries.put(entry);
  return entry;
}

export async function deleteJournalEntry(db: HealthDatabase, id: string): Promise<void> {
  await db.journalEntries.delete(id);
}

export async function listJournalEntriesForDay(
  db: HealthDatabase,
  localDay: string
): Promise<JournalEntry[]> {
  const entries = await db.journalEntries.where('localDay').equals(localDay).toArray();
  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
