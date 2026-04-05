import { describe, expect, it } from 'vitest';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
import {
  createJournalContextRows,
  createEmptyJournalDraft,
  createJournalEntryRows,
  createJournalLinkedContextRows,
  normalizeJournalDraft,
} from '$lib/features/journal/model';

describe('journal model', () => {
  it('builds and normalizes journal drafts and rows', () => {
    const draft = createEmptyJournalDraft('2026-04-02');
    const normalized = normalizeJournalDraft(
      {
        ...draft,
        title: '  Morning check-in  ',
        body: '  Woke up steady.  ',
        tags: ['focus'],
        linkedEventIds: ['manual:2026-04-02:mood'],
      },
      '2026-04-02'
    );
    const rows = createJournalEntryRows([
      {
        id: 'journal-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        localDay: '2026-04-02',
        entryType: 'freeform',
        body: 'Woke up steady.',
        tags: [],
        linkedEventIds: ['manual:2026-04-02:mood'],
      } satisfies JournalEntry,
    ]);
    const linkedRows = createJournalLinkedContextRows([
      {
        id: 'symptom-1',
        createdAt: '2026-04-02T09:00:00.000Z',
        updatedAt: '2026-04-02T09:00:00.000Z',
        sourceType: 'manual',
        sourceApp: 'personal-health-cockpit',
        sourceRecordId: 'symptom:1',
        sourceTimestamp: '2026-04-02T09:00:00.000Z',
        localDay: '2026-04-02',
        timezone: 'UTC',
        confidence: 1,
        eventType: 'symptom',
        value: 4,
        payload: {
          kind: 'symptom',
          symptom: 'Headache',
          severity: 4,
        },
      } satisfies HealthEvent,
    ]);

    expect(normalized.title).toBe('Morning check-in');
    expect(normalized.body).toBe('Woke up steady.');
    expect(rows[0]?.title).toBe('Untitled entry');
    expect(rows[0]?.contextLabel).toBe('1 linked signal');
    expect(linkedRows[0]).toMatchObject({
      label: 'Symptom',
      valueLabel: '4',
    });
  });

  it('marks selected journal context rows from linked event ids', () => {
    const rows = createJournalContextRows(
      [
        {
          id: 'symptom-1',
          createdAt: '2026-04-02T09:00:00.000Z',
          updatedAt: '2026-04-02T09:00:00.000Z',
          sourceType: 'manual',
          sourceApp: 'personal-health-cockpit',
          sourceRecordId: 'symptom:1',
          sourceTimestamp: '2026-04-02T09:00:00.000Z',
          localDay: '2026-04-02',
          timezone: 'UTC',
          confidence: 1,
          eventType: 'symptom',
          value: 4,
          payload: {
            kind: 'symptom',
            symptom: 'Headache',
            severity: 4,
          },
        } satisfies HealthEvent,
      ],
      ['symptom-1']
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'symptom-1',
        label: 'Symptom',
        selected: true,
      }),
    ]);
  });
});
