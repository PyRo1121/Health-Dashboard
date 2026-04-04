import type { NativeCompanionBundle } from '$lib/core/domain/types';

export const SHORTCUT_TEMPLATE_BUNDLE = {
	connector: 'healthkit-ios',
	connectorVersion: 1,
	deviceId: 'My iPhone',
	deviceName: 'My iPhone',
	sourcePlatform: 'ios',
	capturedAt: '2026-04-02T13:10:00.000Z',
	timezone: 'America/Chicago',
	records: [
		{
			id: 'sleep-2026-04-02',
			recordedAt: '2026-04-02T12:30:00.000Z',
			metricType: 'sleep-duration',
			unit: 'hours',
			value: 8,
			startAt: '2026-04-02T04:30:00.000Z',
			endAt: '2026-04-02T12:30:00.000Z',
			metadata: {
				sampleCount: 3
			},
			raw: {
				type: 'HKCategoryTypeIdentifierSleepAnalysis',
				category: 'asleep'
			}
		},
		{
			id: 'steps-2026-04-02',
			recordedAt: '2026-04-02T17:45:00.000Z',
			metricType: 'step-count',
			unit: 'count',
			value: 8432,
			raw: {
				type: 'HKQuantityTypeIdentifierStepCount',
				sampleCount: 3
			}
		},
		{
			id: 'resting-hr-2026-04-02',
			recordedAt: '2026-04-02T11:00:00.000Z',
			metricType: 'resting-heart-rate',
			unit: 'bpm',
			value: 57,
			raw: {
				type: 'HKQuantityTypeIdentifierRestingHeartRate'
			}
		}
	]
} satisfies NativeCompanionBundle;

export const SHORTCUT_TEMPLATE_JSON = JSON.stringify(SHORTCUT_TEMPLATE_BUNDLE, null, 2);

export const SHORTCUT_BLUEPRINT_MARKDOWN = `# Shortcut Blueprint: Health Cockpit Export

This blueprint is written for the Shortcuts app on iPhone.

Use it to build a no-Mac Shortcut that exports the same \`healthkit-companion\` JSON
contract the web app already understands.

## High-level flow

1. Find Health Samples for sleep data from today
2. Find Health Samples for step count from today
3. Find Health Samples for resting heart rate from today
4. Transform those samples into dictionaries matching the shared bundle contract
5. Build the top-level bundle dictionary
6. Convert the dictionary to JSON
7. Save File

## Required top-level fields

- \`connector = healthkit-ios\`
- \`connectorVersion = 1\`
- \`deviceId\`
- \`deviceName\`
- \`sourcePlatform = ios\`
- \`capturedAt\`
- \`timezone\`
- \`records\`

## Required record fields

- \`id\`
- \`recordedAt\`
- \`metricType\`
- \`unit\`
- \`value\`
- \`raw\`

## Supported metrics

- \`sleep-duration\`
- \`step-count\`
- \`resting-heart-rate\`

## Import flow

1. Save the generated file to Files on iPhone
2. Open the web app
3. Go to \`/imports\`
4. Upload or drag the JSON file
5. Preview, then commit
`;
