import { describe, expect, it, vi } from 'vitest';
import {
  searchClinicalConditionSuggestions,
  searchClinicalConditionSuggestionsWithMetadata,
} from '$lib/server/health/clinical-tables';
import { buildMedlinePlusProblemLink } from '$lib/server/health/medlineplus';

describe('clinical tables condition adapter', () => {
  it('parses condition suggestions into a stable symptom suggestion shape', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          2,
          ['Headache', 'Headache disorder'],
          null,
          [
            ['Headache', 'R51', 'Headache'],
            ['Headache disorder', 'R51.9', 'Headache disorder'],
          ],
        ])
      )
    );

    const results = await searchClinicalConditionSuggestions('head', fetchImpl);

    expect(results).toEqual([
      expect.objectContaining({
        label: 'Headache',
        code: 'R51',
        sourceName: 'Clinical Tables Conditions',
      }),
      expect.objectContaining({
        label: 'Headache disorder',
        code: 'R51.9',
        sourceName: 'Clinical Tables Conditions',
      }),
    ]);
  });

  it('returns an empty list for blank queries', async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(searchClinicalConditionSuggestions('   ', fetchImpl)).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns an empty list when Clinical Tables responds with a malformed payload', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          broken: true,
        })
      )
    );

    await expect(searchClinicalConditionSuggestions('head', fetchImpl)).resolves.toEqual([]);
  });

  it('requests the documented Clinical Tables fields for condition suggestions', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([0, [], null, []]))
    );

    await searchClinicalConditionSuggestions('head', fetchImpl);

    const requestUrl = String(fetchImpl.mock.calls[0]?.[0] ?? '');
    expect(requestUrl).toContain('sf=consumer_name%2Cprimary_name');
    expect(requestUrl).toContain('df=primary_name%2Cicd10cm%2Cconsumer_name');
  });

  it('ignores malformed record tuples and keeps only rows with a non-empty label', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          4,
          [],
          null,
          [
            ['Headache', 'R51', 'Headache'],
            [undefined, 'R51.9', 'Headache disorder'],
            ['   ', 'R42', 'Dizziness'],
            'not-a-tuple',
          ],
        ])
      )
    );

    await expect(searchClinicalConditionSuggestions('head', fetchImpl)).resolves.toEqual([
      expect.objectContaining({
        label: 'Headache',
        code: 'R51',
        sourceName: 'Clinical Tables Conditions',
      }),
    ]);
  });

  it('omits code when the documented code field is blank or whitespace', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          2,
          [],
          null,
          [
            ['Headache', '   ', 'Headache'],
            ['Dizziness', '', 'Dizziness'],
          ],
        ])
      )
    );

    await expect(searchClinicalConditionSuggestions('head', fetchImpl)).resolves.toEqual([
      {
        label: 'Headache',
        sourceName: 'Clinical Tables Conditions',
      },
      {
        label: 'Dizziness',
        sourceName: 'Clinical Tables Conditions',
      },
    ]);
  });

  it('trims documented label and code fields before returning suggestions', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          1,
          [],
          null,
          [['  Headache  ', '  R51  ', 'Headache']],
        ])
      )
    );

    await expect(searchClinicalConditionSuggestions('head', fetchImpl)).resolves.toEqual([
      expect.objectContaining({
        label: 'Headache',
        code: 'R51',
        sourceName: 'Clinical Tables Conditions',
      }),
    ]);
  });

  it('returns a metadata-bearing envelope for successful suggestion searches', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          1,
          [],
          null,
          [['Headache', 'R51', 'Headache']],
        ])
      )
    );

    await expect(searchClinicalConditionSuggestionsWithMetadata('head', fetchImpl)).resolves.toEqual({
      suggestions: [
        {
          label: 'Headache',
          code: 'R51',
          referenceUrl: buildMedlinePlusProblemLink('R51', 'Headache') ?? undefined,
          sourceName: 'Clinical Tables Conditions',
        },
      ],
      notice: 'Suggestions from Clinical Tables Conditions.',
      metadata: expect.objectContaining({
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      }),
    });
  });

  it('adds a MedlinePlus reference link only when the condition code is present', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          2,
          [],
          null,
          [
            ['Headache', 'R51', 'Headache'],
            ['Dizziness', '   ', 'Dizziness'],
          ],
        ])
      )
    );

    await expect(searchClinicalConditionSuggestions('head', fetchImpl)).resolves.toEqual([
      {
        label: 'Headache',
        code: 'R51',
        referenceUrl: buildMedlinePlusProblemLink('R51', 'Headache') ?? undefined,
        sourceName: 'Clinical Tables Conditions',
      },
      {
        label: 'Dizziness',
        sourceName: 'Clinical Tables Conditions',
      },
    ]);
  });

  it('returns degraded metadata instead of throwing when Clinical Tables is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('Clinical Tables unavailable'));

    await expect(searchClinicalConditionSuggestionsWithMetadata('head', fetchImpl)).resolves.toEqual({
      suggestions: [],
      notice: 'Clinical condition suggestions unavailable right now.',
      metadata: expect.objectContaining({
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      }),
    });
  });

  it('applies a timeout signal to outbound Clinical Tables requests', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          1,
          [],
          null,
          [['Headache', 'R51', 'Headache']],
        ])
      )
    );

    await searchClinicalConditionSuggestions('head', fetchImpl);

    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
