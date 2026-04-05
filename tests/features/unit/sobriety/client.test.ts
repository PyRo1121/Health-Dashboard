import { afterEach, describe, expect, it, vi } from 'vitest';

describe('sobriety client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes sobriety actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/sobriety/client.ts');
    const state = {
      ...client.createSobrietyPageState(),
      localDay: '2026-04-04',
      cravingScore: '4',
      cravingNote: 'Stress spike after lunch.',
      lapseNote: 'Had a lapse after a rough evening.',
      recoveryAction: 'Text sponsor',
    };

    await client.loadSobrietyPage(state, '2026-04-04');
    await client.markSobrietyStatus(state, 'sober', 'Marked sober for today.');
    await client.saveSobrietyCraving(state);
    await client.saveSobrietyLapse(state);

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/sobriety');
    expect(stateAction).toHaveBeenNthCalledWith(1, 'load', state, expect.any(Function), {
      localDay: '2026-04-04',
    });
    expect(stateAction).toHaveBeenNthCalledWith(2, 'markStatus', state, expect.any(Function), {
      status: 'sober',
      notice: 'Marked sober for today.',
    });
    expect(stateAction).toHaveBeenNthCalledWith(3, 'saveCraving', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(4, 'saveLapse', state, expect.any(Function));
    expect(action).not.toHaveBeenCalled();
  });
});
