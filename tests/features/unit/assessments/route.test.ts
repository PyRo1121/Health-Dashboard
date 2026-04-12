import { afterEach, describe, expect, it, vi } from 'vitest';

describe('assessments route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/assessments/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadAssessmentsPageServer?: ReturnType<typeof vi.fn>;
    saveAssessmentsProgressPageServer?: ReturnType<typeof vi.fn>;
    submitAssessmentsPageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/assessments/service', () => ({
      loadAssessmentsPageServer:
        overrides.loadAssessmentsPageServer ??
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
      saveAssessmentsProgressPageServer:
        overrides.saveAssessmentsProgressPageServer ??
        vi.fn(async (state) => ({ ...state, saveNotice: 'Progress saved.' })),
      submitAssessmentsPageServer:
        overrides.submitAssessmentsPageServer ??
        vi.fn(async (state) => ({ ...state, saveNotice: 'Assessment saved.' })),
    }));
    return await import('../../../../src/routes/api/assessments/+server.ts');
  }

  it('loads and saves assessments through the server route', async () => {
    const { POST } = await importRoute({});
    const state = { loading: false, localDay: '2026-04-04', instrument: 'PHQ-9', draftResponses: [1, 1, 1], latest: undefined, saveNotice: '', validationError: '', safetyMessage: '' };
    expect(await (await POST({ request: new Request('http://health.test/api/assessments', { method: 'POST', body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ localDay: '2026-04-04' }));
    expect(await (await POST({ request: new Request('http://health.test/api/assessments', { method: 'POST', body: JSON.stringify({ action: 'saveProgress', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Progress saved.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/assessments', { method: 'POST', body: JSON.stringify({ action: 'submit', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Assessment saved.' }));
  });

  it('returns 400 for invalid assessments payloads', async () => {
    const { POST } = await importRoute({});
    const response = await POST({ request: new Request('http://health.test/api/assessments', { method: 'POST', body: JSON.stringify({ action: 'saveProgress' }) }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid assessments request payload.');
  });
});
