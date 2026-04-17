import type { HealthEvent, SourceType } from '$lib/core/domain/types';
import { normalizeSafeExternalUrl } from '$lib/core/shared/external-links';
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
  referenceUrl?: string;
}

function buildTimelineItem(event: HealthEvent): TimelineEventItem {
  const payload = event.payload as { referenceUrl?: unknown } | undefined;

  return {
    event,
    ...buildHealthEventDisplay(event),
    referenceUrl: normalizeSafeExternalUrl(
      typeof payload?.referenceUrl === 'string' ? payload.referenceUrl : undefined
    ),
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
