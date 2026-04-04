import { describe, expect, it } from 'vitest';
import {
	HEALTHKIT_BUNDLE_JSON,
	HEALTHKIT_BUNDLE_WITH_UNSUPPORTED_METRIC,
	INVALID_HEALTHKIT_BUNDLE_VERSION_JSON
} from '../../../support/fixtures/healthkit-bundle';
import { parseHealthKitCompanionBundle } from '$lib/features/integrations/bridge/validate';
import { normalizeHealthKitBundle } from '$lib/features/integrations/normalization/health-normalize';

describe('HealthKit bridge payload', () => {
	it('parses a valid HealthKit companion bundle', () => {
		const payload = parseHealthKitCompanionBundle(HEALTHKIT_BUNDLE_JSON);

		expect(payload.connector).toBe('healthkit-ios');
		expect(payload.deviceId).toBe('iphone-15-pro');
		expect(payload.deviceName).toBe('Pyro iPhone');
		expect(payload.records).toHaveLength(3);
	});

	it('rejects unsupported connector versions', () => {
		expect(() => parseHealthKitCompanionBundle(INVALID_HEALTHKIT_BUNDLE_VERSION_JSON)).toThrow(
			/connectorVersion/i
		);
	});

	it('normalizes supported HealthKit metrics and warns on unsupported ones', () => {
		const { events, warnings } = normalizeHealthKitBundle(HEALTHKIT_BUNDLE_WITH_UNSUPPORTED_METRIC);
		const sleepEvent = events.find((event) => event.eventType === 'sleep-duration');
		const stepsEvent = events.find((event) => event.eventType === 'step-count');

		expect(events).toHaveLength(3);
		expect(warnings).toEqual(['Skipped unsupported HealthKit metric "oxygen-saturation".']);
		expect(sleepEvent).toMatchObject({
			sourceType: 'native-companion',
			sourceApp: 'HealthKit Companion · Pyro iPhone',
			sourceRecordId: 'healthkit-ios:iphone-15-pro:sleep-2026-04-02',
			localDay: '2026-04-02',
			eventType: 'sleep-duration',
			unit: 'hours',
			value: 8
		});
		expect(stepsEvent?.payload).toMatchObject({
			connector: 'healthkit-ios',
			deviceId: 'iphone-15-pro',
			metricType: 'step-count'
		});
	});
});
