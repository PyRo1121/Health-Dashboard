import { afterEach, describe, expect, it, vi } from 'vitest';

describe('health client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes health actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/health/client.ts');
    const state: ReturnType<typeof client.createHealthPageState> = {
      ...client.createHealthPageState(),
      localDay: '2026-04-04',
      symptomForm: {
        symptom: 'Headache',
        severity: '4',
        note: 'After lunch',
      },
      anxietyForm: {
        intensity: '4',
        trigger: 'Crowded store',
        durationMinutes: '15',
        note: 'Walked it off',
      },
      sleepNoteForm: {
        note: 'Woke up twice',
        restfulness: '2',
        context: 'Stress',
      },
      templateForm: {
        label: 'Magnesium glycinate',
        templateType: 'supplement',
        defaultDose: '2',
        defaultUnit: 'capsules',
        note: 'Evening stack',
      },
    };

    await client.loadHealthPage('2026-04-04');
    await client.saveSymptomPage(state);
    await client.saveAnxietyPage(state);
    await client.saveSleepNotePage(state);
    await client.saveTemplatePage(state);
    await client.quickLogTemplatePage(state, 'template-1');

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/health');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function), { localDay: '2026-04-04' });
    expect(stateAction).toHaveBeenNthCalledWith(1, 'saveSymptom', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(2, 'saveAnxiety', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(3, 'saveSleepNote', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(4, 'saveTemplate', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(
      5,
      'quickLogTemplate',
      state,
      expect.any(Function),
      { templateId: 'template-1' }
    );
  });
});
