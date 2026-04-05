import { describe, expect, it } from 'vitest';
import {
  resolveClinicalPatientMatch,
  type ClinicalPatientIdentity,
  type ExistingPatientMapping,
  type LocalPatientCandidate,
} from '$lib/features/integrations/identity/patient-match';
import {
  buildScopedClinicalResourceKey,
  buildSourceScopeKey,
} from '$lib/features/integrations/identity/source-scope';

const sourceIdentity: ClinicalPatientIdentity = {
  connectorId: 'smart-fhir-sandbox',
  sourcePatientId: 'patient-123',
  fullName: 'Jamie Rivera',
  birthDate: '1989-09-14',
};

const localCandidates: LocalPatientCandidate[] = [
  {
    localPatientId: 'local-1',
    displayName: 'Jamie Rivera',
    birthDate: '1989-09-14',
  },
  {
    localPatientId: 'local-2',
    displayName: 'Taylor Morgan',
    birthDate: '1990-10-22',
  },
];

describe('clinical patient match', () => {
  it('builds source-scoped keys for patient and resource records', () => {
    expect(buildSourceScopeKey(sourceIdentity)).toBe('smart-fhir-sandbox:patient-123');
    expect(
      buildScopedClinicalResourceKey({
        ...sourceIdentity,
        resourceType: 'Observation',
        resourceId: 'obs-1',
      })
    ).toBe('smart-fhir-sandbox:patient-123:Observation:obs-1');
  });

  it('returns a unique demographic match but still requires explicit confirmation', () => {
    const match = resolveClinicalPatientMatch(sourceIdentity, localCandidates);

    expect(match.status).toBe('exact');
    expect(match.requiresExplicitConfirmation).toBe(true);
    expect(match.matchedCandidate?.localPatientId).toBe('local-1');
    expect(match.reason).toMatch(/explicit confirmation/i);
  });

  it('treats multiple demographic matches as ambiguous and blocks import', () => {
    const match = resolveClinicalPatientMatch(sourceIdentity, [
      ...localCandidates,
      {
        localPatientId: 'local-3',
        displayName: 'Jamie Rivera',
        birthDate: '1989-09-14',
      },
    ]);

    expect(match.status).toBe('ambiguous');
    expect(match.requiresExplicitConfirmation).toBe(true);
    expect(match.candidateMatches).toHaveLength(2);
    expect(match.reason).toMatch(/block import/i);
  });

  it('uses an existing source-scoped mapping without forcing reconfirmation', () => {
    const mappings: ExistingPatientMapping[] = [
      {
        sourceScopeKey: buildSourceScopeKey(sourceIdentity),
        localPatientId: 'local-1',
      },
    ];

    const match = resolveClinicalPatientMatch(sourceIdentity, localCandidates, mappings);

    expect(match.status).toBe('exact');
    expect(match.requiresExplicitConfirmation).toBe(false);
    expect(match.reason).toMatch(/existing patient mapping/i);
  });

  it('keeps the import blocked when no verified local person exists', () => {
    const match = resolveClinicalPatientMatch(
      {
        ...sourceIdentity,
        fullName: 'Unmatched Person',
        birthDate: '1977-01-01',
      },
      localCandidates
    );

    expect(match.status).toBe('none');
    expect(match.requiresExplicitConfirmation).toBe(true);
    expect(match.candidateMatches).toHaveLength(0);
    expect(match.reason).toMatch(/blocked/i);
  });
});
