import { describe, expect, it } from 'vitest';
import type { HealthEvent } from '$lib/core/domain/types';
import {
	buildHealthEventDisplay,
	humanizeSourceType,
	sortHealthEventTimestamp
} from '$lib/core/shared/health-events';

const SLEEP_EVENT: HealthEvent = {
	id: 'native-health-1',
	createdAt: '2026-04-02T08:00:00.000Z',
	updatedAt: '2026-04-02T08:00:00.000Z',
	sourceType: 'native-companion',
	sourceApp: 'HealthKit Companion · Pyro iPhone',
	sourceTimestamp: '2026-04-02T07:30:00.000Z',
	localDay: '2026-04-02',
	confidence: 0.98,
	eventType: 'sleep-duration',
	value: 8,
	unit: 'hours'
};

const MANUAL_ANXIETY_EVENT: HealthEvent = {
	id: 'manual-anxiety-1',
	createdAt: '2026-04-02T09:15:00.000Z',
	updatedAt: '2026-04-02T09:15:00.000Z',
	sourceType: 'manual',
	sourceApp: 'Personal Health Cockpit',
	localDay: '2026-04-02',
	confidence: 1,
	eventType: 'anxiety-episode',
	value: 7,
	payload: {
		trigger: 'Crowded commute'
	}
};

describe('health-events', () => {
	it('sorts by source timestamp when present and formats display labels', () => {
		expect(sortHealthEventTimestamp(SLEEP_EVENT)).toBe('2026-04-02T07:30:00.000Z');
		expect(buildHealthEventDisplay(SLEEP_EVENT)).toEqual({
			label: 'Sleep duration',
			valueLabel: '8 hours',
			sourceLabel: 'Native companion'
		});
	});

	it('falls back to updatedAt and humanizes source types', () => {
		expect(
			sortHealthEventTimestamp({
				...SLEEP_EVENT,
				sourceTimestamp: undefined
			})
		).toBe('2026-04-02T08:00:00.000Z');
		expect(humanizeSourceType('manual')).toBe('Manual');
	});

	it('humanizes manual health loop event labels for timeline and review surfaces', () => {
		expect(buildHealthEventDisplay(MANUAL_ANXIETY_EVENT)).toEqual({
			label: 'Anxiety episode',
			valueLabel: '7',
			sourceLabel: 'Manual'
		});
	});
});
