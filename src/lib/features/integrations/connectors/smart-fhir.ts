import { normalizeSmartFhirBundle, type SmartFhirBundle } from '$lib/features/integrations/normalization/fhir-normalize';

function asBundle(value: unknown): SmartFhirBundle | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const record = value as Record<string, unknown>;
	if (record.resourceType !== 'Bundle' || !Array.isArray(record.entry)) {
		return null;
	}

	return record as unknown as SmartFhirBundle;
}

export function parseSmartFhirBundle(rawText: string): SmartFhirBundle {
	let parsed: unknown;

	try {
		parsed = JSON.parse(rawText) as unknown;
	} catch {
		throw new Error('SMART sandbox bundle must be valid JSON.');
	}

	const bundle = asBundle(parsed);
	if (!bundle) {
		throw new Error('SMART sandbox bundle must be a FHIR Bundle with entry resources.');
	}

	return bundle;
}

export function importSmartFhirSandboxBundle(rawText: string) {
	return normalizeSmartFhirBundle(parseSmartFhirBundle(rawText));
}

export function createSampleSmartFhirBundle(): SmartFhirBundle {
	return {
		resourceType: 'Bundle',
		type: 'collection',
		id: 'smart-sandbox-bundle-1',
		entry: [
			{
				resource: {
					resourceType: 'Patient',
					id: 'patient-123',
					name: [{ text: 'Pyro Example' }],
					birthDate: '1990-01-01'
				}
			},
			{
				resource: {
					resourceType: 'Observation',
					id: 'obs-bp-1',
					status: 'final',
					subject: { reference: 'Patient/patient-123' },
					effectiveDateTime: '2026-04-02T14:30:00Z',
					code: { text: 'Systolic blood pressure' },
					valueQuantity: { value: 118, unit: 'mmHg' }
				}
			},
			{
				resource: {
					resourceType: 'Condition',
					id: 'condition-1',
					subject: { reference: 'Patient/patient-123' },
					recordedDate: '2026-04-01T09:00:00Z',
					code: { text: 'Hypertension' },
					clinicalStatus: { text: 'active' }
				}
			},
			{
				resource: {
					resourceType: 'MedicationRequest',
					id: 'medication-1',
					subject: { reference: 'Patient/patient-123' },
					authoredOn: '2026-04-02',
					medicationCodeableConcept: { text: 'Lisinopril 10 MG tablet' },
					status: 'active'
				}
			}
		]
	};
}
