import type { TimelineSourceFilter } from '$lib/features/timeline/service';

export const timelineFilterOptions: Array<{ value: TimelineSourceFilter; label: string }> = [
	{ value: 'all', label: 'All sources' },
	{ value: 'native-companion', label: 'Native companion' },
	{ value: 'manual', label: 'Manual' },
	{ value: 'import', label: 'Import' },
	{ value: 'derived', label: 'Derived' }
];

export const timelineEventStreamDescription =
	'Every metric keeps its source and provenance attached.';
