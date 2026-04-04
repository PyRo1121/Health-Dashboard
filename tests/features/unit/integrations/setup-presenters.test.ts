import { describe, expect, it } from 'vitest';
import { CLINICAL_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/clinical-sources';
import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';
import {
	buildClinicalConnectorRows,
	buildHealthKitImportHelperCopy,
	buildNativeCompanionSummaryRows,
	buildNoMacSetupModel,
	buildSmartFhirImportHelperCopy
} from '$lib/features/integrations/setup-presenters';

describe('setup presenters', () => {
	const manifest = DEVICE_SOURCE_MANIFESTS[0];

	it('builds the no-mac setup model from the device manifest', () => {
		const model = buildNoMacSetupModel(manifest);

		expect(model.resourceDescription).toMatch(/Primary path: Shortcuts JSON/i);
		expect(model.primaryLinks.map((link) => link.label)).toEqual([
			'Download template JSON',
			'Open shortcut blueprint'
		]);
		expect(model.navigationLinks.map((link) => link.label)).toEqual([
			'Open import center',
			'Open timeline',
			'Open review'
		]);
		expect(model.steps).toHaveLength(4);
		expect(model.ships).toHaveLength(4);
	});

	it('builds import helper copy for HealthKit and SMART lanes', () => {
		expect(buildHealthKitImportHelperCopy(manifest)).toMatchObject({
			title: expect.stringMatching(/iPhone HealthKit Companion/i),
			bullets: manifest.supportedMetrics
		});
		expect(buildSmartFhirImportHelperCopy()).toMatchObject({
			title: 'SMART on FHIR sandbox preview lane',
			links: [{ route: '/settings', label: 'Open Settings' }]
		});
	});

	it('builds summary rows and clinical connector rows', () => {
		expect(
			buildNativeCompanionSummaryRows({
				importedEvents: 3,
				deviceNames: ['Pyro iPhone'],
				metricTypes: ['resting-heart-rate', 'sleep-duration', 'step-count'],
				latestCaptureAt: '2026-04-02T13:10:00.000Z'
			})
		).toEqual([
			'Devices: Pyro iPhone',
			'Imported metrics: resting-heart-rate, sleep-duration, step-count',
			'Latest capture: 2026-04-02T13:10:00.000Z'
		]);
		expect(buildClinicalConnectorRows(CLINICAL_SOURCE_MANIFESTS)[0]).toMatchObject({
			id: 'smart-fhir-sandbox',
			starterResourceLabel: 'Patient, Observation, Condition, MedicationRequest'
		});
	});
});
