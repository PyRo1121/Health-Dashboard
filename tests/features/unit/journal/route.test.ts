import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('journal route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/journal/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadJournalPage?: ReturnType<typeof vi.fn>;
    saveJournalPage?: ReturnType<typeof vi.fn>;
    deleteJournalPageEntry?: ReturnType<typeof vi.fn>;
  }) {
    const db = overrides.db ?? ({} as HealthDatabase);
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0]
      ) =>
        actual.createDbActionPostHandler(handlers, {
          withDb: async (run) => await run(db),
          toResponse: (body) => Response.json(body),
        }),
    }));
    vi.doMock('$lib/features/journal/controller', () => ({
      loadJournalPage:
        overrides.loadJournalPage ??
        vi.fn(async () => ({
          loading: false,
          saving: false,
          localDay: '2026-04-04',
          saveNotice: '',
          entries: [],
          draft: {
            localDay: '2026-04-04',
            entryType: 'freeform',
            title: '',
            body: '',
            tags: [],
            linkedEventIds: [],
          },
        })),
      saveJournalPage:
        overrides.saveJournalPage ??
        vi.fn(async (_db: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Entry saved.',
        })),
      deleteJournalPageEntry:
        overrides.deleteJournalPageEntry ??
        vi.fn(async (_db: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: '',
        })),
    }));

    return await import('../../../../src/routes/api/journal/+server.ts');
  }

  it('loads journal page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadJournalPage = vi.fn(async () => ({
      loading: false,
      saving: false,
      localDay: '2026-04-04',
      saveNotice: '',
      entries: [],
      draft: {
        localDay: '2026-04-04',
        entryType: 'freeform',
        title: '',
        body: '',
        tags: [],
        linkedEventIds: [],
      },
    }));
    const { POST } = await importRoute({ db, loadJournalPage });

    const state = {
      loading: true,
      saving: false,
      localDay: '',
      saveNotice: '',
      entries: [],
      draft: {
        localDay: '',
        entryType: 'freeform',
        title: '',
        body: '',
        tags: [],
        linkedEventIds: [],
      },
    };
    const response = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-04',
        loading: false,
      })
    );
    expect(loadJournalPage).toHaveBeenCalledWith(db, '2026-04-04', state);
  });

  it('dispatches save and delete through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      saving: false,
      localDay: '2026-04-04',
      saveNotice: '',
      entries: [],
      draft: {
        localDay: '2026-04-04',
        entryType: 'freeform',
        title: 'Morning check-in',
        body: 'Woke up steady and ready to work.',
        tags: [],
        linkedEventIds: [],
      },
    };
    const saveJournalPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Morning check-in saved.',
    }));
    const deleteJournalPageEntry = vi.fn(async () => ({
      ...state,
      entries: [],
    }));
    const { POST } = await importRoute({ db, saveJournalPage, deleteJournalPageEntry });

    const saveResponse = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await saveResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Morning check-in saved.' })
    );
    expect(saveJournalPage).toHaveBeenCalledWith(db, state);

    const deleteResponse = await POST({
      request: new Request('http://health.test/api/journal', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', state, id: 'journal-entry-1' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await deleteResponse.json()).toEqual(expect.objectContaining({ entries: [] }));
    expect(deleteJournalPageEntry).toHaveBeenCalledWith(db, state, 'journal-entry-1');
  });
});
