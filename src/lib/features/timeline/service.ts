import type { HealthDbHealthEventsStore } from '$lib/core/db/types';
import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import {
  buildHealthEventDisplay,
  compareHealthEventsNewestFirst,
} from '$lib/core/shared/health-events';
export { humanizeSourceType } from '$lib/core/shared/health-events';

export type TimelineSourceFilter = 'all' | SourceType;

export interface TimelineEventItem {
  event: HealthEvent;
  label: string;
  valueLabel: string;
  sourceLabel: string;
}

export type TimelineEventsStore = HealthDbHealthEventsStore;

function buildTimelineItem(event: HealthEvent): TimelineEventItem {
  return {
    event,
    ...buildHealthEventDisplay(event),
  };
}

export async function listTimelineEvents(
  store: TimelineEventsStore,
  filter: TimelineSourceFilter = 'all'
): Promise<TimelineEventItem[]> {
  const events = await store.healthEvents.toArray();

  return events
    .filter((event) => filter === 'all' || event.sourceType === filter)
    .sort(compareHealthEventsNewestFirst)
    .map((event) => buildTimelineItem(event));
}
