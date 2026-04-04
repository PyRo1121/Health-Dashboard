import { describe, expect, it } from 'vitest';
import {
	timelineEventStreamDescription,
	timelineFilterOptions
} from '$lib/features/timeline/model';

describe('timeline model', () => {
	it('exposes the expected filter options and copy', () => {
		expect(timelineFilterOptions.map((option) => option.value)).toEqual([
			'all',
			'native-companion',
			'manual',
			'import',
			'derived'
		]);
		expect(timelineEventStreamDescription).toMatch(/source and provenance/i);
	});
});
