import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('health route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/health/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadHealthPage?: ReturnType<typeof vi.fn>;
    saveSymptomPage?: ReturnType<typeof vi.fn>;
    saveAnxietyPage?: ReturnType<typeof vi.fn>;
    saveSleepNotePage?: ReturnType<typeof vi.fn>;
    saveTemplatePage?: ReturnType<typeof vi.fn>;
    quickLogTemplatePage?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/health/controller', () => ({
      loadHealthPage:
        overrides.loadHealthPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          snapshot: null,
          saveNotice: '',
          symptomForm: { symptom: '', severity: '3', note: '' },
          anxietyForm: { intensity: '3', trigger: '', durationMinutes: '', note: '' },
          sleepNoteForm: { note: '', restfulness: '', context: '' },
          templateForm: {
            label: '',
            templateType: 'supplement',
            defaultDose: '',
            defaultUnit: '',
            note: '',
          },
        })),
      saveSymptomPage:
        overrides.saveSymptomPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Symptom logged.',
        })),
      saveAnxietyPage:
        overrides.saveAnxietyPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Anxiety episode logged.',
        })),
      saveSleepNotePage:
        overrides.saveSleepNotePage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Sleep context logged.',
        })),
      saveTemplatePage:
        overrides.saveTemplatePage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Template saved.',
        })),
      quickLogTemplatePage:
        overrides.quickLogTemplatePage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Template logged.',
        })),
    }));

    return await import('../../../../src/routes/api/health/+server.ts');
  }

  it('loads health page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadHealthPage = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-04',
      snapshot: null,
      saveNotice: '',
      symptomForm: { symptom: '', severity: '3', note: '' },
      anxietyForm: { intensity: '3', trigger: '', durationMinutes: '', note: '' },
      sleepNoteForm: { note: '', restfulness: '', context: '' },
      templateForm: {
        label: '',
        templateType: 'supplement',
        defaultDose: '',
        defaultUnit: '',
        note: '',
      },
    }));
    const { POST } = await importRoute({ db, loadHealthPage });

    const response = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-04',
        loading: false,
      })
    );
    expect(loadHealthPage).toHaveBeenCalledWith(db, '2026-04-04');
  });

  it('dispatches health save actions through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-04',
      snapshot: null,
      saveNotice: '',
      symptomForm: { symptom: 'Headache', severity: '4', note: 'After lunch' },
      anxietyForm: {
        intensity: '4',
        trigger: 'Crowded store',
        durationMinutes: '15',
        note: 'Walked it off',
      },
      sleepNoteForm: { note: 'Woke up twice', restfulness: '2', context: 'Stress' },
      templateForm: {
        label: 'Magnesium glycinate',
        templateType: 'supplement',
        defaultDose: '2',
        defaultUnit: 'capsules',
        note: 'Evening stack',
      },
    };
    const saveSymptomPage = vi.fn(async () => ({ ...state, saveNotice: 'Symptom logged.' }));
    const saveAnxietyPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Anxiety episode logged.',
    }));
    const saveSleepNotePage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Sleep context logged.',
    }));
    const saveTemplatePage = vi.fn(async () => ({ ...state, saveNotice: 'Template saved.' }));
    const quickLogTemplatePage = vi.fn(async () => ({ ...state, saveNotice: 'Template logged.' }));
    const { POST } = await importRoute({
      db,
      saveSymptomPage,
      saveAnxietyPage,
      saveSleepNotePage,
      saveTemplatePage,
      quickLogTemplatePage,
    });

    const symptomResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSymptom', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await symptomResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Symptom logged.' })
    );
    expect(saveSymptomPage).toHaveBeenCalledWith(db, state);

    const anxietyResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveAnxiety', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await anxietyResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Anxiety episode logged.' })
    );
    expect(saveAnxietyPage).toHaveBeenCalledWith(db, state);

    const sleepResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSleepNote', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await sleepResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Sleep context logged.' })
    );
    expect(saveSleepNotePage).toHaveBeenCalledWith(db, state);

    const templateResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveTemplate', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await templateResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Template saved.' })
    );
    expect(saveTemplatePage).toHaveBeenCalledWith(db, state);

    const quickLogResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'quickLogTemplate', state, templateId: 'template-1' }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await quickLogResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Template logged.' })
    );
    expect(quickLogTemplatePage).toHaveBeenCalledWith(db, state, 'template-1');
  });
});
