import { describe, expect, it } from 'vitest';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import { formatHealthEventLabel, importHealthKitCompanionBundle } from '$lib/features/integrations/connectors/healthkit';
import { parseHealthKitCompanionBundle } from '$lib/features/integrations/bridge/validate';

describe('healthkit connector', () => {
	it('imports a valid companion bundle through the connector adapter', () => {
		const result = importHealthKitCompanionBundle(HEALTHKIT_BUNDLE_JSON);

		expect(result.bundle.deviceName).toBe('Pyro iPhone');
		expect(result.events).toHaveLength(3);
		expect(result.warnings).toHaveLength(0);
	});

	it('keeps the validation and connector layers aligned', () => {
		const parsed = parseHealthKitCompanionBundle(HEALTHKIT_BUNDLE_JSON);
		const result = importHealthKitCompanionBundle(HEALTHKIT_BUNDLE_JSON);

		expect(result.bundle).toEqual(parsed);
	});

	it('formats HealthKit event labels for UI surfaces', () => {
		expect(formatHealthEventLabel('sleep-duration')).toBe('Sleep duration');
		expect(formatHealthEventLabel('step-count')).toBe('Step count');
		expect(formatHealthEventLabel('unknown-event')).toBe('unknown-event');
	});
});
