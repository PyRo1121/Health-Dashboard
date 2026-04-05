import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('assessments route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/assessments/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadAssessmentsPage?: ReturnType<typeof vi.fn>;
    saveAssessmentsProgressPage?: ReturnType<typeof vi.fn>;
    submitAssessmentsPage?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/assessments/controller', () => ({
      loadAssessmentsPage:
        overrides.loadAssessmentsPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          instrument: 'PHQ-9',
          draftResponses: [],
          latest: undefined,
          saveNotice: '',
          validationError: '',
          safetyMessage: '',
        })),
      saveAssessmentsProgressPage:
        overrides.saveAssessmentsProgressPage ??
        vi.fn(async (_db: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Progress saved.',
        })),
      submitAssessmentsPage:
        overrides.submitAssessmentsPage ??
        vi.fn(async (_db: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Assessment saved.',
        })),
    }));

    return await import('../../../../src/routes/api/assessments/+server.ts');
  }

  it('loads assessment page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadAssessmentsPage = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-04',
      instrument: 'PHQ-9',
      draftResponses: [1, 1, 1],
      latest: undefined,
      saveNotice: '',
      validationError: '',
      safetyMessage: '',
    }));
    const { POST } = await importRoute({ db, loadAssessmentsPage });

    const state = {
      loading: true,
      localDay: '',
      instrument: 'PHQ-9',
      draftResponses: [],
      latest: undefined,
      saveNotice: '',
      validationError: '',
      safetyMessage: '',
    };
    const response = await POST({
      request: new Request('http://health.test/api/assessments', {
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
    expect(loadAssessmentsPage).toHaveBeenCalledWith(db, '2026-04-04', state);
  });

  it('dispatches saveProgress and submit through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-04',
      instrument: 'PHQ-9',
      draftResponses: [1, 1, 1, 1, 1, 0, 0, 0, 0],
      latest: undefined,
      saveNotice: '',
      validationError: '',
      safetyMessage: '',
    };
    const saveAssessmentsProgressPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Progress saved.',
    }));
    const submitAssessmentsPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Assessment saved.',
    }));
    const { POST } = await importRoute({
      db,
      saveAssessmentsProgressPage,
      submitAssessmentsPage,
    });

    const saveResponse = await POST({
      request: new Request('http://health.test/api/assessments', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveProgress', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await saveResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Progress saved.' })
    );
    expect(saveAssessmentsProgressPage).toHaveBeenCalledWith(db, state);

    const submitResponse = await POST({
      request: new Request('http://health.test/api/assessments', {
        method: 'POST',
        body: JSON.stringify({ action: 'submit', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await submitResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Assessment saved.' })
    );
    expect(submitAssessmentsPage).toHaveBeenCalledWith(db, state);
  });
});
