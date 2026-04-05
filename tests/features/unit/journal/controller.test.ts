import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  beginJournalSave,
  createJournalPageState,
  deleteJournalPageEntry,
  hydrateJournalIntentPage,
  loadJournalPage,
  saveJournalPage,
} from '$lib/features/journal/controller';

describe('journal controller', () => {
  const getDb = useTestHealthDb('journal-page-controller');

  it('loads, saves, and deletes journal state', async () => {
    const db = getDb();
    let state = await loadJournalPage(db, '2026-04-02', createJournalPageState());
    state = beginJournalSave({
      ...state,
      draft: {
        ...state.draft,
        localDay: '2026-04-02',
        title: 'Morning check-in',
        body: 'Woke up steady and ready to work.',
      },
    });
    state = await saveJournalPage(db, state);

    expect(state.saveNotice).toBe('Morning check-in saved.');
    expect(state.entries).toHaveLength(1);

    state = await deleteJournalPageEntry(db, state, state.entries[0]!.id);
    expect(state.entries).toEqual([]);
  });

  it('hydrates a journal intent with linked context rows', async () => {
    const db = getDb();
    await db.healthEvents.put({
      id: 'symptom-1',
      createdAt: '2026-04-04T09:00:00.000Z',
      updatedAt: '2026-04-04T09:00:00.000Z',
      sourceType: 'manual',
      sourceApp: 'personal-health-cockpit',
      sourceRecordId: 'symptom:1',
      sourceTimestamp: '2026-04-04T09:00:00.000Z',
      localDay: '2026-04-04',
      timezone: 'UTC',
      confidence: 1,
      eventType: 'symptom',
      value: 4,
      payload: {
        kind: 'symptom',
        symptom: 'Headache',
        severity: 4,
      },
    });

    const loaded = await loadJournalPage(db, '2026-04-04', createJournalPageState());
    const state = await hydrateJournalIntentPage(db, loaded, {
      source: 'today-recovery',
      localDay: '2026-04-04',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1'],
    });

    expect(state.saveNotice).toBe('Loaded from today recovery.');
    expect(state.draft.title).toBe('Recovery note');
    expect(state.linkedContextRows).toEqual([
      expect.objectContaining({
        id: 'symptom-1',
        label: 'Symptom',
        valueLabel: '4',
      }),
    ]);
  });
});
