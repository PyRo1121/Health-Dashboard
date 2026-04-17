import {
  createExternalSourceMetadata,
  getExternalSourceDefinition,
  type ExternalSourceMetadata,
} from '$lib/core/domain/external-sources';
import { withTimeoutInit } from '$lib/server/http/fetch-timeout';
import { buildMedlinePlusMedicationLink } from './medlineplus';

const RXNORM_APPROXIMATE_TERM_URL = 'https://rxnav.nlm.nih.gov/REST/approximateTerm.json';

interface RxNormCandidate {
  rxcui?: string;
  name?: string;
}

interface RxNormApproximateTermResponse {
  approximateGroup?: {
    candidate?: RxNormCandidate[];
  };
}

export interface HealthMedicationSuggestion {
  label: string;
  code?: string;
  referenceUrl?: string;
  sourceName: string;
}

export interface HealthMedicationSuggestionResponse {
  suggestions: HealthMedicationSuggestion[];
  notice: string;
  metadata: ExternalSourceMetadata;
}

export async function searchRxNormMedicationSuggestions(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthMedicationSuggestion[]> {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const sourceName = getExternalSourceDefinition('rxnorm').sourceName;
  const params = new URLSearchParams({
    term: normalized,
    maxEntries: '7',
  });

  const response = await fetchImpl(
    `${RXNORM_APPROXIMATE_TERM_URL}?${params.toString()}`,
    withTimeoutInit({
      headers: {
        accept: 'application/json',
      },
    })
  );

  if (!response.ok) {
    throw new Error(`RxNorm request failed with ${response.status}`);
  }

  const payload = (await response.json()) as RxNormApproximateTermResponse;
  const candidates = Array.isArray(payload.approximateGroup?.candidate)
    ? payload.approximateGroup.candidate
    : [];

  return candidates
    .map((candidate): HealthMedicationSuggestion | null => {
      const label = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const code = typeof candidate.rxcui === 'string' ? candidate.rxcui.trim() : '';
      if (!label) {
        return null;
      }
      return {
        label,
        code: code || undefined,
        referenceUrl: buildMedlinePlusMedicationLink(code, label) ?? undefined,
        sourceName,
      };
    })
    .filter((candidate): candidate is HealthMedicationSuggestion => candidate !== null);
}

export async function searchRxNormMedicationSuggestionsWithMetadata(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthMedicationSuggestionResponse> {
  let suggestions: HealthMedicationSuggestion[];

  try {
    suggestions = await searchRxNormMedicationSuggestions(query, fetchImpl);
  } catch {
    return {
      suggestions: [],
      notice: 'RxNorm suggestions unavailable right now.',
      metadata: createExternalSourceMetadata('rxnorm', 'none', 'degraded'),
    };
  }

  return {
    suggestions,
    notice: suggestions.length ? 'Suggestions from RxNorm.' : '',
    metadata: createExternalSourceMetadata(
      'rxnorm',
      suggestions.length ? 'remote-live' : 'none',
      'none'
    ),
  };
}
