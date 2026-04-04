import type { HealthDatabase } from '$lib/core/db/types';
import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import { buildHealthEventDisplay, sortHealthEventTimestamp } from '$lib/core/shared/health-events';
export { humanizeSourceType } from '$lib/core/shared/health-events';

export type TimelineSourceFilter = 'all' | SourceType;

export interface TimelineEventItem {
	event: HealthEvent;
	label: string;
	valueLabel: string;
	sourceLabel: string;
}

function buildTimelineItem(event: HealthEvent): TimelineEventItem {
	return {
		event,
		...buildHealthEventDisplay(event)
	};
}

export async function listTimelineEvents(
	db: HealthDatabase,
	filter: TimelineSourceFilter = 'all'
): Promise<TimelineEventItem[]> {
	const events = await db.healthEvents.toArray();

	return events
		.filter((event) => filter === 'all' || event.sourceType === filter)
		.sort((left, right) => sortHealthEventTimestamp(right).localeCompare(sortHealthEventTimestamp(left)))
		.map((event) => buildTimelineItem(event));
}
