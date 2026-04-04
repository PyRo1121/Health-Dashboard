import { describe, expect, it } from 'vitest';
import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import { summarizeNativeCompanionEvents } from '$lib/features/integrations/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

function buildHealthEvent(input: {
	id: string;
	eventType: string;
	sourceType: SourceType;
	sourceTimestamp?: string;
	updatedAt?: string;
	createdAt?: string;
	payload?: Record<string, unknown>;
	deviceId?: string;
}): HealthEvent {
	return {
		id: input.id,
		createdAt: input.createdAt ?? '2026-04-02T08:00:00Z',
		updatedAt: input.updatedAt ?? input.createdAt ?? '2026-04-02T08:00:00Z',
		sourceType: input.sourceType,
		sourceApp: 'Test source',
		sourceTimestamp: input.sourceTimestamp,
		localDay: '2026-04-02',
		confidence: 1,
		deviceId: input.deviceId,
		eventType: input.eventType,
		payload: input.payload
	};
}

describe('integrations service', () => {
	const getDb = useTestHealthDb('integrations-service');

	it('returns an empty summary before any native companion import lands', async () => {
		const db = getDb();
		const summary = await summarizeNativeCompanionEvents(db);

		expect(summary).toEqual({
			importedEvents: 0,
			deviceNames: [],
			metricTypes: [],
			latestCaptureAt: undefined
		});
	});

	it('summarizes native companion imports with deduped names and latest capture fallback', async () => {
		const db = getDb();
		await db.healthEvents.bulkAdd([
			buildHealthEvent({
				id: 'native-rhr',
				eventType: 'resting-heart-rate',
				sourceType: 'native-companion',
				sourceTimestamp: '2026-04-02T11:00:00Z',
				payload: {
					deviceName: 'Pyro iPhone',
					metricType: 'resting-heart-rate',
					capturedAt: '2026-04-02T13:10:00Z'
				},
				deviceId: 'iphone-15-pro'
			}),
			buildHealthEvent({
				id: 'native-sleep',
				eventType: 'sleep-duration',
				sourceType: 'native-companion',
				sourceTimestamp: '2026-04-02T12:30:00Z',
				payload: {
					deviceName: 'Pyro iPhone',
					metricType: 'sleep-duration'
				},
				deviceId: 'iphone-15-pro'
			}),
			buildHealthEvent({
				id: 'native-steps',
				eventType: 'step-count',
				sourceType: 'native-companion',
				updatedAt: '2026-04-02T15:00:00Z',
				deviceId: 'watch-series-9'
			}),
			buildHealthEvent({
				id: 'manual-mood',
				eventType: 'mood',
				sourceType: 'manual',
				sourceTimestamp: '2026-04-02T09:00:00Z'
			})
		]);

		const summary = await summarizeNativeCompanionEvents(db);

		expect(summary).toEqual({
			importedEvents: 3,
			deviceNames: ['Pyro iPhone', 'watch-series-9'],
			metricTypes: ['resting-heart-rate', 'sleep-duration', 'step-count'],
			latestCaptureAt: '2026-04-02T15:00:00Z'
		});
	});
});
