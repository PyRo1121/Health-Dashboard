import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentLocalDay, nowIso, toLocalDay } from '$lib/core/domain/time';

afterEach(() => {
	vi.useRealTimers();
});

describe('toLocalDay', () => {
	it('normalizes UTC timestamps', () => {
		expect(toLocalDay('2026-04-02T08:00:00.000Z', 'UTC')).toBe('2026-04-02');
	});

	it('handles timezone boundaries around midnight', () => {
		expect(toLocalDay('2026-04-02T04:30:00.000Z', 'America/Chicago')).toBe('2026-04-01');
		expect(toLocalDay('2026-04-02T06:30:00.000Z', 'America/Chicago')).toBe('2026-04-02');
	});
});

describe('currentLocalDay', () => {
	it('reuses local-day formatting for explicit dates and time zones', () => {
		expect(currentLocalDay('2026-04-02T04:30:00.000Z', 'America/Chicago')).toBe('2026-04-01');
	});
});

describe('nowIso', () => {
	it('returns an ISO timestamp for the provided instant', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-02T12:34:56.000Z'));

		expect(nowIso()).toBe('2026-04-02T12:34:56.000Z');
		expect(nowIso('2026-04-02T04:30:00.000Z')).toBe('2026-04-02T04:30:00.000Z');
	});
});
