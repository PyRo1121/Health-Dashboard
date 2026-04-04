import { describe, expect, it } from 'vitest';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';

describe('createRecordMeta', () => {
	it('creates matching created and updated timestamps for a new record', () => {
		expect(createRecordMeta('record-1', '2026-04-02T08:00:00.000Z')).toEqual({
			id: 'record-1',
			createdAt: '2026-04-02T08:00:00.000Z',
			updatedAt: '2026-04-02T08:00:00.000Z'
		});
	});
});

describe('updateRecordMeta', () => {
	it('preserves existing identity and createdAt while refreshing updatedAt', () => {
		expect(
			updateRecordMeta(
				{
					id: 'record-1',
					createdAt: '2026-04-02T08:00:00.000Z'
				},
				'record-2',
				'2026-04-02T09:30:00.000Z'
			)
		).toEqual({
			id: 'record-1',
			createdAt: '2026-04-02T08:00:00.000Z',
			updatedAt: '2026-04-02T09:30:00.000Z'
		});
	});

	it('falls back to a supplied id when no existing record is present', () => {
		expect(updateRecordMeta(null, 'record-2', '2026-04-02T09:30:00.000Z')).toEqual({
			id: 'record-2',
			createdAt: '2026-04-02T09:30:00.000Z',
			updatedAt: '2026-04-02T09:30:00.000Z'
		});
	});
});
