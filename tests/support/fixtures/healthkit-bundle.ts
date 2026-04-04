export const HEALTHKIT_BUNDLE = {
	connector: 'healthkit-ios',
	connectorVersion: 1,
	deviceId: 'iphone-15-pro',
	deviceName: 'Pyro iPhone',
	sourcePlatform: 'ios',
	capturedAt: '2026-04-02T13:10:00Z',
	timezone: 'America/Chicago',
	records: [
		{
			id: 'sleep-2026-04-02',
			recordedAt: '2026-04-02T12:30:00Z',
			startAt: '2026-04-02T04:30:00Z',
			endAt: '2026-04-02T12:30:00Z',
			metricType: 'sleep-duration',
			unit: 'hours',
			value: 8,
			metadata: {
				source: 'Apple Watch'
			},
			raw: {
				category: 'asleepCore'
			}
		},
		{
			id: 'steps-2026-04-02',
			recordedAt: '2026-04-02T17:45:00Z',
			metricType: 'step-count',
			unit: 'count',
			value: 8432,
			metadata: {
				source: 'iPhone'
			},
			raw: {
				sampleCount: 3
			}
		},
		{
			id: 'resting-hr-2026-04-02',
			recordedAt: '2026-04-02T11:00:00Z',
			metricType: 'resting-heart-rate',
			unit: 'bpm',
			value: 57,
			metadata: {
				source: 'Apple Watch'
			},
			raw: {
				basal: true
			}
		}
	]
} as const;

export const HEALTHKIT_BUNDLE_JSON = JSON.stringify(HEALTHKIT_BUNDLE, null, 2);

export const INVALID_HEALTHKIT_BUNDLE_VERSION_JSON = JSON.stringify({
	...HEALTHKIT_BUNDLE,
	connectorVersion: 2
});

export const HEALTHKIT_BUNDLE_WITH_UNSUPPORTED_METRIC = {
	...HEALTHKIT_BUNDLE,
	records: [
		...HEALTHKIT_BUNDLE.records,
		{
			id: 'oxygen-2026-04-02',
			recordedAt: '2026-04-02T09:00:00Z',
			metricType: 'oxygen-saturation',
			unit: '%',
			value: 98,
			raw: {
				sampleCount: 1
			}
		}
	]
};
