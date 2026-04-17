import { afterEach, describe, expect, it, vi } from 'vitest';

describe('health medication search route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/health/rxnorm');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns an empty list for blank medication queries', async () => {
    const searchRxNormMedicationSuggestionsWithMetadata = vi.fn(async () => ({
      suggestions: [],
      notice: '',
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/health/rxnorm', () => ({
      searchRxNormMedicationSuggestionsWithMetadata,
    }));

    const { POST } =
      await import('../../../../src/routes/api/health/search-medications/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-medications', {
        method: 'POST',
        body: JSON.stringify({ query: '   ' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [],
      notice: '',
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    });
    expect(searchRxNormMedicationSuggestionsWithMetadata).not.toHaveBeenCalled();
  });

  it('delegates valid medication queries to the rxnorm adapter', async () => {
    const searchRxNormMedicationSuggestionsWithMetadata = vi.fn(async () => ({
      suggestions: [
        { label: 'Metformin 500 MG Oral Tablet', code: '860975', sourceName: 'RxNorm' },
      ],
      notice: 'Suggestions from RxNorm.',
      metadata: {
        provenance: [],
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/health/rxnorm', () => ({
      searchRxNormMedicationSuggestionsWithMetadata,
    }));

    const { POST } =
      await import('../../../../src/routes/api/health/search-medications/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-medications', {
        method: 'POST',
        body: JSON.stringify({ query: 'metformin' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [
        { label: 'Metformin 500 MG Oral Tablet', code: '860975', sourceName: 'RxNorm' },
      ],
      notice: 'Suggestions from RxNorm.',
      metadata: {
        provenance: [],
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      },
    });
    expect(searchRxNormMedicationSuggestionsWithMetadata).toHaveBeenCalledWith('metformin');
  });

  it('returns 400 for invalid medication search payloads', async () => {
    vi.doMock('$lib/server/health/rxnorm', () => ({
      searchRxNormMedicationSuggestionsWithMetadata: vi.fn(),
    }));

    const { POST } =
      await import('../../../../src/routes/api/health/search-medications/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-medications', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid medication search request payload.');
  });

  it('returns degraded medication metadata instead of a server error when RxNorm fails', async () => {
    const searchRxNormMedicationSuggestionsWithMetadata = vi.fn(async () => {
      throw new Error('RxNorm unavailable');
    });
    vi.doMock('$lib/server/health/rxnorm', () => ({
      searchRxNormMedicationSuggestionsWithMetadata,
    }));

    const { POST } =
      await import('../../../../src/routes/api/health/search-medications/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-medications', {
        method: 'POST',
        body: JSON.stringify({ query: 'metformin' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [],
      notice: 'RxNorm suggestions unavailable right now.',
      metadata: {
        provenance: [
          {
            sourceId: 'rxnorm',
            sourceName: 'RxNorm',
            category: 'reference',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      },
    });
    expect(searchRxNormMedicationSuggestionsWithMetadata).toHaveBeenCalledWith('metformin');
  });
});
