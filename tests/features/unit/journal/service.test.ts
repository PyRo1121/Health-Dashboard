import { describe, expect, it } from 'vitest';
import {
  deleteJournalEntry,
  listJournalEntriesForDay,
  saveJournalEntry,
} from '$lib/features/journal/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('journal service', () => {
  const getDb = useTestHealthDb('journal-service-test');

  it('creates and updates a journal entry', async () => {
    const db = getDb();
    const created = await saveJournalEntry(db, {
      localDay: '2026-04-02',
      entryType: 'freeform',
      title: 'Morning check-in',
      body: 'Woke up steady.',
      tags: ['sleep'],
      linkedEventIds: ['manual:2026-04-02:mood'],
    });

    const updated = await saveJournalEntry(db, {
      id: created.id,
      localDay: '2026-04-02',
      entryType: 'freeform',
      title: 'Morning check-in',
      body: 'Woke up steady and focused.',
      tags: ['sleep', 'focus'],
      linkedEventIds: ['manual:2026-04-02:mood'],
    });

    expect(updated.id).toBe(created.id);
    expect(await db.journalEntries.count()).toBe(1);
    expect((await listJournalEntriesForDay(db, '2026-04-02'))[0]?.body).toContain('focused');
  });

  it('deletes a journal entry cleanly', async () => {
    const db = getDb();
    const created = await saveJournalEntry(db, {
      localDay: '2026-04-02',
      entryType: 'evening_review',
      body: 'Closed the day calmly.',
      tags: [],
      linkedEventIds: [],
    });

    await deleteJournalEntry(db, created.id);
    expect(await listJournalEntriesForDay(db, '2026-04-02')).toEqual([]);
  });
});
