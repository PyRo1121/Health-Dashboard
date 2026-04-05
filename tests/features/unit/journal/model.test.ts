import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '$lib/core/domain/types';
import {
  createEmptyJournalDraft,
  createJournalEntryRows,
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
        linkedEventIds: [],
      } satisfies JournalEntry,
    ]);

    expect(normalized.title).toBe('Morning check-in');
    expect(normalized.body).toBe('Woke up steady.');
    expect(rows[0]?.title).toBe('Untitled entry');
  });
});
