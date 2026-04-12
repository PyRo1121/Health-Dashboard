import { describe, expect, it } from 'vitest';
import {
  buildStoredJournalIntentHref,
  readJournalIntentFromSearch,
} from '$lib/features/journal/navigation';

describe('journal navigation', () => {

  it('builds and consumes a stored journal intent without exposing body text in the URL', () => {
    const href = buildStoredJournalIntentHref({
      source: 'today-recovery',
      localDay: '2026-04-05',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });

    expect(href).toMatch(/^\/journal\?intentId=/);
    expect(href).not.toContain('Crowded%20store');
    expect(href).not.toContain('linkedEventIds');

    const intent = readJournalIntentFromSearch(href.slice('/journal'.length));
    expect(intent).toEqual({
      source: 'today-recovery',
      localDay: '2026-04-05',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });
  });
});
