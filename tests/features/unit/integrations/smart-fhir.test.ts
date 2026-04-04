import { describe, expect, it } from 'vitest';
import {
	INVALID_SMART_FHIR_BUNDLE_JSON,
	SMART_FHIR_BUNDLE_JSON,
	SMART_FHIR_BUNDLE_WITH_UNSUPPORTED_RESOURCE_JSON
} from '../../../support/fixtures/smart-fhir-bundle';
import { importSmartFhirSandboxBundle, parseSmartFhirBundle } from '$lib/features/integrations/connectors/smart-fhir';

describe('smart fhir connector', () => {
	it('parses a valid SMART sandbox bundle and extracts the patient identity', () => {
		const bundle = parseSmartFhirBundle(SMART_FHIR_BUNDLE_JSON);

		expect(bundle.resourceType).toBe('Bundle');
		expect(bundle.entry).toHaveLength(4);
	});

	it('imports supported clinical resources into canonical health events', () => {
		const result = importSmartFhirSandboxBundle(SMART_FHIR_BUNDLE_JSON);

		expect(result.patientIdentity).toEqual({
			connectorId: 'smart-fhir-sandbox',
			sourcePatientId: 'patient-123',
			fullName: 'Pyro Example',
			birthDate: '1990-01-01'
		});
		expect(result.events).toHaveLength(3);
		expect(result.events.map((event) => event.eventType)).toEqual([
			'Systolic blood pressure',
			'Condition: Hypertension',
			'Medication: Lisinopril 10 MG tablet'
		]);
	});

	it('warns on unsupported resource types instead of silently pretending they imported', () => {
		const result = importSmartFhirSandboxBundle(SMART_FHIR_BUNDLE_WITH_UNSUPPORTED_RESOURCE_JSON);

		expect(result.events).toHaveLength(3);
		expect(result.warnings).toEqual(['Skipped unsupported SMART resource "Appointment".']);
	});

	it('rejects bundles that do not contain a patient identity', () => {
		expect(() => importSmartFhirSandboxBundle(INVALID_SMART_FHIR_BUNDLE_JSON)).toThrow(/patient/i);
	});
});
