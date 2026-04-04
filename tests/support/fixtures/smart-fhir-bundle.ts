export const SMART_FHIR_BUNDLE = {
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
} as const;

export const SMART_FHIR_BUNDLE_JSON = JSON.stringify(SMART_FHIR_BUNDLE, null, 2);

export const SMART_FHIR_BUNDLE_MISMATCH_JSON = JSON.stringify(
	{
		...SMART_FHIR_BUNDLE,
		entry: SMART_FHIR_BUNDLE.entry.map((entry, index) =>
			index === 0
				? {
						resource: {
							...entry.resource,
							name: [{ text: 'Someone Else' }],
							birthDate: '1977-07-07'
						}
					}
				: entry
		)
	},
	null,
	2
);

export const SMART_FHIR_BUNDLE_WITH_UNSUPPORTED_RESOURCE_JSON = JSON.stringify(
	{
		...SMART_FHIR_BUNDLE,
		entry: [
			...SMART_FHIR_BUNDLE.entry,
			{
				resource: {
					resourceType: 'Appointment',
					id: 'appointment-1',
					subject: { reference: 'Patient/patient-123' },
					start: '2026-04-03T16:00:00Z'
				}
			}
		]
	},
	null,
	2
);

export const INVALID_SMART_FHIR_BUNDLE_JSON = JSON.stringify(
	{
		resourceType: 'Bundle',
		type: 'collection',
		entry: [
			{
				resource: {
					resourceType: 'Observation',
					id: 'obs-bp-1',
					status: 'final'
				}
			}
		]
	},
	null,
	2
);
