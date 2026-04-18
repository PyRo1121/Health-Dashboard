import { describe, expect, it } from 'vitest';
import { normalizeSmartFhirBundle } from '$lib/features/integrations/normalization/fhir-normalize';

describe('SMART FHIR localDay normalization', () => {
  it('derives localDay from the provided timezone instead of slicing UTC', () => {
    const result = normalizeSmartFhirBundle(
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'patient-123',
              name: [{ text: 'Pyro Example' }],
              birthDate: '1990-01-01',
            },
          },
          {
            resource: {
              resourceType: 'Observation',
              id: 'obs-1',
              status: 'final',
              subject: { reference: 'Patient/patient-123' },
              effectiveDateTime: '2026-04-02T04:30:00.000Z',
              code: { text: 'Systolic blood pressure' },
              valueQuantity: { value: 118, unit: 'mmHg' },
            },
          },
        ],
      },
      'America/Chicago'
    );

    expect(result.events[0]?.sourceTimestamp).toBe('2026-04-02T04:30:00.000Z');
    expect(result.events[0]?.localDay).toBe('2026-04-01');
  });
});
