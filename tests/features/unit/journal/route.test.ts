import { afterEach, describe, expect, it, vi } from 'vitest';

describe('journal route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/journal/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadJournalPageServer?: ReturnType<typeof vi.fn>;
    hydrateJournalIntentPageServer?: ReturnType<typeof vi.fn>;
    saveJournalPageServer?: ReturnType<typeof vi.fn>;
    deleteJournalPageEntryServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/journal/service', () => ({
      loadJournalPageServer:
        overrides.loadJournalPageServer ??
        vi.fn(async () => ({
          loading: false,
          saving: false,
          localDay: '2026-04-04',
          saveNotice: '',
          entries: [],
          linkedContextRows: [],
          draft: {
            localDay: '2026-04-04',
            entryType: 'freeform',
            title: '',
            body: '',
            tags: [],
            linkedEventIds: [],
          },
        })),
      saveJournalPageServer:
        overrides.saveJournalPageServer ??
        vi.fn(async (state) => ({ ...state, saveNotice: 'Entry saved.' })),
      hydrateJournalIntentPageServer:
        overrides.hydrateJournalIntentPageServer ??
        vi.fn(async (state) => ({ ...state, saveNotice: 'Loaded from today recovery.' })),
      deleteJournalPageEntryServer:
        overrides.deleteJournalPageEntryServer ??
        vi.fn(async (state) => ({ ...state, saveNotice: '' })),
    }));
    return await import('../../../../src/routes/api/journal/+server.ts');
  }

  it('loads, saves, hydrates, and deletes through the server route', async () => {
    const { POST } = await importRoute({});
    const state = {
      loading: false,
      saving: false,
      localDay: '2026-04-04',
      saveNotice: '',
      entries: [],
      linkedContextRows: [],
      draft: {
        localDay: '2026-04-04',
        entryType: 'freeform',
        title: '',
        body: '',
        tags: [],
        linkedEventIds: [],
      },
    };
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/journal', {
            method: 'POST',
            body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ localDay: '2026-04-04' }));
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/journal', {
            method: 'POST',
            body: JSON.stringify({ action: 'save', state }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: 'Entry saved.' }));
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/journal', {
            method: 'POST',
            body: JSON.stringify({
              action: 'hydrateIntent',
              state,
              intent: {
                source: 'today-recovery',
                localDay: '2026-04-04',
                entryType: 'symptom_note',
                title: 'Recovery note',
                body: 'Crowded store and headache drained the afternoon.',
                linkedEventIds: ['symptom-1', 'anxiety-1'],
              },
            }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: 'Loaded from today recovery.' }));
    expect(
      await (
        await POST({
          request: new Request('http://health.test/api/journal', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', state, id: 'journal-entry-1' }),
          }),
        } as Parameters<typeof POST>[0])
      ).json()
    ).toEqual(expect.objectContaining({ saveNotice: '' }));
  });

  it('returns 400 for invalid journal payloads', async () => {
    const { POST } = await importRoute({});
    const response = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({ action: 'save' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid journal request payload.');

    const state = {
      loading: false,
      saving: false,
      localDay: '2026-04-04',
      saveNotice: '',
      entries: [],
      linkedContextRows: [],
      draft: {
        localDay: '2026-04-04',
        entryType: 'bogus',
        title: '',
        body: '',
        tags: [],
        linkedEventIds: [],
      },
    };

    const invalidDraftEntryType = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalidDraftEntryType.status).toBe(400);
    expect(await invalidDraftEntryType.text()).toBe('Invalid journal request payload.');

    const validState = {
      ...state,
      draft: {
        ...state.draft,
        entryType: 'freeform',
      },
    };

    const invalidIntentEntryType = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({
          action: 'hydrateIntent',
          state: validState,
          intent: {
            source: 'today-recovery',
            localDay: '2026-04-04',
            entryType: 'bogus',
            title: 'Recovery note',
            body: 'Crowded store and headache drained the afternoon.',
            linkedEventIds: ['symptom-1'],
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalidIntentEntryType.status).toBe(400);
    expect(await invalidIntentEntryType.text()).toBe('Invalid journal request payload.');

    const invalidIntentSource = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({
          action: 'hydrateIntent',
          state: validState,
          intent: {
            source: 'bogus',
            localDay: '2026-04-04',
            entryType: 'symptom_note',
            title: 'Recovery note',
            body: 'Crowded store and headache drained the afternoon.',
            linkedEventIds: ['symptom-1'],
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(invalidIntentSource.status).toBe(400);
    expect(await invalidIntentSource.text()).toBe('Invalid journal request payload.');
  });
});
