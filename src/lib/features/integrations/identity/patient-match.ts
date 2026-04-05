import { buildSourceScopeKey, type SourceScopedPatientRef } from './source-scope';

export interface ClinicalPatientIdentity extends SourceScopedPatientRef {
  fullName?: string;
  birthDate?: string;
}

export interface LocalPatientCandidate {
  localPatientId: string;
  displayName: string;
  birthDate?: string;
}

export interface ExistingPatientMapping {
  sourceScopeKey: string;
  localPatientId: string;
}

export interface ClinicalPatientMatchResult {
  sourceScopeKey: string;
  status: 'exact' | 'ambiguous' | 'none';
  requiresExplicitConfirmation: boolean;
  matchedCandidate?: LocalPatientCandidate;
  candidateMatches: LocalPatientCandidate[];
  reason: string;
}

function normalizeName(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function demographicsMatch(
  source: ClinicalPatientIdentity,
  candidate: LocalPatientCandidate
): boolean {
  const sourceName = normalizeName(source.fullName);
  const candidateName = normalizeName(candidate.displayName);
  if (!sourceName || !candidateName) return false;
  if (!source.birthDate || !candidate.birthDate) return false;
  return sourceName === candidateName && source.birthDate === candidate.birthDate;
}

export function resolveClinicalPatientMatch(
  source: ClinicalPatientIdentity,
  candidates: LocalPatientCandidate[],
  existingMappings: ExistingPatientMapping[] = []
): ClinicalPatientMatchResult {
  const sourceScopeKey = buildSourceScopeKey(source);
  const existingMapping = existingMappings.find(
    (mapping) => mapping.sourceScopeKey === sourceScopeKey
  );

  if (existingMapping) {
    const mappedCandidate = candidates.find(
      (candidate) => candidate.localPatientId === existingMapping.localPatientId
    );
    if (mappedCandidate) {
      return {
        sourceScopeKey,
        status: 'exact',
        requiresExplicitConfirmation: false,
        matchedCandidate: mappedCandidate,
        candidateMatches: [mappedCandidate],
        reason: 'Existing patient mapping found for this source-scoped record.',
      };
    }
  }

  const demographicMatches = candidates.filter((candidate) => demographicsMatch(source, candidate));

  if (demographicMatches.length === 1) {
    return {
      sourceScopeKey,
      status: 'exact',
      requiresExplicitConfirmation: true,
      matchedCandidate: demographicMatches[0],
      candidateMatches: demographicMatches,
      reason: 'Unique demographic match found. Require explicit confirmation before import.',
    };
  }

  if (demographicMatches.length > 1) {
    return {
      sourceScopeKey,
      status: 'ambiguous',
      requiresExplicitConfirmation: true,
      candidateMatches: demographicMatches,
      reason:
        'More than one local person matches this clinical record. Block import until resolved.',
    };
  }

  return {
    sourceScopeKey,
    status: 'none',
    requiresExplicitConfirmation: true,
    candidateMatches: [],
    reason: 'No verified local person match found. Keep the record source-scoped and blocked.',
  };
}
