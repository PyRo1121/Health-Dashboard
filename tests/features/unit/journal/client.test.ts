import { afterEach, describe, expect, it, vi } from 'vitest';

describe('journal client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes journal actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/journal/client.ts');
    const state: ReturnType<typeof client.createJournalPageState> = {
      ...client.createJournalPageState(),
      localDay: '2026-04-04',
      linkedContextRows: [],
      draft: {
        localDay: '2026-04-04',
        entryType: 'freeform',
        title: 'Morning check-in',
        body: 'Woke up steady and ready to work.',
        tags: [],
        linkedEventIds: [],
      },
    };

    await client.loadJournalPage(state, '2026-04-04');
    await client.hydrateJournalIntent(state, {
      source: 'today-recovery',
      localDay: '2026-04-04',
      entryType: 'symptom_note',
      title: 'Recovery note',
      body: 'Crowded store and headache drained the afternoon.',
      linkedEventIds: ['symptom-1', 'anxiety-1'],
    });
    await client.saveJournalPage(state);
    await client.deleteJournalPageEntry(state, 'journal-entry-1');

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/journal');
    expect(stateAction).toHaveBeenNthCalledWith(1, 'load', state, expect.any(Function), {
      localDay: '2026-04-04',
    });
    expect(stateAction).toHaveBeenNthCalledWith(2, 'hydrateIntent', state, expect.any(Function), {
      intent: {
        source: 'today-recovery',
        localDay: '2026-04-04',
        entryType: 'symptom_note',
        title: 'Recovery note',
        body: 'Crowded store and headache drained the afternoon.',
        linkedEventIds: ['symptom-1', 'anxiety-1'],
      },
    });
    expect(stateAction).toHaveBeenNthCalledWith(3, 'save', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(4, 'delete', state, expect.any(Function), {
      id: 'journal-entry-1',
    });
    expect(action).not.toHaveBeenCalled();
  });
});
