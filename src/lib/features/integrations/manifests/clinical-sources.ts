export interface ClinicalSourceManifest {
  id: 'smart-fhir-sandbox' | 'blue-button';
  label: string;
  phase: 'next' | 'later';
  auth: 'SMART OAuth2' | 'OAuth2';
  importMode: 'preview-then-commit';
  starterResources: string[];
  identityRule: string;
  capabilityNotes: string[];
}

export const CLINICAL_SOURCE_MANIFESTS: ClinicalSourceManifest[] = [
  {
    id: 'smart-fhir-sandbox',
    label: 'SMART on FHIR sandbox',
    phase: 'next',
    auth: 'SMART OAuth2',
    importMode: 'preview-then-commit',
    starterResources: ['Patient', 'Observation', 'Condition', 'MedicationRequest'],
    identityRule: 'Block import until one source-scoped patient mapping is explicitly confirmed.',
    capabilityNotes: [
      'Primary T10 lane. Epic/MyChart-compatible patient-facing flow comes first.',
      'One narrow clinical read set only. No provider write-back in this tranche.',
    ],
  },
  {
    id: 'blue-button',
    label: 'Blue Button 2.0',
    phase: 'later',
    auth: 'OAuth2',
    importMode: 'preview-then-commit',
    starterResources: ['Patient', 'Coverage', 'ExplanationOfBenefit', 'MedicationRequest'],
    identityRule:
      'Block import until records stay source-scoped and Medicare data is explicitly mapped to the right person.',
    capabilityNotes: [
      'Secondary lane after SMART on FHIR proves the OAuth and normalization path.',
      'Useful when Medicare claims are relevant, but not the first architecture to build.',
    ],
  },
];
