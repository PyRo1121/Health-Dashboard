import { describe, expect, it } from 'vitest';
import {
	createConnectionStatusModel,
	integrationsClinicalInteroperabilityCopy,
	integrationsIdentityGateMessage,
	integrationsOperatorNotes
} from '$lib/features/integrations/model';

describe('integrations model', () => {
	it('builds connection status copy from the native companion summary', () => {
		expect(
			createConnectionStatusModel({
				importedEvents: 0,
				deviceNames: [],
				metricTypes: [],
				latestCaptureAt: undefined
			})
		).toEqual({
			isConnected: false,
			message: 'Download the Shortcut kit, run it on iPhone, then import the JSON file in `/imports`.'
		});

		expect(
			createConnectionStatusModel({
				importedEvents: 3,
				deviceNames: ['Pyro iPhone'],
				metricTypes: ['sleep-duration'],
				latestCaptureAt: '2026-04-02T13:10:00.000Z'
			})
		).toEqual({
			isConnected: true,
			message: 'Imported native companion events: 3'
		});

		expect(integrationsOperatorNotes).toMatch(/send them to `\/imports`/i);
		expect(integrationsClinicalInteroperabilityCopy).toMatch(/SMART on FHIR sandbox/i);
		expect(integrationsIdentityGateMessage).toMatch(/source-scoped patient mapping/i);
	});
});
