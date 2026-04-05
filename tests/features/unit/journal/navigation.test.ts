import { describe, expect, it } from 'vitest';
import {
  buildJournalIntentHref,
  clearJournalIntentFromLocation,
  readJournalIntentFromSearch,
} from '$lib/features/journal/navigation';

describe('journal navigation', () => {
  it('builds, reads, and clears a journal intent', () => {
    const href = buildJournalIntentHref({
      source: 'today-recovery',
      localDay: '2026-04-05',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });

    expect(href).toMatch(/^\/journal\?/);

    const intent = readJournalIntentFromSearch(href.slice('/journal'.length));
    expect(intent).toEqual({
      source: 'today-recovery',
      localDay: '2026-04-05',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });

    const location = {
      pathname: '/journal',
      search: href.slice('/journal'.length),
      hash: '',
    } as Pick<Location, 'pathname' | 'search' | 'hash'>;
    const history = {
      state: null,
      replaceState: (_state: unknown, _title: string, url: string) => {
        expect(url).toBe('/journal');
      },
    } as Pick<History, 'replaceState' | 'state'>;

    clearJournalIntentFromLocation(location, history);
  });
});
