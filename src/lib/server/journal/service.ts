import { eq } from 'drizzle-orm';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import {
  createEmptyJournalDraft,
  createJournalContextRows,
  normalizeJournalDraft,
} from '$lib/features/journal/model';
import type { JournalPageState } from '$lib/features/journal/controller';
import type { JournalIntent } from '$lib/features/journal/navigation';
import { buildJournalEntryRecord, sortJournalEntries } from '$lib/features/journal/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
} from '$lib/server/db/drizzle/mirror';

async function listJournalEntriesForDayServer(localDay: string): Promise<JournalEntry[]> {
  const { db } = getServerDrizzleClient();
  return sortJournalEntries(
    await selectMirrorRecordsByField<JournalEntry>(
      db,
      drizzleSchema.journalEntries,
      'localDay',
      localDay
    )
  );
}

async function listLinkedJournalEventsServer(localDay: string): Promise<HealthEvent[]> {
  const { db } = getServerDrizzleClient();
  return (
    await selectMirrorRecordsByField<HealthEvent>(
      db,
      drizzleSchema.healthEvents,
      'localDay',
      localDay
    )
  ).sort((left, right) =>
    (right.sourceTimestamp ?? right.updatedAt).localeCompare(left.sourceTimestamp ?? left.updatedAt)
  );
}

async function loadJournalContextRowsServer(localDay: string, linkedEventIds: string[]) {
  return createJournalContextRows(await listLinkedJournalEventsServer(localDay), linkedEventIds);
}

export async function loadJournalPageServer(
  localDay: string,
  state: JournalPageState
): Promise<JournalPageState> {
  const entries = await listJournalEntriesForDayServer(localDay);
  const next: JournalPageState = {
    ...state,
    loading: false,
    localDay,
    entries,
    linkedContextRows: [],
    draft: {
      ...state.draft,
      localDay,
    },
  };

  return {
    ...next,
    linkedContextRows: await loadJournalContextRowsServer(localDay, next.draft.linkedEventIds),
  };
}

async function refreshJournalEntriesServer(
  state: JournalPageState,
  overrides: Partial<JournalPageState> = {}
): Promise<JournalPageState> {
  const entries = await listJournalEntriesForDayServer(state.localDay);
  const next = {
    ...state,
    entries,
    ...overrides,
  };

  return {
    ...next,
    linkedContextRows: await loadJournalContextRowsServer(next.localDay, next.draft.linkedEventIds),
  };
}

export async function saveJournalPageServer(state: JournalPageState): Promise<JournalPageState> {
  const { db } = getServerDrizzleClient();
  const draft = normalizeJournalDraft(state.draft, state.localDay);
  const existing = draft.id
    ? await selectMirrorRecordById<JournalEntry>(db, drizzleSchema.journalEntries, draft.id)
    : null;
  const saved = buildJournalEntryRecord(draft, existing);
  await upsertMirrorRecord(db, 'journalEntries', drizzleSchema.journalEntries, saved);

  return await refreshJournalEntriesServer(state, {
    saving: false,
    saveNotice: saved.title ? `${saved.title} saved.` : 'Entry saved.',
    draft: createEmptyJournalDraft(state.localDay),
    linkedContextRows: [],
  });
}

export async function deleteJournalPageEntryServer(
  state: JournalPageState,
  id: string
): Promise<JournalPageState> {
  const { db } = getServerDrizzleClient();
  await db.delete(drizzleSchema.journalEntries).where(eq(drizzleSchema.journalEntries.id, id));
  return await refreshJournalEntriesServer(state);
}

export async function hydrateJournalIntentPageServer(
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
    linkedContextRows: await loadJournalContextRowsServer(intent.localDay, intent.linkedEventIds),
  };
}
