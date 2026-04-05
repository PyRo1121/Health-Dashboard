import type { HealthDatabase } from '$lib/core/db/types';
import {
  listTimelineEvents,
  type TimelineEventItem,
  type TimelineSourceFilter,
} from '$lib/features/timeline/service';

export interface TimelinePageState {
  loading: boolean;
  filter: TimelineSourceFilter;
  items: TimelineEventItem[];
}

export function createTimelinePageState(): TimelinePageState {
  return {
    loading: true,
    filter: 'all',
    items: [],
  };
}

export function setTimelineFilter(
  state: TimelinePageState,
  filter: TimelineSourceFilter
): TimelinePageState {
  return {
    ...state,
    filter,
  };
}

export async function loadTimelinePage(
  db: HealthDatabase,
  state: TimelinePageState
): Promise<TimelinePageState> {
  const items = await listTimelineEvents(db, state.filter);
  return {
    ...state,
    loading: false,
    items,
  };
}
