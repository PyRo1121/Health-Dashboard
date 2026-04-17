import { afterEach, describe, expect, it, vi } from 'vitest';

describe('health symptom search route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/health/clinical-tables');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns an empty list for blank symptom queries', async () => {
    const searchClinicalConditionSuggestionsWithMetadata = vi.fn(async () => ({
      suggestions: [],
      notice: '',
      metadata: {
        provenance: [],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/health/clinical-tables', () => ({
      searchClinicalConditionSuggestionsWithMetadata,
    }));

    const { POST } = await import('../../../../src/routes/api/health/search-symptoms/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-symptoms', {
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
    expect(searchClinicalConditionSuggestionsWithMetadata).not.toHaveBeenCalled();
  });

  it('delegates valid symptom queries to the clinical tables adapter', async () => {
    const searchClinicalConditionSuggestionsWithMetadata = vi.fn(async () => ({
      suggestions: [
        { label: 'Headache', code: 'R51', sourceName: 'Clinical Tables Conditions' },
      ],
      notice: 'Suggestions from Clinical Tables Conditions.',
      metadata: {
        provenance: [],
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/health/clinical-tables', () => ({
      searchClinicalConditionSuggestionsWithMetadata,
    }));

    const { POST } = await import('../../../../src/routes/api/health/search-symptoms/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-symptoms', {
        method: 'POST',
        body: JSON.stringify({ query: 'head' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [{ label: 'Headache', code: 'R51', sourceName: 'Clinical Tables Conditions' }],
      notice: 'Suggestions from Clinical Tables Conditions.',
      metadata: {
        provenance: [],
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      },
    });
    expect(searchClinicalConditionSuggestionsWithMetadata).toHaveBeenCalledWith('head');
  });

  it('returns 400 for invalid symptom search payloads', async () => {
    vi.doMock('$lib/server/health/clinical-tables', () => ({
      searchClinicalConditionSuggestionsWithMetadata: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/health/search-symptoms/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-symptoms', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid symptom search request payload.');
  });

  it('returns degraded symptom metadata instead of a server error when Clinical Tables fails', async () => {
    const searchClinicalConditionSuggestionsWithMetadata = vi.fn(async () => {
      throw new Error('Clinical Tables unavailable');
    });
    vi.doMock('$lib/server/health/clinical-tables', () => ({
      searchClinicalConditionSuggestionsWithMetadata,
    }));

    const { POST } = await import('../../../../src/routes/api/health/search-symptoms/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/health/search-symptoms', {
        method: 'POST',
        body: JSON.stringify({ query: 'head' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      suggestions: [],
      notice: 'Clinical condition suggestions unavailable right now.',
      metadata: {
        provenance: [
          {
            sourceId: 'clinical-tables-conditions',
            sourceName: 'Clinical Tables Conditions',
            category: 'reference',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      },
    });
    expect(searchClinicalConditionSuggestionsWithMetadata).toHaveBeenCalledWith('head');
  });
});
