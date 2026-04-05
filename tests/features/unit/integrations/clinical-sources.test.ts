import { describe, expect, it } from 'vitest';
import { CLINICAL_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/clinical-sources';

describe('clinical source manifests', () => {
  it('keeps SMART on FHIR as the first clinical lane', () => {
    expect(CLINICAL_SOURCE_MANIFESTS).toHaveLength(2);

    const [smart, blueButton] = CLINICAL_SOURCE_MANIFESTS;
    expect(smart?.id).toBe('smart-fhir-sandbox');
    expect(smart?.phase).toBe('next');
    expect(smart?.starterResources).toEqual([
      'Patient',
      'Observation',
      'Condition',
      'MedicationRequest',
    ]);
    expect(blueButton?.id).toBe('blue-button');
    expect(blueButton?.phase).toBe('later');
  });

  it('states the non-negotiable identity rule for every clinical connector', () => {
    for (const manifest of CLINICAL_SOURCE_MANIFESTS) {
      expect(manifest.importMode).toBe('preview-then-commit');
      expect(manifest.identityRule.toLowerCase()).toContain('import');
      expect(manifest.identityRule.toLowerCase()).toContain('source');
    }
  });
});
