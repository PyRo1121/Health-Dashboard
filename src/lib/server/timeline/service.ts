import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import {
  buildHealthEventDisplay,
  compareHealthEventsNewestFirst,
} from '$lib/core/shared/health-events';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectAllMirrorRecords } from '$lib/server/db/drizzle/mirror';
import type { TimelinePageState } from '$lib/features/timeline/controller';

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
    ...buildHealthEventDisplay(event),
  };
}

export async function listTimelineEventsServer(
  filter: TimelineSourceFilter = 'all'
): Promise<TimelineEventItem[]> {
  const { db } = getServerDrizzleClient();
  const events = await selectAllMirrorRecords<HealthEvent>(db, drizzleSchema.healthEvents);

  return events
    .filter((event) => filter === 'all' || event.sourceType === filter)
    .sort(compareHealthEventsNewestFirst)
    .map((event) => buildTimelineItem(event));
}

export async function loadTimelinePageServer(state: TimelinePageState): Promise<TimelinePageState> {
  return {
    ...state,
    loading: false,
    items: await listTimelineEventsServer(state.filter),
  };
}
