import { describe, expect, it, vi } from 'vitest';
import {
  searchRxNormMedicationSuggestions,
  searchRxNormMedicationSuggestionsWithMetadata,
} from '$lib/server/health/rxnorm';

describe('rxnorm adapter', () => {
  it('parses approximate term suggestions into a stable medication suggestion shape', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [
              { rxcui: '860975', rxaui: '123', score: '95', rank: '1', name: 'Metformin 500 MG Oral Tablet' },
              { rxcui: '617314', rxaui: '124', score: '88', rank: '2', name: 'Metformin 850 MG Oral Tablet' },
            ],
          },
        })
      )
    );

    const results = await searchRxNormMedicationSuggestions('metformin', fetchImpl);

    expect(results).toEqual([
      expect.objectContaining({
        label: 'Metformin 500 MG Oral Tablet',
        code: '860975',
        sourceName: 'RxNorm',
      }),
      expect.objectContaining({
        label: 'Metformin 850 MG Oral Tablet',
        code: '617314',
        sourceName: 'RxNorm',
      }),
    ]);
  });

  it('returns an empty list for blank medication queries', async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(searchRxNormMedicationSuggestions('   ', fetchImpl)).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns a metadata-bearing envelope for successful medication suggestions', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [{ rxcui: '860975', name: 'Metformin 500 MG Oral Tablet' }],
          },
        })
      )
    );

    await expect(searchRxNormMedicationSuggestionsWithMetadata('metformin', fetchImpl)).resolves.toEqual({
      suggestions: [
        expect.objectContaining({
          label: 'Metformin 500 MG Oral Tablet',
          code: '860975',
          sourceName: 'RxNorm',
        }),
      ],
      notice: 'Suggestions from RxNorm.',
      metadata: expect.objectContaining({
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      }),
    });
  });

  it('adds a MedlinePlus reference link only when the rxnorm code is present', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [
              { rxcui: '860975', name: 'Metformin 500 MG Oral Tablet' },
              { rxcui: '   ', name: 'Generic metformin oral tablet' },
            ],
          },
        })
      )
    );

    await expect(searchRxNormMedicationSuggestions('metformin', fetchImpl)).resolves.toEqual([
      expect.objectContaining({
        label: 'Metformin 500 MG Oral Tablet',
        code: '860975',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
      }),
      {
        label: 'Generic metformin oral tablet',
        sourceName: 'RxNorm',
      },
    ]);
  });

  it('ignores malformed candidates and keeps only rows with a non-empty label', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [
              { rxcui: '860975', name: 'Metformin 500 MG Oral Tablet' },
              { rxcui: '617314', name: '   ' },
              'not-an-object',
            ],
          },
        })
      )
    );

    await expect(searchRxNormMedicationSuggestions('metformin', fetchImpl)).resolves.toEqual([
      expect.objectContaining({
        label: 'Metformin 500 MG Oral Tablet',
        code: '860975',
        sourceName: 'RxNorm',
      }),
    ]);
  });

  it('omits code when the rxnorm identifier is blank or whitespace', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [
              { rxcui: '   ', name: 'Metformin 500 MG Oral Tablet' },
              { rxcui: '', name: 'Metformin XR Oral Tablet' },
            ],
          },
        })
      )
    );

    await expect(searchRxNormMedicationSuggestions('metformin', fetchImpl)).resolves.toEqual([
      {
        label: 'Metformin 500 MG Oral Tablet',
        sourceName: 'RxNorm',
      },
      {
        label: 'Metformin XR Oral Tablet',
        sourceName: 'RxNorm',
      },
    ]);
  });

  it('trims medication labels and codes before returning suggestions', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [{ rxcui: ' 860975 ', name: '  Metformin 500 MG Oral Tablet  ' }],
          },
        })
      )
    );

    await expect(searchRxNormMedicationSuggestions('metformin', fetchImpl)).resolves.toEqual([
      expect.objectContaining({
        label: 'Metformin 500 MG Oral Tablet',
        code: '860975',
        sourceName: 'RxNorm',
      }),
    ]);
  });

  it('returns degraded metadata instead of throwing when RxNorm is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('RxNorm unavailable'));

    await expect(searchRxNormMedicationSuggestionsWithMetadata('metformin', fetchImpl)).resolves.toEqual({
      suggestions: [],
      notice: 'RxNorm suggestions unavailable right now.',
      metadata: expect.objectContaining({
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      }),
    });
  });

  it('applies a timeout signal to outbound RxNorm requests', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          approximateGroup: {
            candidate: [{ rxcui: '860975', name: 'Metformin 500 MG Oral Tablet' }],
          },
        })
      )
    );

    await searchRxNormMedicationSuggestions('metformin', fetchImpl);

    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
