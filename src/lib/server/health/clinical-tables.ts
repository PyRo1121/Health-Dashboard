import {
  createExternalSourceMetadata,
  getExternalSourceDefinition,
  type ExternalSourceMetadata,
} from '$lib/core/domain/external-sources';
import { withTimeoutInit } from '$lib/server/http/fetch-timeout';
import { buildMedlinePlusProblemLink } from './medlineplus';

const CLINICAL_TABLES_BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/conditions/v3/search';

type ClinicalTablesSearchResponse = [
  total: number,
  labels: string[],
  unknown: unknown,
  records?: Array<[label?: string, code?: string, consumerName?: string]>,
];

export interface HealthSymptomSuggestion {
  label: string;
  code?: string;
  referenceUrl?: string;
  sourceName: string;
}

export interface HealthSymptomSuggestionResponse {
  suggestions: HealthSymptomSuggestion[];
  notice: string;
  metadata: ExternalSourceMetadata;
}

export async function searchClinicalConditionSuggestions(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthSymptomSuggestion[]> {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const sourceName = getExternalSourceDefinition('clinical-tables-conditions').sourceName;
  const params = new URLSearchParams({
    terms: normalized,
    maxList: '7',
    sf: 'consumer_name,primary_name',
    df: 'primary_name,icd10cm,consumer_name',
  });

  const response = await fetchImpl(
    `${CLINICAL_TABLES_BASE_URL}?${params.toString()}`,
    withTimeoutInit({
      headers: {
        accept: 'application/json',
      },
    })
  );

  if (!response.ok) {
    throw new Error(`Clinical Tables request failed with ${response.status}`);
  }

  const payload = (await response.json()) as ClinicalTablesSearchResponse;
  const records = Array.isArray(payload[3]) ? payload[3] : [];

  const suggestions = records
    .map((record): HealthSymptomSuggestion | null => {
      if (!Array.isArray(record)) {
        return null;
      }

      const label = typeof record?.[0] === 'string' ? record[0].trim() : '';
      const code = typeof record?.[1] === 'string' ? record[1].trim() : '';

      if (!label) {
        return null;
      }

      return {
        label,
        code: code || undefined,
        referenceUrl: buildMedlinePlusProblemLink(code, label) ?? undefined,
        sourceName,
      } satisfies HealthSymptomSuggestion;
    })
    .filter((entry): entry is HealthSymptomSuggestion => entry !== null);

  return suggestions;
}

export async function searchClinicalConditionSuggestionsWithMetadata(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<HealthSymptomSuggestionResponse> {
  let suggestions: HealthSymptomSuggestion[];

  try {
    suggestions = await searchClinicalConditionSuggestions(query, fetchImpl);
  } catch {
    return {
      suggestions: [],
      notice: 'Clinical condition suggestions unavailable right now.',
      metadata: createExternalSourceMetadata('clinical-tables-conditions', 'none', 'degraded'),
    };
  }

  return {
    suggestions,
    notice: suggestions.length ? 'Suggestions from Clinical Tables Conditions.' : '',
    metadata: createExternalSourceMetadata(
      'clinical-tables-conditions',
      suggestions.length ? 'remote-live' : 'none',
      'none'
    ),
  };
}
