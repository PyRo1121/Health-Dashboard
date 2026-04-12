import { afterEach, describe, expect, it, vi } from 'vitest';

describe('health route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/health/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  const mutationState = {
    localDay: '2026-04-04',
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
      templateType: 'supplement' as const,
      defaultDose: '2',
      defaultUnit: 'capsules',
      note: 'Evening stack',
    },
  };

  const requestState = {
    loading: false,
    snapshot: null,
    saveNotice: '',
    ...mutationState,
  };

  async function importRoute(overrides: {
    loadHealthPageServer?: ReturnType<typeof vi.fn>;
    saveSymptomPageServer?: ReturnType<typeof vi.fn>;
    saveAnxietyPageServer?: ReturnType<typeof vi.fn>;
    saveSleepNotePageServer?: ReturnType<typeof vi.fn>;
    saveTemplatePageServer?: ReturnType<typeof vi.fn>;
    quickLogTemplatePageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/health/service', () => ({
      loadHealthPageServer:
        overrides.loadHealthPageServer ??
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
      saveSymptomPageServer:
        overrides.saveSymptomPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          snapshot: null,
          saveNotice: 'Symptom logged.',
        })),
      saveAnxietyPageServer:
        overrides.saveAnxietyPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          snapshot: null,
          saveNotice: 'Anxiety episode logged.',
        })),
      saveSleepNotePageServer:
        overrides.saveSleepNotePageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          snapshot: null,
          saveNotice: 'Sleep context logged.',
        })),
      saveTemplatePageServer:
        overrides.saveTemplatePageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          snapshot: null,
          saveNotice: 'Template saved.',
        })),
      quickLogTemplatePageServer:
        overrides.quickLogTemplatePageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          snapshot: null,
          saveNotice: 'Template logged.',
        })),
    }));

    return await import('../../../../src/routes/api/health/+server.ts');
  }

  it('loads health page state through the server route', async () => {
    const loadHealthPageServer = vi.fn(async () => ({
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
    const { POST } = await importRoute({ loadHealthPageServer });

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
    expect(loadHealthPageServer).toHaveBeenCalledWith('2026-04-04');
  });

  it('dispatches health save actions through the server route', async () => {
    const saveSymptomPageServer = vi.fn(async () => ({
      ...requestState,
      saveNotice: 'Symptom logged.',
    }));
    const saveAnxietyPageServer = vi.fn(async () => ({
      ...requestState,
      saveNotice: 'Anxiety episode logged.',
    }));
    const saveSleepNotePageServer = vi.fn(async () => ({
      ...requestState,
      saveNotice: 'Sleep context logged.',
    }));
    const saveTemplatePageServer = vi.fn(async () => ({
      ...requestState,
      saveNotice: 'Template saved.',
    }));
    const quickLogTemplatePageServer = vi.fn(async () => ({
      ...requestState,
      saveNotice: 'Template logged.',
    }));
    const { POST } = await importRoute({
      saveSymptomPageServer,
      saveAnxietyPageServer,
      saveSleepNotePageServer,
      saveTemplatePageServer,
      quickLogTemplatePageServer,
    });

    const symptomResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSymptom', state: requestState }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await symptomResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Symptom logged.' })
    );
    expect(saveSymptomPageServer).toHaveBeenCalledWith(mutationState);

    const anxietyResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveAnxiety', state: requestState }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await anxietyResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Anxiety episode logged.' })
    );
    expect(saveAnxietyPageServer).toHaveBeenCalledWith(mutationState);

    const sleepResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSleepNote', state: requestState }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await sleepResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Sleep context logged.' })
    );
    expect(saveSleepNotePageServer).toHaveBeenCalledWith(mutationState);

    const templateResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveTemplate', state: requestState }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await templateResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Template saved.' })
    );
    expect(saveTemplatePageServer).toHaveBeenCalledWith(mutationState);

    const quickLogResponse = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({
          action: 'quickLogTemplate',
          state: requestState,
          templateId: 'template-1',
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await quickLogResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Template logged.' })
    );
    expect(quickLogTemplatePageServer).toHaveBeenCalledWith(mutationState, 'template-1');
  });

  it('returns 400 for invalid health payloads', async () => {
    const loadHealthPageServer = vi.fn();
    const { POST } = await importRoute({ loadHealthPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/health', {
        method: 'POST',
        body: JSON.stringify({ action: 'load' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid health request payload.');
    expect(loadHealthPageServer).not.toHaveBeenCalled();
  });
});
